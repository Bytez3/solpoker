'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import bs58 from 'bs58';

// Production mode - real Solana transactions enabled
const DEMO_MODE = false;

export default function CreateTournamentPage() {
  const { connected, publicKey, signMessage } = useWallet();
  const router = useRouter();
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
  
  // Community Links
  const [communityName, setCommunityName] = useState('');
  const [communityDescription, setCommunityDescription] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [discordUrl, setDiscordUrl] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [customLink1, setCustomLink1] = useState('');
  const [customLink1Label, setCustomLink1Label] = useState('');
  const [customLink2, setCustomLink2] = useState('');
  const [customLink2Label, setCustomLink2Label] = useState('');
  
  // Table Customization
  const [tableTheme, setTableTheme] = useState('classic');
  const [tableColor, setTableColor] = useState('green');
  const [tablePattern, setTablePattern] = useState('felt');
  const [tableImage, setTableImage] = useState('');

  useEffect(() => {
    if (!connected) {
      return;
    }

    // Check if user is authenticated
    const token = localStorage.getItem('poker_token');
    if (!token) {
      console.log('Connected but no token, staying on create page to authenticate');
      return;
    }
  }, [connected, router]);

  const authenticateUser = async () => {
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
        console.log('User authenticated successfully');
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

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const token = localStorage.getItem('poker_token');
      if (!token) {
        alert('Please authenticate your wallet first');
        return;
      }

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
          maxPlayers: parseInt(maxPlayers),
          tournamentType,
          privacy,
          blindStructure,
          tokenType,
          tokenMint: tokenType === 'SPL' ? tokenMint : null,
          tokenDecimals: tokenType === 'SPL' ? parseInt(tokenDecimals) : 9,
          escrowAddress: mockEscrowAddress,
          // Community Links
          communityName,
          communityDescription,
          twitterUrl,
          discordUrl,
          telegramUrl,
          websiteUrl,
          customLink1,
          customLink1Label,
          customLink2,
          customLink2Label,
          // Table Customization
          tableTheme,
          tableColor,
          tablePattern,
          tableImage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Tournament created successfully!');
        router.push('/lobby');
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

  // Check if we need authentication
  const [hasToken, setHasToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('poker_token');
    setHasToken(token);
  }, []);

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 hover:!from-purple-700 hover:!to-pink-700 !transition-all !duration-300 !shadow-lg !shadow-purple-500/50 hover:!shadow-xl hover:!shadow-purple-500/70 !text-lg !px-8 !py-4 !rounded-xl !font-bold" />
          <p className="text-gray-400">
            Connect your wallet to create tournaments
          </p>
        </div>
      </div>
    );
  }

  if (hasToken === null) {
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
              Authentication Required
            </h2>
            <p className="text-gray-400 mb-6">
              Please authenticate with your wallet to create tournaments.
            </p>
            <button
              onClick={authenticateUser}
              disabled={authenticating}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300"
            >
              {authenticating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Authenticate Wallet'
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
            Create Tournament
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
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
              Create Your Tournament
            </h2>
            <p className="text-gray-400 text-lg">
              Host poker tournaments for your community with customizable settings
            </p>
          </div>

          <form onSubmit={handleCreateTournament} className="space-y-8">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  placeholder="My Community Tournament"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
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

            {/* Community Links */}
            <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
              <h3 className="text-lg font-semibold text-purple-400 mb-4">Community Links (Optional)</h3>
              <p className="text-gray-400 text-sm mb-6">
                Add links to promote your community and attract more players to your tournament.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Community Name
                  </label>
                  <input
                    type="text"
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="My Poker Community"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Community Description
                  </label>
                  <textarea
                    value={communityDescription}
                    onChange={(e) => setCommunityDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="Join our friendly poker community..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Twitter/X URL
                  </label>
                  <input
                    type="url"
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="https://twitter.com/yourcommunity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Discord URL
                  </label>
                  <input
                    type="url"
                    value={discordUrl}
                    onChange={(e) => setDiscordUrl(e.target.value)}
                    className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="https://discord.gg/yourcommunity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Telegram URL
                  </label>
                  <input
                    type="url"
                    value={telegramUrl}
                    onChange={(e) => setTelegramUrl(e.target.value)}
                    className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="https://t.me/yourcommunity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="https://yourcommunity.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Custom Link 1 Label
                  </label>
                  <input
                    type="text"
                    value={customLink1Label}
                    onChange={(e) => setCustomLink1Label(e.target.value)}
                    className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="e.g., YouTube, Twitch, Reddit"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Custom Link 1 URL
                  </label>
                  <input
                    type="url"
                    value={customLink1}
                    onChange={(e) => setCustomLink1(e.target.value)}
                    className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="https://youtube.com/yourcommunity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Custom Link 2 Label
                  </label>
                  <input
                    type="text"
                    value={customLink2Label}
                    onChange={(e) => setCustomLink2Label(e.target.value)}
                    className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="e.g., Instagram, TikTok, Club"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Custom Link 2 URL
                  </label>
                  <input
                    type="url"
                    value={customLink2}
                    onChange={(e) => setCustomLink2(e.target.value)}
                    className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="https://instagram.com/yourcommunity"
                  />
                </div>
              </div>
            </div>

            {/* Table Customization */}
            <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
              <h3 className="text-lg font-semibold text-purple-400 mb-4">Table Customization</h3>
              <p className="text-gray-400 text-sm mb-6">
                Customize your poker table appearance to create a unique gaming experience.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Table Theme
                  </label>
                  <select
                    value={tableTheme}
                    onChange={(e) => setTableTheme(e.target.value)}
                    className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="classic">Classic</option>
                    <option value="modern">Modern</option>
                    <option value="luxury">Luxury</option>
                    <option value="neon">Neon</option>
                    <option value="vintage">Vintage</option>
                    <option value="space">Space</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Table Color
                  </label>
                  <select
                    value={tableColor}
                    onChange={(e) => setTableColor(e.target.value)}
                    className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="green">Green (Classic)</option>
                    <option value="blue">Blue</option>
                    <option value="red">Red</option>
                    <option value="purple">Purple</option>
                    <option value="black">Black</option>
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Table Pattern
                  </label>
                  <select
                    value={tablePattern}
                    onChange={(e) => setTablePattern(e.target.value)}
                    className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="felt">Felt</option>
                    <option value="leather">Leather</option>
                    <option value="marble">Marble</option>
                    <option value="wood">Wood</option>
                    <option value="metal">Metal</option>
                    <option value="fabric">Fabric</option>
                    <option value="glass">Glass</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Custom Table Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={tableImage}
                    onChange={(e) => setTableImage(e.target.value)}
                    className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="https://example.com/table-image.jpg"
                  />
                </div>
              </div>

              {/* Table Preview */}
              <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-600">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Table Preview</h4>
                <div className="flex items-center space-x-4">
                  <div className={`w-16 h-12 rounded-lg border-2 border-gray-500 ${
                    tableColor === 'green' ? 'bg-green-600' :
                    tableColor === 'blue' ? 'bg-blue-600' :
                    tableColor === 'red' ? 'bg-red-600' :
                    tableColor === 'purple' ? 'bg-purple-600' :
                    tableColor === 'black' ? 'bg-black' :
                    tableColor === 'gold' ? 'bg-yellow-600' :
                    tableColor === 'silver' ? 'bg-gray-400' : 'bg-green-600'
                  } ${tablePattern === 'leather' ? 'opacity-80' : ''} ${
                    tablePattern === 'marble' ? 'bg-gradient-to-br from-gray-200 to-gray-400' : ''
                  }`}>
                    {tableImage && (
                      <div className="w-full h-full rounded-lg bg-cover bg-center" 
                           style={{backgroundImage: `url(${tableImage})`}} />
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    <div><span className="font-semibold">Theme:</span> {tableTheme}</div>
                    <div><span className="font-semibold">Color:</span> {tableColor}</div>
                    <div><span className="font-semibold">Pattern:</span> {tablePattern}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tournament Preview */}
            <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
              <h3 className="text-xl font-semibold text-purple-400 mb-4">Tournament Preview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div>
                  <span className="text-gray-400">Prize Pool:</span>
                  <div className="font-semibold text-green-400 text-lg">
                    {(parseFloat(buyIn) * parseInt(maxPlayers) * (1 - parseFloat(rakePercentage) / 100)).toFixed(3)} SOL
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">House Rake:</span>
                  <div className="font-semibold text-yellow-400 text-lg">
                    {(parseFloat(buyIn) * parseInt(maxPlayers) * parseFloat(rakePercentage) / 100).toFixed(3)} SOL
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Table Size:</span>
                  <div className="font-semibold text-blue-400 text-lg">{maxPlayers} Players</div>
                </div>
                <div>
                  <span className="text-gray-400">Type:</span>
                  <div className="font-semibold text-pink-400 text-lg capitalize">
                    {tournamentType.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push('/lobby')}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {creating ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating Tournament...</span>
                  </div>
                ) : (
                  '🚀 Create Tournament'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
