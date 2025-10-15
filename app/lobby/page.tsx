'use client';

import { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';

// Production mode - real Solana transactions enabled
const DEMO_MODE = false;
console.log('🎮 Demo mode enabled:', DEMO_MODE);
console.log('🔍 DEMO_MODE type:', typeof DEMO_MODE);
console.log('🔍 DEMO_MODE value:', DEMO_MODE);

interface TournamentPlayer {
  walletAddress: string;
  userId?: string;
  username?: string;
}

interface Tournament {
  id: string;
  name: string;
  buyIn: number | { toFixed: (digits: number) => string; toString: () => string };
  rakePercentage: number | { toString: () => string };
  status: string;
  maxPlayers: number;
  tournamentType: string;
  privacy: string;
  blindStructure: string;
  players: TournamentPlayer[];
  createdAt: string;
}

export default function LobbyPage() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) {
      router.push('/');
      return;
    }

    fetchTournaments();
    const interval = setInterval(fetchTournaments, 10000); // Refresh every 10 seconds (reduced from 5s)

    return () => clearInterval(interval);
  }, [connected, router]);

  const fetchTournaments = async () => {
    try {
      // Single API call to fetch all active tournaments (WAITING + IN_PROGRESS)
      const response = await fetch('/api/tournaments?status=WAITING,IN_PROGRESS');
      
      if (response.ok) {
        const data = await response.json();
        setTournaments(data.tournaments);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWatchGame = (tournament: Tournament) => {
    // Navigate to game page as spectator
    router.push(`/game/${tournament.id}`);
  };

  const handleJoinTournament = async (tournament: Tournament) => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    if (!connected) {
      alert('Wallet not connected. Please connect your wallet and try again.');
      return;
    }

    console.log('🚀 Starting tournament join process...');
    console.log('👛 Wallet connected:', connected);
    console.log('🔑 Public key:', publicKey.toBase58());
    console.log('🎮 Demo mode:', DEMO_MODE);

    setJoining(tournament.id);

    try {
      let transactionSignature: string;

      if (DEMO_MODE) {
        // Demo mode: Use mock transaction
        transactionSignature = `demo_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('🎮 Demo mode: Using mock transaction signature:', transactionSignature);
      } else {
        // Production mode: Create real Solana transaction
        console.log('🔄 Attempting real Solana transaction...');
        try {
          const { PublicKey } = await import('@solana/web3.js');

          // Check if sendTransaction is available
          if (!sendTransaction) {
            throw new Error('sendTransaction not available. Wallet may not be ready.');
          }

          console.log('📋 Creating tournament join transaction for:', tournament.id);
          const playerWallet = new PublicKey(publicKey.toBase58());

          // Create a simple memo transaction for now
          // TODO: Replace with actual poker program integration
          const { Transaction, TransactionInstruction } = await import('@solana/web3.js');
          
          // Create a proper memo instruction
          const memoInstruction = new TransactionInstruction({
            keys: [
              { pubkey: playerWallet, isSigner: true, isWritable: false },
            ],
            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
            data: Buffer.from(`Joining tournament: ${tournament.id}`, 'utf8'),
          });
          
          const transaction = new Transaction().add(memoInstruction);
          
          // Get recent blockhash
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = playerWallet;

          console.log('✍️ Requesting transaction signature...');
          const signature = await sendTransaction(transaction, connection);
          transactionSignature = signature;
          console.log('✅ Real Solana transaction completed:', signature);
        } catch (error) {
          console.error('❌ Solana transaction failed:', error);
          if (error instanceof Error) {
            console.error('Error details:', error.message, error.stack);
          }
          alert('Failed to join tournament. Please try again.');
          setJoining(null);
          return;
        }
      }
      
      // Get auth token from localStorage (set during wallet authentication)
      const token = localStorage.getItem('poker_token');
      
      if (!token) {
        alert('Please authenticate your wallet first');
        return;
      }
      
      // Call API to join tournament
      const response = await fetch(`/api/tournaments/${tournament.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionSignature,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();

        if (data.alreadyJoined) {
          // User is already joined, redirect to game page to see the table
          console.log('✅ Already joined tournament, redirecting to game page');
          router.push(`/game/${tournament.id}`);
        } else {
          // Successfully joined, redirect to game page
          console.log('✅ Successfully joined tournament, redirecting to game page');
          router.push(`/game/${tournament.id}`);
        }
      } else {
        const error = await response.json();
        if (error.error === 'Already joined this tournament') {
          // Handle the case where API returns already joined as an error
          console.log('✅ Already joined tournament (legacy response), redirecting to game page');
          router.push(`/game/${tournament.id}`);
        } else {
          alert(`Failed to join tournament: ${error.error}`);
        }
      }
    } catch (error) {
      console.error('Error joining tournament:', error);
      alert('Failed to join tournament');
    } finally {
      setJoining(null);
    }
  };

  if (!connected) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Solana Poker
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {publicKey?.toBase58().slice(0, 8)}...
            </span>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* Demo Mode Banner */}
      {DEMO_MODE && (
        <div className="bg-yellow-600 text-black px-4 py-2 text-center">
          <span className="font-semibold">🎮 DEMO MODE</span> - No real blockchain transactions. Perfect for testing!
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">Tournament Lobby</h2>
              <p className="text-gray-400">Join a tournament or create your own</p>
            </div>
            <button
              onClick={() => router.push('/create')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              🚀 Create Tournament
            </button>
          </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            <p className="mt-4 text-gray-400">Loading tournaments...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-xl text-gray-400">No tournaments available</p>
            <p className="mt-2 text-sm text-gray-500">Check back soon or ask an admin to create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => {
              const buyInSol = typeof tournament.buyIn === 'number'
                ? tournament.buyIn
                : parseFloat(tournament.buyIn.toString());
              const rake = typeof tournament.rakePercentage === 'number'
                ? tournament.rakePercentage
                : parseFloat(tournament.rakePercentage.toString());
              const playersJoined = tournament.players.length;
              const playersNeeded = tournament.maxPlayers - playersJoined;

              // Check if current user is already joined
              const isCurrentUserJoined = tournament.players.some(p => p.walletAddress === publicKey?.toBase58());

              return (
                <div
                  key={tournament.id}
                  className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-purple-500 transition-colors"
                >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold">{tournament.name}</h3>
                        <div className="flex gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            tournament.tournamentType === 'sit_n_go' ? 'bg-blue-600' :
                            tournament.tournamentType === 'scheduled' ? 'bg-green-600' :
                            tournament.tournamentType === 'bounty' ? 'bg-red-600' :
                            tournament.tournamentType === 'rebuy' ? 'bg-yellow-600' :
                            'bg-purple-600'
                          }`}>
                            {tournament.tournamentType.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            tournament.privacy === 'public' ? 'bg-green-600' :
                            tournament.privacy === 'private' ? 'bg-red-600' :
                            'bg-yellow-600'
                          }`}>
                            {tournament.privacy.toUpperCase()}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            tournament.status === 'IN_PROGRESS' ? 'bg-orange-600' :
                            tournament.status === 'WAITING' ? 'bg-blue-600' :
                            tournament.status === 'COMPLETED' ? 'bg-gray-600' :
                            'bg-red-600'
                          }`}>
                            {tournament.status === 'IN_PROGRESS' ? 'LIVE' :
                             tournament.status === 'WAITING' ? 'WAITING' :
                             tournament.status === 'COMPLETED' ? 'ENDED' :
                             tournament.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Buy-in:</span>
                            <div className="font-semibold text-green-400">
                              {buyInSol.toFixed(3)} SOL
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400">Rake:</span>
                            <div className="text-gray-300">{rake}%</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Players:</span>
                            <div className="text-gray-300">
                              {playersJoined}/{tournament.maxPlayers}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400">Blinds:</span>
                            <div className="text-gray-300 capitalize">
                              {tournament.blindStructure.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-700 rounded-lg p-3 mt-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Prize Pool:</span>
                            <span className="font-semibold text-purple-400">
                              {(buyInSol * tournament.maxPlayers * (1 - rake / 100)).toFixed(3)} SOL
                            </span>
                          </div>
                        </div>
                      </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${(playersJoined / tournament.maxPlayers) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {isCurrentUserJoined
                        ? 'You\'re in! Click "View Table" to see your seat'
                        : playersNeeded > 0
                        ? `${playersNeeded} more player${playersNeeded > 1 ? 's' : ''} needed`
                        : 'Full!'
                      }
                    </p>
                  </div>

                  {/* Players List */}
                  {tournament.players.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">
                        Players ({tournament.players.length}/{tournament.maxPlayers})
                      </h4>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {tournament.players.map((player, index) => (
                          <div 
                            key={player.walletAddress || `player-${index}`}
                            className={`flex items-center justify-between text-xs p-2 rounded ${
                              player.walletAddress === publicKey?.toBase58()
                                ? 'bg-purple-600/20 border border-purple-500/30'
                                : 'bg-gray-700/50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                {index + 1}
                              </div>
                              <span className="text-gray-300">
                                {player.username || `Player ${index + 1}`}
                              </span>
                              {player.walletAddress === publicKey?.toBase58() && (
                                <span className="text-purple-400 font-semibold">(YOU)</span>
                              )}
                            </div>
                            <div className="text-gray-400 font-mono text-xs">
                              {player.walletAddress ? `${player.walletAddress.slice(0, 8)}...${player.walletAddress.slice(-4)}` : 'Unknown'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {tournament.status === 'IN_PROGRESS' ? (
                      // Game is in progress - show watch button
                      <button
                        onClick={() => handleWatchGame(tournament)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                      >
                        👁️ Watch Game Live
                      </button>
                    ) : (
                      // Game is waiting - show join/view button
                      <button
                        onClick={() => handleJoinTournament(tournament)}
                        disabled={joining === tournament.id}
                        className={`w-full font-semibold py-3 px-4 rounded-lg transition-colors ${
                          isCurrentUserJoined
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : playersJoined >= tournament.maxPlayers && !isCurrentUserJoined
                            ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        {joining === tournament.id
                          ? 'Processing...'
                          : isCurrentUserJoined
                          ? 'View Table'
                          : playersJoined >= tournament.maxPlayers
                          ? 'Tournament Full'
                          : 'Join Tournament'
                        }
                      </button>
                    )}
                    
                    {/* Additional watch button for joined users in waiting tournaments */}
                    {tournament.status === 'WAITING' && isCurrentUserJoined && (
                      <button
                        onClick={() => handleWatchGame(tournament)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                      >
                        👁️ Watch Table
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

