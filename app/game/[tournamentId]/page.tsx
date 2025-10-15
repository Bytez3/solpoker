'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

// Production mode - real Solana transactions enabled
const DEMO_MODE = false;
console.log('🎮 Demo mode enabled:', DEMO_MODE);

interface Card {
  rank: string;
  suit: string;
}

interface LastAction {
  action: string;
  amount?: number;
  timestamp: number;
}

interface PlayerState {
  userId: string;
  walletAddress: string;
  username?: string;
  seatPosition: number;
  chips: number;
  bet: number;
  cards: Card[];
  status: string;
  lastAction?: LastAction;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

interface GameState {
  gameId: string;
  tournamentId: string;
  players: PlayerState[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  currentPlayerSeat: number | null;
  dealerSeat: number;
  smallBlind: number;
  bigBlind: number;
  bettingRound: string;
  handNumber: number;
  status: string;
}

interface TournamentWaitingState {
  tournament: {
    id: string;
    name: string;
    buyIn: number;
    maxPlayers: number;
    players: Array<{
      user: {
        id: string;
        walletAddress: string;
        username: string | null;
      };
    }>;
    // Table Customization
    tableTheme?: string;
    tableColor?: string;
    tablePattern?: string;
    tableImage?: string;
  };
  gameStarted: false;
  availableSeats: number;
  playerSeat: number;
}

// Helper function to get table styling based on theme
function getTableStyling(theme?: string, color?: string, pattern?: string, image?: string) {
  const baseClasses = "relative poker-table rounded-full aspect-[16/10] border-8 shadow-2xl p-8";
  
  let colorClass = "border-amber-900";
  let backgroundClass = "bg-gradient-to-br from-green-800 to-green-900";
  
  // Color styling
  switch (color) {
    case 'blue':
      colorClass = "border-blue-900";
      backgroundClass = "bg-gradient-to-br from-blue-800 to-blue-900";
      break;
    case 'red':
      colorClass = "border-red-900";
      backgroundClass = "bg-gradient-to-br from-red-800 to-red-900";
      break;
    case 'purple':
      colorClass = "border-purple-900";
      backgroundClass = "bg-gradient-to-br from-purple-800 to-purple-900";
      break;
    case 'black':
      colorClass = "border-gray-900";
      backgroundClass = "bg-gradient-to-br from-gray-900 to-black";
      break;
    case 'gold':
      colorClass = "border-yellow-900";
      backgroundClass = "bg-gradient-to-br from-yellow-800 to-yellow-900";
      break;
    case 'silver':
      colorClass = "border-gray-700";
      backgroundClass = "bg-gradient-to-br from-gray-600 to-gray-800";
      break;
  }
  
  // Pattern styling
  let patternClass = "";
  switch (pattern) {
    case 'leather':
      patternClass = "opacity-90";
      break;
    case 'marble':
      patternClass = "bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400";
      break;
    case 'wood':
      patternClass = "bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900";
      break;
    case 'metal':
      patternClass = "bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600";
      break;
    case 'fabric':
      patternClass = "opacity-95";
      break;
    case 'glass':
      patternClass = "bg-gradient-to-br from-blue-200 via-blue-300 to-blue-400 opacity-80";
      break;
  }
  
  // Theme-specific styling
  let themeClass = "";
  switch (theme) {
    case 'modern':
      themeClass = "border-4";
      break;
    case 'luxury':
      themeClass = "border-12 shadow-3xl";
      break;
    case 'neon':
      themeClass = "border-4 shadow-neon";
      break;
    case 'vintage':
      themeClass = "border-6 border-double";
      break;
    case 'space':
      themeClass = "border-4 shadow-2xl";
      backgroundClass = "bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900";
      break;
  }
  
  return {
    className: `${baseClasses} ${colorClass} ${backgroundClass} ${patternClass} ${themeClass}`,
    backgroundImage: image ? `url(${image})` : undefined
  };
}

// Helper function to get player positions based on table size
function getPlayerPositions(maxPlayers: number): string[] {
  if (maxPlayers === 2) {
    // Heads up - opposite sides
    return ['top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', 'bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2'];
  } else if (maxPlayers <= 4) {
    // Small table - corners
    return [
      'top-6 left-1/2 -translate-x-1/2',
      'top-1/2 right-8 -translate-y-1/2',
      'bottom-6 left-1/2 -translate-x-1/2',
      'top-1/2 left-8 -translate-y-1/2',
    ].slice(0, maxPlayers);
  } else if (maxPlayers <= 6) {
    // Medium table - 6 positions
    return [
      'top-6 left-1/2 -translate-x-1/2',
      'top-1/4 right-8',
      'bottom-1/4 right-8',
      'bottom-6 left-1/2 -translate-x-1/2',
      'bottom-1/4 left-8',
      'top-1/4 left-8',
    ].slice(0, maxPlayers);
  } else {
    // Large table - 8-10 positions
    return [
      'top-8 left-1/2 -translate-x-1/2',
      'top-1/3 right-6',
      'top-2/3 right-6',
      'bottom-1/3 right-6',
      'bottom-2/3 right-6',
      'bottom-8 left-1/2 -translate-x-1/2',
      'bottom-2/3 left-6',
      'bottom-1/3 left-6',
      'top-2/3 left-6',
      'top-1/3 left-6',
    ].slice(0, maxPlayers);
  }
}

// Helper function for suit symbols
function getSuitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return symbols[suit] || suit;
}

// Helper function for chip color based on amount
function getChipColor(chips: number): string {
  if (chips >= 1) return 'chip-black';
  if (chips >= 0.5) return 'chip-purple';
  if (chips >= 0.1) return 'chip-blue';
  if (chips >= 0.05) return 'chip-green';
  return 'chip-red';
}

// Helper function to get player initials
function getPlayerInitials(username?: string, walletAddress?: string): string {
  if (username) {
    return username.substring(0, 2).toUpperCase();
  }
  if (walletAddress) {
    return walletAddress.substring(0, 2).toUpperCase();
  }
  return '??';
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [waitingState, setWaitingState] = useState<TournamentWaitingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionAmount, setActionAmount] = useState(0);

