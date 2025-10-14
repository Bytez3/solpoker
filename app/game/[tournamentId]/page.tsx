'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

// Temporarily enable demo mode for testing until Solana program is deployed
const DEMO_MODE = true;

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
        setGameState(data.gameState);
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
        if (!publicKey || !sendTransaction) {
          alert('Wallet not connected properly');
          return;
        }

        const { pokerProgram } = await import('@/lib/solana/poker-program');
        const { PublicKey, Transaction, TransactionInstruction } = await import('@solana/web3.js');

        try {
          // For now, we'll create a simple transaction
          // In a real implementation, you'd need more complex logic based on the action type
          const playerWallet = new PublicKey(publicKey.toBase58());

          // Create a simple transaction (this is a placeholder - you'd need actual program integration)
          const transaction = new Transaction();

          // For demo purposes, we'll just use the API route for game state updates
          // In production, you'd integrate with the actual Solana program
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
        } catch (error) {
          console.error('❌ Solana transaction failed:', error);
          alert('Failed to process action. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error processing action:', error);
      alert('Failed to process action');
    }
  };

  if (loading || !gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="mt-4 text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players.find(p => p.walletAddress === publicKey?.toBase58());
  const isMyTurn = currentPlayer && gameState.currentPlayerSeat === currentPlayer.seatPosition;
  const callAmount = isMyTurn ? gameState.currentBet - (currentPlayer?.bet || 0) : 0;

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Hand #{gameState.handNumber}</h2>
            <p className="text-sm text-gray-400">{gameState.bettingRound.replace('_', ' ')}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-400">{gameState.pot.toFixed(3)} SOL</p>
            <p className="text-sm text-gray-400">Pot</p>
          </div>
        </div>
      </div>

      {/* Poker Table */}
      <div className="max-w-6xl mx-auto poker-table-container">
        <div className="relative poker-table rounded-full aspect-[16/10] border-8 border-amber-900 shadow-2xl p-8">
          {/* Pot Display */}
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 pot-display rounded-lg px-6 py-3">
            <div className="text-xs text-yellow-400 font-semibold uppercase tracking-wider">Pot</div>
            <div className="text-3xl font-bold text-yellow-400">{gameState.pot.toFixed(3)} SOL</div>
          </div>

          {/* Community Cards */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="community-cards flex gap-3 p-6 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10">
              {gameState.communityCards.length > 0 ? (
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
          {gameState.players.map((player) => {
            const isCurrentPlayer = player.walletAddress === publicKey?.toBase58();
            const isActive = player.status === 'active';
            const isTurn = gameState.currentPlayerSeat === player.seatPosition;

            // Position around the table
            const positions = [
              'top-6 left-1/2 -translate-x-1/2',
              'top-1/4 right-8',
              'bottom-1/4 right-8',
              'bottom-6 left-1/2 -translate-x-1/2',
              'bottom-1/4 left-8',
              'top-1/4 left-8',
            ];

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
                  
                  {/* Player Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="player-avatar">
                      {getPlayerInitials(player.username, player.walletAddress)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {player.username || `Player ${player.seatPosition + 1}`}
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
                Current Bet: <span className="text-white font-semibold">{gameState.currentBet.toFixed(3)} SOL</span>
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
                    min={gameState.currentBet + gameState.bigBlind}
                    max={currentPlayer.chips}
                    step={gameState.bigBlind}
                    className="flex-1 bg-gray-700 text-white rounded-xl px-4 py-3 font-mono text-lg border-2 border-gray-600 focus:border-purple-500 focus:outline-none"
                    placeholder="Raise amount"
                  />
                  <button
                    onClick={() => handleAction('raise', actionAmount)}
                    disabled={actionAmount < gameState.currentBet + gameState.bigBlind}
                    className="action-button bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all"
                  >
                    <div className="text-xl">↗️</div>
                    <div className="text-sm">RAISE</div>
                  </button>
                </div>
                
                {/* Quick Bet Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActionAmount(gameState.currentBet + gameState.bigBlind)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
                  >
                    Min
                  </button>
                  <button
                    onClick={() => setActionAmount(gameState.pot / 2)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
                  >
                    1/2 Pot
                  </button>
                  <button
                    onClick={() => setActionAmount(gameState.pot)}
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
      {gameState.status === 'complete' && (
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

