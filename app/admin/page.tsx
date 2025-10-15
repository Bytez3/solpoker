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

  // Enhanced form state
  const [name, setName] = useState('');
  const [buyIn, setBuyIn] = useState('0.1');
  const [rakePercentage, setRakePercentage] = useState('5');
  const [maxPlayers, setMaxPlayers] = useState('6');
  const [tournamentType, setTournamentType] = useState('sit_n_go');
  const [privacy, setPrivacy] = useState('public');
  const [blindStructure, setBlindStructure] = useState('progressive');
  const [tokenType, setTokenType] = useState('SOL');
  const [tokenMint, setTokenMint] = useState('');
  const [tokenDecimals, setTokenDecimals] = useState('9');

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
          maxPlayers: parseInt(maxPlayers),
          tournamentType,
          privacy,
          blindStructure,
          tokenType,
          tokenMint: tokenType === 'SPL' ? tokenMint : null,
          tokenDecimals: tokenType === 'SPL' ? parseInt(tokenDecimals) : 9,
          escrowAddress: mockEscrowAddress,
        }),
      });

      if (response.ok) {
        alert('Tournament created successfully!');
        setName('');
        setBuyIn('0.1');
        setRakePercentage('5');
        setMaxPlayers('6');
        setTournamentType('sit_n_go');
        setPrivacy('public');
        setBlindStructure('progressive');
        setTokenType('SOL');
        setTokenMint('');
        setTokenDecimals('9');
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
          {/* Enhanced Create Tournament */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              Create Enhanced Tournament
            </h2>

            <form onSubmit={handleCreateTournament} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    Max Players
                  </label>
                  <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="2">2 Players (Heads Up)</option>
                    <option value="3">3 Players</option>
                    <option value="4">4 Players</option>
                    <option value="5">5 Players</option>
                    <option value="6">6 Players (Standard)</option>
                    <option value="7">7 Players</option>
                    <option value="8">8 Players</option>
                    <option value="9">9 Players</option>
                    <option value="10">10 Players (Full Ring)</option>
                  </select>
                </div>
              </div>

              {/* Financial Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              {/* Tournament Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tournament Type
                  </label>
                  <select
                    value={tournamentType}
                    onChange={(e) => setTournamentType(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="sit_n_go">Sit & Go</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="bounty">Bounty</option>
                    <option value="rebuy">Rebuy</option>
                    <option value="free_roll">Free Roll</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Privacy
                  </label>
                  <select
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="friends_only">Friends Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Blind Structure
                  </label>
                  <select
                    value={blindStructure}
                    onChange={(e) => setBlindStructure(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="progressive">Progressive</option>
                    <option value="turbo">Turbo</option>
                    <option value="slow">Slow</option>
                    <option value="hyper_turbo">Hyper Turbo</option>
                  </select>
                </div>
              </div>

              {/* Token Configuration */}
              <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
                <h3 className="text-lg font-semibold text-purple-400 mb-4">Token Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Token Type
                    </label>
                    <select
                      value={tokenType}
                      onChange={(e) => {
                        setTokenType(e.target.value);
                        if (e.target.value === 'SOL') {
                          setTokenMint('');
                          setTokenDecimals('9');
                        }
                      }}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none"
                    >
                      <option value="SOL">SOL (Native)</option>
                      <option value="SPL">SPL Token</option>
                    </select>
                  </div>

                  {tokenType === 'SPL' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Token Mint Address
                        </label>
                        <input
                          type="text"
                          value={tokenMint}
                          onChange={(e) => setTokenMint(e.target.value)}
                          placeholder="Enter SPL token mint address"
                          className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Token Decimals
                        </label>
                        <select
                          value={tokenDecimals}
                          onChange={(e) => setTokenDecimals(e.target.value)}
                          className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none"
                        >
                          <option value="0">0 decimals</option>
                          <option value="1">1 decimal</option>
                          <option value="2">2 decimals</option>
                          <option value="3">3 decimals</option>
                          <option value="4">4 decimals</option>
                          <option value="5">5 decimals</option>
                          <option value="6">6 decimals</option>
                          <option value="7">7 decimals</option>
                          <option value="8">8 decimals</option>
                          <option value="9">9 decimals</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {tokenType === 'SPL' && (
                  <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                    <h4 className="text-sm font-semibold text-blue-400 mb-2">Popular SPL Tokens:</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-300">USDC:</span>
                        <span className="text-blue-400 font-mono">EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">USDT:</span>
                        <span className="text-blue-400 font-mono">Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">RAY:</span>
                        <span className="text-blue-400 font-mono">4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">SRM:</span>
                        <span className="text-blue-400 font-mono">SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tournament Preview */}
              <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <h3 className="text-lg font-semibold text-purple-400 mb-3">Tournament Preview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Prize Pool:</span>
                    <div className="font-semibold text-green-400">
                      {(parseFloat(buyIn) * parseInt(maxPlayers) * (1 - parseFloat(rakePercentage) / 100)).toFixed(3)} {tokenType}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">House Rake:</span>
                    <div className="font-semibold text-yellow-400">
                      {(parseFloat(buyIn) * parseInt(maxPlayers) * parseFloat(rakePercentage) / 100).toFixed(3)} {tokenType}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Table Size:</span>
                    <div className="font-semibold text-blue-400">{maxPlayers} Players</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Token:</span>
                    <div className="font-semibold text-purple-400">
                      {tokenType === 'SOL' ? 'SOL (Native)' : 'SPL Token'}
                    </div>
                  </div>
                </div>
                
                {tokenType === 'SPL' && tokenMint && (
                  <div className="mt-4 p-3 bg-gray-600 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Token Mint:</div>
                    <div className="text-xs font-mono text-blue-400 break-all">{tokenMint}</div>
                    <div className="text-xs text-gray-400 mt-1">Decimals: {tokenDecimals}</div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {creating ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating Enhanced Tournament...</span>
                  </div>
                ) : (
                  '🚀 Create Enhanced Tournament'
                )}
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

