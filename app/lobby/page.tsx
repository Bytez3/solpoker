'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface Tournament {
  id: string;
  name: string;
  buyIn: number;
  rakePercentage: number;
  status: string;
  maxPlayers: number;
  players: any[];
  createdAt: string;
}

export default function LobbyPage() {
  const { connected, publicKey } = useWallet();
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
    const interval = setInterval(fetchTournaments, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [connected, router]);

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/tournaments?status=WAITING');
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

  const handleJoinTournament = async (tournament: Tournament) => {
    if (!publicKey) return;

    setJoining(tournament.id);
    
    try {
      let transactionSignature: string;
      
      if (DEMO_MODE) {
        // Demo mode: Use mock transaction
        transactionSignature = `demo_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('🎮 Demo mode: Using mock transaction signature:', transactionSignature);
      } else {
        // Production mode: Call Solana program to join tournament
        // TODO: Implement actual Solana transaction
        alert('Real Solana transactions not yet implemented. Enable DEMO_MODE in .env');
        return;
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
        
        if (data.tournamentStarted) {
          // Redirect to game
          router.push(`/game/${tournament.id}`);
        } else {
          alert(`Joined tournament! ${data.playersNeeded} more players needed.`);
          fetchTournaments();
        }
      } else {
        const error = await response.json();
        alert(`Failed to join tournament: ${error.error}`);
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Tournament Lobby</h2>
          <p className="text-gray-400">Join a tournament or wait for more players</p>
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

              return (
                <div
                  key={tournament.id}
                  className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-purple-500 transition-colors"
                >
                  <h3 className="text-xl font-semibold mb-4">{tournament.name}</h3>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Buy-in:</span>
                      <span className="font-semibold text-green-400">
                        {buyInSol.toFixed(3)} SOL
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Rake:</span>
                      <span className="text-gray-300">{rake}%</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Players:</span>
                      <span className="text-gray-300">
                        {playersJoined}/{tournament.maxPlayers}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Prize Pool:</span>
                      <span className="font-semibold text-purple-400">
                        {(buyInSol * tournament.maxPlayers * (1 - rake / 100)).toFixed(3)} SOL
                      </span>
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
                      {playersNeeded > 0 ? `${playersNeeded} more player${playersNeeded > 1 ? 's' : ''} needed` : 'Full!'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleJoinTournament(tournament)}
                    disabled={joining === tournament.id || playersJoined >= tournament.maxPlayers}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    {joining === tournament.id ? 'Joining...' : 'Join Tournament'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

