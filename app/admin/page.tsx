'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function AdminPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [stats, setStats] = useState<{
    stats: {
      totalTournaments: number;
      activeTournaments: number;
      totalPlayers: number;
      totalRakeCollected: number;
    };
    recentTournaments: Array<{
      id: string;
      name: string;
      status: string;
      buyIn: number | { toFixed: (digits: number) => string; toString: () => string };
      players: unknown[];
      maxPlayers: number;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [buyIn, setBuyIn] = useState('0.1');
  const [rakePercentage, setRakePercentage] = useState('5');

  useEffect(() => {
    if (!connected) {
      router.push('/');
      return;
    }

    fetchStats();
  }, [connected, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('poker_token');
      if (!token) return;

      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 403) {
        alert('Admin access required');
        router.push('/lobby');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const token = localStorage.getItem('poker_token');
      if (!token) return;

      // TODO: Call Solana program to initialize tournament escrow
      const mockEscrowAddress = `escrow_${Date.now()}`;

      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          buyIn: parseFloat(buyIn),
          rakePercentage: parseFloat(rakePercentage),
          escrowAddress: mockEscrowAddress,
        }),
      });

      if (response.ok) {
        alert('Tournament created successfully!');
        setName('');
        setBuyIn('0.1');
        setRakePercentage('5');
        fetchStats();
      } else {
        const error = await response.json();
        alert(`Failed to create tournament: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert('Failed to create tournament');
    } finally {
      setCreating(false);
    }
  };

  if (!connected || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          {loading && <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>}
          <p className="mt-4 text-gray-400">
            {loading ? 'Loading...' : 'Please connect your wallet'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Admin Dashboard
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
          <span className="font-semibold">🎮 DEMO MODE</span> - Creating tournaments without deploying smart contract
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-sm text-gray-400 mb-2">Total Tournaments</h3>
              <p className="text-3xl font-bold">{stats.stats.totalTournaments}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-sm text-gray-400 mb-2">Active Tournaments</h3>
              <p className="text-3xl font-bold text-green-400">{stats.stats.activeTournaments}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-sm text-gray-400 mb-2">Total Players</h3>
              <p className="text-3xl font-bold text-purple-400">{stats.stats.totalPlayers}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-sm text-gray-400 mb-2">Total Rake Collected</h3>
              <p className="text-3xl font-bold text-yellow-400">
                {stats.stats.totalRakeCollected.toFixed(3)} SOL
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Tournament */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold mb-6">Create Tournament</h2>

            <form onSubmit={handleCreateTournament} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tournament Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none"
                  placeholder="Friday Night Poker"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Buy-in (SOL)
                </label>
                <input
                  type="number"
                  value={buyIn}
                  onChange={(e) => setBuyIn(e.target.value)}
                  required
                  step="0.001"
                  min="0.001"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rake Percentage (%)
                </label>
                <input
                  type="number"
                  value={rakePercentage}
                  onChange={(e) => setRakePercentage(e.target.value)}
                  required
                  step="0.5"
                  min="0"
                  max="10"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {creating ? 'Creating...' : 'Create Tournament'}
              </button>
            </form>
          </div>

          {/* Recent Tournaments */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold mb-6">Recent Tournaments</h2>

            {stats && stats.recentTournaments.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {stats.recentTournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{tournament.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        tournament.status === 'WAITING' ? 'bg-yellow-600' :
                        tournament.status === 'IN_PROGRESS' ? 'bg-green-600' :
                        'bg-gray-600'
                      }`}>
                        {tournament.status}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="text-gray-400">
                        Buy-in: <span className="text-white">
                          {typeof tournament.buyIn === 'number' 
                            ? tournament.buyIn.toFixed(3) 
                            : parseFloat(tournament.buyIn.toString()).toFixed(3)} SOL
                        </span>
                      </p>
                      <p className="text-gray-400">
                        Players: <span className="text-white">
                          {tournament.players.length}/{tournament.maxPlayers}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No tournaments yet</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

