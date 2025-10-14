'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import bs58 from 'bs58';

// Production mode - real Solana transactions enabled
const DEMO_MODE = false;

export default function AdminPage() {
  const { connected, publicKey, signMessage } = useWallet();
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
  const [authenticating, setAuthenticating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [buyIn, setBuyIn] = useState('0.1');
  const [rakePercentage, setRakePercentage] = useState('5');

  useEffect(() => {
    if (!connected) {
      // Don't redirect immediately, show wallet connection first
      return;
    }

    // If connected but no token, we need to authenticate
    const token = localStorage.getItem('poker_token');
    if (!token) {
      console.log('Connected but no token, staying on admin page to authenticate');
      return;
    }

    fetchStats();
  }, [connected, router]);

  const authenticateForAdmin = async () => {
    if (!publicKey || !signMessage) {
      alert('Please connect your wallet first');
      return;
    }

    setAuthenticating(true);
    try {
      // Get message to sign
      const messageResponse = await fetch(`/api/auth/wallet?walletAddress=${publicKey.toBase58()}`);
      if (!messageResponse.ok) {
        throw new Error('Failed to get authentication message');
      }
      const { message } = await messageResponse.json();

      // Sign message
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      const signatureBase58 = bs58.encode(signature);

      // Verify and get token
      const authResponse = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          signature: signatureBase58,
          message,
        }),
      });

      if (authResponse.ok) {
        const { token } = await authResponse.json();
        localStorage.setItem('poker_token', token);
        setHasToken(token); // Update state
        // Refresh stats after authentication
        fetchStats();
      } else {
        const errorData = await authResponse.json();
        alert(`Authentication failed: ${errorData.error || 'Unknown error'}`);
        setAuthenticating(false);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          alert('You rejected the signature request. Please try again and approve it.');
        } else {
          alert(`Failed to authenticate: ${error.message}`);
        }
      } else {
        alert('Failed to authenticate wallet. Please try again.');
      }
      setAuthenticating(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('poker_token');
      if (!token) {
        console.log('No token found, cannot fetch stats');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 403) {
        alert('Admin access required. Please sign in with the admin wallet: 3rWf9fKhQFFsjAfyM1cgtoBpeLZL75b77C8o8Fz9QeNF');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('poker_token');
          setHasToken(null);
        }
        setLoading(false);
      } else if (response.status === 401) {
        alert('Session expired. Please sign in again.');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('poker_token');
          setHasToken(null);
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      alert('Failed to load admin panel. Please try again.');
      setLoading(false);
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      if (!hasToken) return;

      // TODO: Call Solana program to initialize tournament escrow
      // For now using mock address - replace with real program integration
      const mockEscrowAddress = `escrow_${Date.now()}`;

      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hasToken}`,
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

  // Check if we need authentication (only on client side)
  const [hasToken, setHasToken] = useState<string | null>(null);

  useEffect(() => {
    // Only access localStorage on client side
    const token = localStorage.getItem('poker_token');
    setHasToken(token);
  }, []);

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 hover:!from-purple-700 hover:!to-pink-700 !transition-all !duration-300 !shadow-lg !shadow-purple-500/50 hover:!shadow-xl hover:!shadow-purple-500/70 !text-lg !px-8 !py-4 !rounded-xl !font-bold" />
          <p className="text-gray-400">
            Connect your admin wallet to access the admin panel
          </p>
        </div>
      </div>
    );
  }

  if (loading && hasToken === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (hasToken === null) {
    // Still loading localStorage check
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <p className="mt-4 text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              Admin Authentication Required
            </h2>
            <p className="text-gray-400 mb-6">
              Please authenticate with your admin wallet to access the admin panel.
            </p>
            <div className="bg-gray-700 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-300 mb-2">Admin Wallet Address:</p>
              <p className="font-mono text-xs text-purple-400 break-all">
                3rWf9fKhQFFsjAfyM1cgtoBpeLZL75b77C8o8Fz9QeNF
              </p>
            </div>
            <button
              onClick={authenticateForAdmin}
              disabled={authenticating}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300"
            >
              {authenticating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Authenticate as Admin'
              )}
            </button>
            <p className="text-xs text-gray-500 mt-3">
              Check your Phantom wallet for the signature request
            </p>
          </div>
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

      {/* Network Status Banner */}
      {!DEMO_MODE && (
        <div className="bg-green-600 text-white px-4 py-2 text-center">
          <span className="font-semibold">⚡ SOLANA DEVNET</span> - Real blockchain transactions enabled
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