  const tournamentId = params.tournamentId as string;

  useEffect(() => {
    if (!connected) {
      router.push('/');
      return;
    }

    fetchGameState();
    const interval = setInterval(fetchGameState, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [connected, tournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchGameState = async () => {
    try {
      const token = localStorage.getItem('poker_token');
      if (!token) return;

      const response = await fetch(`/api/game/${tournamentId}/state`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.gameStarted && data.gameState) {
        setGameState(data.gameState);
          setWaitingState(null);
        } else if (data.tournament) {
          setWaitingState(data as TournamentWaitingState);
          setGameState(null);
        }
      }
    } catch (error) {
      console.error('Error fetching game state:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, amount?: number) => {
    try {
      const token = localStorage.getItem('poker_token');
      if (!token) return;

      if (DEMO_MODE) {
        // Demo mode: Use API route
        console.log('🎮 Demo mode: Processing game action:', action);

      const response = await fetch(`/api/game/${tournamentId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action, amount }),
      });

      if (response.ok) {
        const data = await response.json();
        setGameState(data.gameState);
      } else {
        const error = await response.json();
        alert(error.error);
        }
      } else {
        // Production mode: Create real Solana transaction
        console.log('🔄 Processing real Solana game action:', action);

        if (!publicKey || !sendTransaction) {
          alert('Wallet not connected properly');
          return;
        }

        try {
          // For now, create a simple memo transaction for game actions
          // TODO: Replace with actual poker program integration
          const { Transaction, TransactionInstruction, PublicKey } = await import('@solana/web3.js');

          const playerWallet = new PublicKey(publicKey.toBase58());
          
          // Create a proper memo instruction
          const memoInstruction = new TransactionInstruction({
            keys: [
              { pubkey: playerWallet, isSigner: true, isWritable: false },
            ],
            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
            data: Buffer.from(`Game action: ${action}${amount ? ` ${amount} SOL` : ''} in tournament ${tournamentId}`, 'utf8'),
          });
          
          const transaction = new Transaction().add(memoInstruction);
          
          // Get recent blockhash
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = playerWallet;

          console.log('✍️ Requesting game action transaction signature...');
          const signature = await sendTransaction(transaction, connection);

          // After successful transaction, update game state via API
          const response = await fetch(`/api/game/${tournamentId}/action`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ action, amount, transactionSignature: signature }),
          });

          if (response.ok) {
            const data = await response.json();
            setGameState(data.gameState);
            console.log('✅ Real Solana game action completed:', signature);
          } else {
            const error = await response.json();
            alert(error.error);
          }
        } catch (error) {
          console.error('❌ Solana game action failed:', error);
          alert('Failed to process game action. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error processing action:', error);
      alert('Failed to process action');
    }
  };

  if (loading || (!gameState && !waitingState)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="mt-4 text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  // Show waiting state when tournament exists but game hasn't started
  if (waitingState && !gameState) {
    return (
      <div className="min-h-screen bg-gray-900 p-4">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-4">
          <div className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">{waitingState.tournament.name}</h2>
              <p className="text-sm text-gray-400">Waiting for players...</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-400">
                {waitingState.tournament.players.length}/{waitingState.tournament.maxPlayers}
              </p>
              <p className="text-sm text-gray-400">Players</p>
            </div>
          </div>
        </div>

        {/* Poker Table - Waiting State */}
        <div className="max-w-6xl mx-auto poker-table-container">
          <div 
            className={getTableStyling(
              waitingState.tournament.tableTheme,
              waitingState.tournament.tableColor,
              waitingState.tournament.tablePattern,
              waitingState.tournament.tableImage
            ).className}
            style={{
              backgroundImage: getTableStyling(
                waitingState.tournament.tableTheme,
                waitingState.tournament.tableColor,
                waitingState.tournament.tablePattern,
                waitingState.tournament.tableImage
              ).backgroundImage
            }}
          >
            {/* Seat Positions */}
            {getPlayerPositions(waitingState.tournament.maxPlayers).map((position, index) => {
              const isOccupied = waitingState.tournament.players.some(p => p.user.walletAddress === publicKey?.toString());
              const isUserSeat = index === waitingState.playerSeat;
              const seatNumber = index + 1;
              
              return (
                <div key={index} className={`absolute ${position}`}>
                  <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-sm font-bold ${
                    isUserSeat 
                      ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400 shadow-lg shadow-yellow-400/50' 
                      : isOccupied 
                        ? 'border-green-400 bg-green-400/20 text-green-400' 
                        : 'border-gray-500 bg-gray-500/20 text-gray-500'
                  }`}>
                    {isUserSeat ? 'YOU' : isOccupied ? 'OCC' : seatNumber}
                  </div>
                  {isUserSeat && (
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-yellow-400 font-semibold">
                      Your Seat
                    </div>
                  )}
                </div>
              );
            })}

            {/* Waiting Message */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="bg-black/40 backdrop-blur-sm rounded-xl p-8 border border-white/20">
                <h3 className="text-3xl font-bold text-yellow-400 mb-4">Waiting for Players</h3>
                <p className="text-xl text-gray-300 mb-4">
                  {waitingState.availableSeats} more player{waitingState.availableSeats !== 1 ? 's' : ''} needed
                </p>
                <div className="text-lg text-purple-400 mb-2">
                  {waitingState.playerSeat !== -1 ? (
                    `You're seated at position ${waitingState.playerSeat + 1}`
                  ) : (
                    'You\'re waiting to be seated...'
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  Table Theme: {waitingState.tournament.tableTheme || 'Classic'} • {waitingState.tournament.tableColor || 'Green'}
                </div>
              </div>
            </div>

                {/* Player Seats - Show occupied and available (dynamic based on max players) */}
                {Array.from({ length: waitingState.tournament.maxPlayers }, (_, index) => {
              const isOccupied = waitingState.tournament.players.some((player, playerIndex) =>
                index === waitingState.playerSeat || playerIndex === index
              );
              const isCurrentPlayer = index === waitingState.playerSeat;

                  const positions = getPlayerPositions(waitingState.tournament.maxPlayers);

                  return (
                    <div
                      key={index}
                      className={`absolute ${positions[index]} transform z-10`}
                    >
                  <div className={`player-seat bg-gray-900 rounded-xl p-4 min-w-[160px] border-2 backdrop-blur-sm ${
                    isCurrentPlayer ? 'current-player border-purple-500' :
                    isOccupied ? 'border-green-500' : 'border-gray-600 opacity-50'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="player-avatar">
                        {isOccupied ? (isCurrentPlayer ? 'YOU' : '👤') : '⭕'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white">
                          {isOccupied ?
                            (isCurrentPlayer ? 'You' : `Player ${index + 1}`) :
                            `Seat ${index + 1}`
                          }
                        </div>
                        {isOccupied && (
                          <div className="text-xs text-gray-400">
                            Joined
                          </div>
                        )}
                      </div>
                    </div>
                    {isOccupied && (
                      <div className="text-xs text-green-400 font-semibold">
                        ✓ Seated
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Waiting Actions */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <h3 className="text-xl font-bold mb-4">Tournament Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {waitingState.tournament.buyIn} SOL
                </div>
                <div className="text-sm text-gray-400">Buy-in</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {waitingState.tournament.maxPlayers}
                </div>
                <div className="text-sm text-gray-400">Max Players</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {waitingState.availableSeats}
                </div>
                <div className="text-sm text-gray-400">Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {waitingState.tournament.players.length}
                </div>
                <div className="text-sm text-gray-400">Joined</div>
              </div>
            </div>
            <p className="text-gray-400">
              The game will start automatically when all {waitingState.tournament.maxPlayers} players have joined.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState?.players.find(p => p.walletAddress === publicKey?.toBase58());
  const isMyTurn = currentPlayer && gameState?.currentPlayerSeat === currentPlayer.seatPosition;
  const callAmount = isMyTurn && gameState ? gameState.currentBet - (currentPlayer?.bet || 0) : 0;

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Hand #{gameState?.handNumber || 0}</h2>
            <p className="text-sm text-gray-400">{gameState?.bettingRound?.replace('_', ' ') || 'Pre-Flop'}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-400">{gameState?.pot?.toFixed(3) || '0.000'} SOL</p>
            <p className="text-sm text-gray-400">Pot</p>
          </div>
        </div>
      </div>

      {/* Poker Table */}
      <div className="max-w-6xl mx-auto poker-table-container">
        <div className="relative poker-table rounded-full aspect-[16/10] border-8 border-amber-900 shadow-2xl p-8">
          {/* Game Phase Indicator */}
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Phase</div>
            <div className="text-lg font-bold text-white">
              {gameState?.bettingRound === 'preflop' ? 'Pre-Flop' :
               gameState?.bettingRound === 'flop' ? 'Flop' :
               gameState?.bettingRound === 'turn' ? 'Turn' :
               gameState?.bettingRound === 'river' ? 'River' :
               gameState?.bettingRound === 'showdown' ? 'Showdown' :
               'Waiting'}
            </div>
            <div className="text-xs text-gray-400">
              Hand #{gameState?.handNumber || 1}
            </div>
          </div>

          {/* Pot Display */}
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 pot-display rounded-lg px-6 py-3">
            <div className="text-xs text-yellow-400 font-semibold uppercase tracking-wider">Pot</div>
            <div className="text-3xl font-bold text-yellow-400">{gameState?.pot?.toFixed(3) || '0.000'} SOL</div>
          </div>

          {/* Current Player Indicator */}
          {gameState?.currentPlayerSeat !== null && gameState && (
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Current Player</div>
              <div className="text-lg font-bold text-blue-400">
                Seat {gameState.currentPlayerSeat + 1}
              </div>
            </div>
          )}

          {/* Community Cards */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="community-cards flex gap-3 p-6 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10">
              {gameState?.communityCards && gameState.communityCards.length > 0 ? (
                gameState.communityCards.map((card, i) => (
                  <div 
                    key={i} 
                    className={`playing-card ${['hearts', 'diamonds'].includes(card.suit) ? 'red' : 'black'}`}
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-bold">{card.rank}</span>
                      <span className="text-2xl">{getSuitSymbol(card.suit)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/30 text-sm font-semibold px-8 py-12">
                  Waiting for community cards...
                </div>
              )}
            </div>
          </div>

          {/* Player Seats */}
          {gameState?.players && gameState.players.map((player) => {
            const isCurrentPlayer = player.walletAddress === publicKey?.toBase58();
            const isActive = player.status === 'active';
            const isTurn = gameState?.currentPlayerSeat === player.seatPosition;

                // Position around the table (dynamic based on player count)
                const positions = getPlayerPositions(gameState.players.length);

            return (
              <div
                key={player.userId}
                className={`absolute ${positions[player.seatPosition]} transform z-10`}
              >
                {/* Dealer Button */}
                {player.isDealer && (
                  <div className="dealer-button absolute -top-3 -right-3">
                    D
                  </div>
                )}

                {/* Player Card */}
                <div className={`player-seat bg-gray-900 rounded-xl p-4 min-w-[160px] border-2 backdrop-blur-sm ${
                  isTurn ? 'active-turn border-yellow-400' : 
                  isCurrentPlayer ? 'current-player border-purple-500' : 
                  'border-gray-700'
                } ${player.status === 'folded' ? 'opacity-50' : ''}`}>
                  
                  {/* Seat Position Indicator */}
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white">
                    {player.seatPosition + 1}
                  </div>
                  
                  {/* Player Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="player-avatar">
                      {getPlayerInitials(player.username, player.walletAddress)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {player.username || `Player ${player.seatPosition + 1}`}
                        {isCurrentPlayer && (
                          <span className="ml-2 text-xs text-yellow-400 font-bold">(YOU)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`chip ${getChipColor(player.chips)} w-4 h-4`}></div>
                        <span className="text-xs text-gray-300 font-mono">
                          {player.chips.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Player Status */}
                  {player.status !== 'active' && player.status !== 'all_in' && (
                    <div className="text-xs text-red-400 uppercase font-semibold mb-1">
                      {player.status}
                    </div>
                  )}

                  {/* Current Bet */}
                  {player.bet > 0 && (
                    <div className="bet-chips flex items-center gap-1 mb-2 bg-black/40 rounded px-2 py-1">
                      <div className={`chip ${getChipColor(player.bet)} w-3 h-3`}></div>
                      <span className="text-xs text-green-400 font-semibold">
                        Bet: {player.bet.toFixed(3)}
                      </span>
                    </div>
                  )}

                  {/* Player Cards */}
                  {player.cards.length > 0 && isCurrentPlayer && (
                    <div className="flex gap-2 mt-2">
                      {player.cards.map((card, i) => (
                        <div 
                          key={i} 
                          className={`playing-card ${['hearts', 'diamonds'].includes(card.suit) ? 'red' : 'black'}`}
                          style={{ width: '2.5rem', height: '3.5rem', fontSize: '1rem' }}
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-xl font-bold">{card.rank}</span>
                            <span className="text-lg">{getSuitSymbol(card.suit)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Last Action */}
                  {player.lastAction && (
                    <div className="mt-2 text-xs text-yellow-300 font-semibold uppercase bg-yellow-900/30 rounded px-2 py-1 text-center">
                      {player.lastAction.action.replace('_', ' ')}
                    </div>
                  )}

                  {/* Turn Indicator */}
                  {isTurn && isActive && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full">
                      YOUR TURN
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      {isMyTurn && currentPlayer && currentPlayer.status === 'active' && (
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border-2 border-yellow-400/50 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-yellow-400">Your Turn</h3>
              <div className="text-sm text-gray-400">
                Current Bet: <span className="text-white font-semibold">{gameState?.currentBet?.toFixed(3) || '0.000'} SOL</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Fold Button */}
              <button
                onClick={() => handleAction('fold')}
                className="action-button bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all"
              >
                <div className="text-2xl mb-1">🚫</div>
                <div className="text-sm">FOLD</div>
              </button>

              {/* Check/Call Button */}
              {callAmount === 0 ? (
                <button
                  onClick={() => handleAction('check')}
                  className="action-button bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all"
                >
                  <div className="text-2xl mb-1">✓</div>
                  <div className="text-sm">CHECK</div>
                </button>
              ) : (
                <button
                  onClick={() => handleAction('call')}
                  className="action-button bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all"
                >
                  <div className="text-2xl mb-1">💰</div>
                  <div className="text-sm">CALL</div>
                  <div className="text-xs mt-1">{callAmount.toFixed(3)}</div>
                </button>
              )}

              {/* Raise Section */}
              <div className="col-span-2 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={actionAmount}
                    onChange={(e) => setActionAmount(parseFloat(e.target.value) || 0)}
                    min={(gameState?.currentBet || 0) + (gameState?.bigBlind || 0)}
                    max={currentPlayer?.chips || 0}
                    step={gameState?.bigBlind || 0}
                    className="flex-1 bg-gray-700 text-white rounded-xl px-4 py-3 font-mono text-lg border-2 border-gray-600 focus:border-purple-500 focus:outline-none"
                    placeholder="Raise amount"
                  />
                  <button
                    onClick={() => handleAction('raise', actionAmount)}
                    disabled={actionAmount < (gameState?.currentBet || 0) + (gameState?.bigBlind || 0)}
                    className="action-button bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all"
                  >
                    <div className="text-xl">↗️</div>
                    <div className="text-sm">RAISE</div>
                  </button>
                </div>
                
                {/* Quick Bet Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActionAmount((gameState?.currentBet || 0) + (gameState?.bigBlind || 0))}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
                  >
                    Min
                  </button>
                  <button
                    onClick={() => setActionAmount((gameState?.pot || 0) / 2)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
                  >
                    1/2 Pot
                  </button>
                  <button
                    onClick={() => setActionAmount(gameState?.pot || 0)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
                  >
                    Pot
                  </button>
                  <button
                    onClick={() => setActionAmount(currentPlayer.chips)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* All-In Button */}
              <button
                onClick={() => handleAction('all_in')}
                className="action-button bg-gradient-to-br from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-black font-bold py-4 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all col-span-2 md:col-span-4"
              >
                <div className="text-2xl mb-1">🔥</div>
                <div className="text-sm">ALL-IN</div>
                <div className="text-xs mt-1">{currentPlayer.chips.toFixed(3)} SOL</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState?.status === 'complete' && (
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <h3 className="text-2xl font-bold mb-4">Hand Complete</h3>
            <p className="text-gray-400">Waiting for next hand...</p>
          </div>
        </div>
      )}
    </div>
  );
}

