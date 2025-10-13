import { PlayerState, Pot } from './types';

/**
 * Calculate pots including side pots for all-in situations
 */
export function calculatePots(players: PlayerState[]): Pot[] {
  const pots: Pot[] = [];
  
  // Get players with bets, sorted by bet amount
  const playersWithBets = players
    .filter(p => p.bet > 0 && p.status !== 'folded')
    .sort((a, b) => a.bet - b.bet);
  
  if (playersWithBets.length === 0) {
    return pots;
  }
  
  let remainingPlayers = [...playersWithBets];
  let processedBet = 0;
  
  while (remainingPlayers.length > 0) {
    const lowestBet = remainingPlayers[0].bet;
    const betDiff = lowestBet - processedBet;
    
    if (betDiff > 0) {
      const potAmount = betDiff * remainingPlayers.length;
      const eligiblePlayers = remainingPlayers.map(p => p.userId);
      
      pots.push({
        amount: potAmount,
        eligiblePlayers,
      });
    }
    
    processedBet = lowestBet;
    
    // Remove players who have contributed their full bet
    remainingPlayers = remainingPlayers.filter(p => p.bet > lowestBet);
  }
  
  return pots;
}

/**
 * Distribute pots to winners
 */
export function distributePots(
  pots: Pot[],
  winners: { userId: string; handValue: number }[]
): Map<string, number> {
  const payouts = new Map<string, number>();
  
  for (const pot of pots) {
    // Find eligible winners for this pot
    const eligibleWinners = winners.filter(w => 
      pot.eligiblePlayers.includes(w.userId)
    );
    
    if (eligibleWinners.length === 0) {
      // This shouldn't happen, but if no eligible winners, skip
      continue;
    }
    
    // Find highest hand value among eligible winners
    const maxHandValue = Math.max(...eligibleWinners.map(w => w.handValue));
    const potWinners = eligibleWinners.filter(w => w.handValue === maxHandValue);
    
    // Split pot among winners
    const amountPerWinner = Math.floor(pot.amount / potWinners.length);
    const remainder = pot.amount % potWinners.length;
    
    potWinners.forEach((winner, index) => {
      const currentPayout = payouts.get(winner.userId) || 0;
      let payout = amountPerWinner;
      
      // Give remainder to first winner (or could be based on position)
      if (index === 0) {
        payout += remainder;
      }
      
      payouts.set(winner.userId, currentPayout + payout);
    });
  }
  
  return payouts;
}

/**
 * Calculate rake amount from pot
 */
export function calculateRake(potAmount: number, rakePercentage: number): number {
  return Math.floor((potAmount * rakePercentage) / 100);
}

/**
 * Reset player bets and return collected pot amount
 */
export function collectBets(players: PlayerState[]): number {
  let totalPot = 0;
  
  for (const player of players) {
    totalPot += player.bet;
    player.bet = 0;
  }
  
  return totalPot;
}

/**
 * Award pot to winner(s)
 */
export function awardPot(
  players: PlayerState[],
  payouts: Map<string, number>
): PlayerState[] {
  return players.map(player => {
    const payout = payouts.get(player.userId);
    if (payout) {
      return {
        ...player,
        chips: player.chips + payout,
      };
    }
    return player;
  });
}

/**
 * Eliminate players with no chips
 */
export function eliminateBrokePlayers(players: PlayerState[]): PlayerState[] {
  return players.map(player => {
    if (player.chips === 0 && player.status !== 'eliminated') {
      return {
        ...player,
        status: 'eliminated' as const,
      };
    }
    return player;
  });
}

/**
 * Get active players (not folded or eliminated)
 */
export function getActivePlayers(players: PlayerState[]): PlayerState[] {
  return players.filter(p => 
    p.status === 'active' || p.status === 'all_in'
  );
}

/**
 * Count players still in the hand (not folded or eliminated)
 */
export function countActivePlayers(players: PlayerState[]): number {
  return getActivePlayers(players).length;
}

