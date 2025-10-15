import { prisma } from './db';
import { 
  initializeGame, 
  startNewHand, 
  processPlayerAction,
  isGameOver,
  getGameWinner,
} from './poker-engine/game-state';
import { GameState } from './poker-engine/types';
import { PlayerAction } from './poker-engine/types';
import { Decimal } from '@prisma/client/runtime/library';

export interface TournamentConfig {
  tournamentId: string;
  buyIn: number;
  rakePercentage: number;
  smallBlind: number;
  bigBlind: number;
}

export class TournamentManager {
  private gameStates: Map<string, GameState> = new Map();
  
  /**
   * Check if tournament is ready to start (based on max players)
   */
  async isTournamentReady(tournamentId: string): Promise<boolean> {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { maxPlayers: true },
    });
    
    if (!tournament) return false;
    
    const playerCount = await prisma.tournamentPlayer.count({
      where: {
        tournamentId,
        status: 'JOINED',
      },
    });
    
    return playerCount === tournament.maxPlayers;
  }
  
  /**
   * Start tournament game
   */
  async startTournament(tournamentId: string): Promise<GameState> {
    // Get tournament details
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        players: {
          include: {
            user: true,
          },
        },
      },
    });
    
    if (!tournament) {
      throw new Error('Tournament not found');
    }
    
    if (tournament.players.length !== tournament.maxPlayers) {
      throw new Error(`Tournament needs exactly ${tournament.maxPlayers} players`);
    }
    
    // Update tournament status
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
    
    // Update player statuses
    await prisma.tournamentPlayer.updateMany({
      where: { tournamentId },
      data: { status: 'ACTIVE' },
    });
    
    // Create game record
    const game = await prisma.game.create({
      data: {
        tournamentId,
        status: 'WAITING',
        smallBlind: new Decimal(0.001),
        bigBlind: new Decimal(0.002),
      },
    });
    
    // Initialize game state
    const players = tournament.players.map(p => ({
      userId: p.userId,
      walletAddress: p.user.walletAddress,
      username: p.user.username || undefined,
    }));
    
    const buyInNumber = typeof tournament.buyIn === 'number' 
      ? tournament.buyIn 
      : parseFloat(tournament.buyIn.toString());
    
    const gameState = initializeGame(
      game.id,
      tournamentId,
      players,
      buyInNumber,
      0.001,
      0.002
    );
    
    // Create game players in DB
    for (const player of gameState.players) {
      await prisma.gamePlayer.create({
        data: {
          gameId: game.id,
          userId: player.userId,
          seatPosition: player.seatPosition,
          chips: new Decimal(player.chips),
          status: 'ACTIVE',
        },
      });
    }
    
    // Start first hand
    const gameWithHand = startNewHand(gameState);
    
    // Store in memory
    this.gameStates.set(tournamentId, gameWithHand);
    
    // Update game status in DB
    await prisma.game.update({
      where: { id: game.id },
      data: {
        status: 'PRE_FLOP',
        currentHand: gameWithHand.handNumber,
      },
    });
    
    // Create hand record
    await prisma.hand.create({
      data: {
        gameId: game.id,
        handNumber: gameWithHand.handNumber,
        pot: new Decimal(gameWithHand.pot),
        communityCards: JSON.stringify(gameWithHand.communityCards),
      },
    });
    
    return gameWithHand;
  }
  
  /**
   * Get current game state
   */
  getGameState(tournamentId: string): GameState | undefined {
    return this.gameStates.get(tournamentId);
  }
  
  /**
   * Process player action
   */
  async processAction(
    tournamentId: string,
    userId: string,
    action: PlayerAction,
    amount?: number
  ): Promise<GameState> {
    const gameState = this.gameStates.get(tournamentId);
    
    if (!gameState) {
      throw new Error('Game not found');
    }
    
    // Find player's seat
    const player = gameState.players.find(p => p.userId === userId);
    if (!player) {
      throw new Error('Player not in game');
    }
    
    // Process action
    const newState = processPlayerAction(
      gameState,
      player.seatPosition,
      action,
      amount
    );
    
    // Update in memory
    this.gameStates.set(tournamentId, newState);
    
    // Update database
    await this.syncGameStateToDb(newState);
    
    // Check if hand is complete
    if (newState.status === 'complete') {
      await this.handleHandComplete(newState);
    }
    
    // Check if game is over
    if (isGameOver(newState)) {
      await this.handleGameOver(newState);
    }
    
    return newState;
  }
  
  /**
   * Handle hand completion
   */
  private async handleHandComplete(gameState: GameState): Promise<void> {
    // Update hand record
    await prisma.hand.updateMany({
      where: {
        gameId: gameState.gameId,
        handNumber: gameState.handNumber,
      },
      data: {
        pot: new Decimal(gameState.pot),
        communityCards: JSON.stringify(gameState.communityCards),
        completedAt: new Date(),
      },
    });
    
    // Update player chips
    for (const player of gameState.players) {
      await prisma.gamePlayer.updateMany({
        where: {
          gameId: gameState.gameId,
          userId: player.userId,
        },
        data: {
          chips: new Decimal(player.chips),
          status: player.status === 'eliminated' ? 'ELIMINATED' : 'ACTIVE',
        },
      });
    }
    
    // If not game over, start next hand automatically
    if (!isGameOver(gameState)) {
      setTimeout(async () => {
        const currentState = this.gameStates.get(gameState.tournamentId);
        if (currentState && currentState.status === 'complete') {
          const newHandState = startNewHand(currentState);
          this.gameStates.set(gameState.tournamentId, newHandState);
          
          // Create new hand record
          await prisma.hand.create({
            data: {
              gameId: gameState.gameId,
              handNumber: newHandState.handNumber,
              pot: new Decimal(newHandState.pot),
              communityCards: JSON.stringify(newHandState.communityCards),
            },
          });
          
          await this.syncGameStateToDb(newHandState);
        }
      }, 5000); // 5 second delay between hands
    }
  }
  
  /**
   * Handle game over (tournament complete)
   */
  private async handleGameOver(gameState: GameState): Promise<void> {
    const winner = getGameWinner(gameState);
    
    if (!winner) {
      throw new Error('No winner found');
    }
    
    // Update tournament status
    await prisma.tournament.update({
      where: { id: gameState.tournamentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
    
    // Update winner
    await prisma.tournamentPlayer.updateMany({
      where: {
        tournamentId: gameState.tournamentId,
        userId: winner.userId,
      },
      data: {
        status: 'WINNER',
        position: 1,
      },
    });
    
    // Update other players' positions (simplified - all get position 2)
    await prisma.tournamentPlayer.updateMany({
      where: {
        tournamentId: gameState.tournamentId,
        userId: { not: winner.userId },
      },
      data: {
        status: 'ELIMINATED',
        position: 2,
      },
    });
    
    // Update game status
    await prisma.game.update({
      where: { id: gameState.gameId },
      data: {
        status: 'COMPLETED',
      },
    });
    
    // Update hand with winner
    await prisma.hand.updateMany({
      where: {
        gameId: gameState.gameId,
        handNumber: gameState.handNumber,
      },
      data: {
        winnerId: winner.userId,
      },
    });
    
    // Update user's total winnings
    const tournament = await prisma.tournament.findUnique({
      where: { id: gameState.tournamentId },
    });
    
    if (tournament) {
      const buyIn = typeof tournament.buyIn === 'number'
        ? tournament.buyIn
        : parseFloat(tournament.buyIn.toString());
      const rake = typeof tournament.rakePercentage === 'number'
        ? tournament.rakePercentage
        : parseFloat(tournament.rakePercentage.toString());
      
      const totalPot = buyIn * 6;
      const rakeAmount = (totalPot * rake) / 100;
      const winnings = totalPot - rakeAmount;
      
      await prisma.user.update({
        where: { id: winner.userId },
        data: {
          totalWinnings: {
            increment: new Decimal(winnings),
          },
        },
      });
    }
    
    // Remove from memory
    this.gameStates.delete(gameState.tournamentId);
  }
  
  /**
   * Sync game state to database
   */
  private async syncGameStateToDb(gameState: GameState): Promise<void> {
    await prisma.game.update({
      where: { id: gameState.gameId },
      data: {
        pot: new Decimal(gameState.pot),
        currentHand: gameState.handNumber,
        status: this.mapGameStatus(gameState.status),
        currentSeat: gameState.currentPlayerSeat,
        dealerSeat: gameState.dealerSeat,
      },
    });
    
    // Update player states
    for (const player of gameState.players) {
      await prisma.gamePlayer.updateMany({
        where: {
          gameId: gameState.gameId,
          userId: player.userId,
        },
        data: {
          chips: new Decimal(player.chips),
          bet: new Decimal(player.bet),
          status: this.mapPlayerStatus(player.status),
          lastAction: player.lastAction ? JSON.stringify(player.lastAction) : null,
        },
      });
    }
  }
  
  private mapGameStatus(status: string): 'WAITING' | 'DEALING' | 'PRE_FLOP' | 'SHOWDOWN' | 'COMPLETED' {
    const statusMap: Record<string, 'WAITING' | 'DEALING' | 'PRE_FLOP' | 'SHOWDOWN' | 'COMPLETED'> = {
      'waiting': 'WAITING',
      'dealing': 'DEALING',
      'betting': 'PRE_FLOP',
      'showdown': 'SHOWDOWN',
      'complete': 'COMPLETED',
    };
    return statusMap[status] || 'WAITING';
  }
  
  private mapPlayerStatus(status: string): 'ACTIVE' | 'FOLDED' | 'ALL_IN' | 'SITTING_OUT' | 'ELIMINATED' {
    const statusMap: Record<string, 'ACTIVE' | 'FOLDED' | 'ALL_IN' | 'SITTING_OUT' | 'ELIMINATED'> = {
      'active': 'ACTIVE',
      'folded': 'FOLDED',
      'all_in': 'ALL_IN',
      'sitting_out': 'SITTING_OUT',
      'eliminated': 'ELIMINATED',
    };
    return statusMap[status] || 'ACTIVE';
  }
}

// Singleton instance
export const tournamentManager = new TournamentManager();

