'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import bs58 from 'bs58';

export default function Home() {
  const { connected, publicKey, signMessage } = useWallet();
  const router = useRouter();
  const [authenticating, setAuthenticating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Check if already authenticated and redirect
    if (mounted && connected && publicKey) {
      const existingToken = localStorage.getItem('poker_token');
      if (existingToken) {
        router.push('/lobby');
      }
    }
  }, [mounted, connected, publicKey, router]);

  const authenticateWallet = async () => {
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

      // Sign message - Phantom will show a popup
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
        router.push('/lobby');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation Header */}
      <nav className="relative z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">♠</span>
                </div>
                <span className="text-xl font-bold text-white">Solana Poker League</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-6">
                <a href="#tournaments" className="text-slate-300 hover:text-white transition-colors">Tournaments</a>
                <a href="#leaderboard" className="text-slate-300 hover:text-white transition-colors">Leaderboard</a>
                <a href="#rules" className="text-slate-300 hover:text-white transition-colors">Rules</a>
              </div>
              {mounted && (
                <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 hover:!from-purple-700 hover:!to-pink-700 !transition-all !duration-300 !shadow-lg !shadow-purple-500/50 hover:!shadow-xl hover:!shadow-purple-500/70 !text-sm !px-6 !py-2 !rounded-lg !font-semibold" />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl animate-pulse delay-2000"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            {/* Main Title */}
            <div className="mb-8">
              <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 mb-4">
                Solana Poker League
              </h1>
              <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full w-32 mx-auto mb-6"></div>
              <p className="text-2xl md:text-3xl font-light text-slate-300 mb-4">
                The Ultimate Decentralized Poker Experience
              </p>
              <p className="text-lg text-slate-400 max-w-3xl mx-auto">
                Join the world's most advanced blockchain poker platform. Compete in tournaments, climb the leaderboard, and win real SOL prizes.
              </p>
            </div>

            {/* CTA Section */}
            <div className="mb-16">
              {!mounted ? (
                <div className="h-20 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
                  <span className="ml-4 text-lg text-slate-400">Loading...</span>
                </div>
              ) : !connected ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-slate-700/50 backdrop-blur-sm max-w-md mx-auto">
                    <div className="text-6xl mb-4">🎰</div>
                    <h3 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                      Ready to Compete?
                    </h3>
                    <p className="text-slate-400 mb-6">
                      Connect your wallet to join tournaments and start playing
                    </p>
                    <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 hover:!from-purple-700 hover:!to-pink-700 !transition-all !duration-300 !shadow-lg !shadow-purple-500/50 hover:!shadow-xl hover:!shadow-purple-500/70 !text-lg !px-8 !py-3 !rounded-xl !font-bold !w-full" />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {authenticating ? (
                    <div className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-2xl p-8 border border-green-500/20 backdrop-blur-sm max-w-md mx-auto">
                      <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                        <div>
                          <h3 className="text-xl font-bold text-green-400 mb-2">Authenticating...</h3>
                          <p className="text-slate-400">Check your Phantom wallet for the signature request</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-2xl p-8 border border-green-500/20 backdrop-blur-sm max-w-md mx-auto">
                      <div className="text-6xl mb-4">🎯</div>
                      <h3 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
                        Welcome Back!
                      </h3>
                      <p className="text-slate-400 mb-6">
                        Sign in to access tournaments and start competing
                      </p>
                      <button
                        onClick={authenticateWallet}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-green-500/50 hover:shadow-xl hover:shadow-green-500/70 text-white text-lg px-8 py-3 rounded-xl font-bold w-full"
                      >
                        🚀 Sign In to Play
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-400 mb-2">2,847</div>
                <div className="text-sm text-slate-500 uppercase tracking-wide">Active Players</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-pink-400 mb-2">156</div>
                <div className="text-sm text-slate-500 uppercase tracking-wide">Live Tournaments</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">12.5K</div>
                <div className="text-sm text-slate-500 uppercase tracking-wide">SOL Prize Pool</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400 mb-2">24/7</div>
                <div className="text-sm text-slate-500 uppercase tracking-wide">Always Online</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tournament Types Section */}
      <section id="tournaments" className="py-20 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
              Tournament Types
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Choose your preferred tournament style and compete for glory
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Sit & Go */}
            <div className="group bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20">
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">⚡</div>
              <h3 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
                Sit & Go
              </h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Fast-paced tournaments that start as soon as all seats are filled. Perfect for quick games and instant action.
              </p>
              <div className="space-y-2 text-sm text-slate-500">
                <div>• 2-10 players per table</div>
                <div>• Starts immediately when full</div>
                <div>• Multiple buy-in levels</div>
              </div>
            </div>

            {/* Scheduled */}
            <div className="group bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">📅</div>
              <h3 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                Scheduled
              </h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Pre-scheduled tournaments with guaranteed start times. Plan your poker sessions and compete at specific times.
              </p>
              <div className="space-y-2 text-sm text-slate-500">
                <div>• Fixed start times</div>
                <div>• Guaranteed prize pools</div>
                <div>• Advanced registration</div>
              </div>
            </div>

            {/* Bounty */}
            <div className="group bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 hover:border-red-500/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-red-500/20">
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">🎯</div>
              <h3 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                Bounty
              </h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Eliminate opponents to collect bounties! Each player has a bounty on their head - knock them out to claim it.
              </p>
              <div className="space-y-2 text-sm text-slate-500">
                <div>• Bounty on every player</div>
                <div>• Instant rewards for eliminations</div>
                <div>• High-action gameplay</div>
              </div>
            </div>

            {/* Rebuy */}
            <div className="group bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 hover:border-green-500/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20">
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">🔄</div>
              <h3 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600">
                Rebuy
              </h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Buy back in if you get eliminated! Extended tournaments with multiple chances to stay in the game.
              </p>
              <div className="space-y-2 text-sm text-slate-500">
                <div>• Rebuy opportunities</div>
                <div>• Extended gameplay</div>
                <div>• Larger prize pools</div>
              </div>
            </div>

            {/* Free Roll */}
            <div className="group bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 hover:border-yellow-500/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20">
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">🎁</div>
              <h3 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                Free Roll
              </h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Play for free and win real prizes! No buy-in required - perfect for beginners and practice sessions.
              </p>
              <div className="space-y-2 text-sm text-slate-500">
                <div>• No buy-in required</div>
                <div>• Real SOL prizes</div>
                <div>• Perfect for beginners</div>
              </div>
            </div>

            {/* Private */}
            <div className="group bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/20">
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">🔒</div>
              <h3 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600">
                Private
              </h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Create private tournaments for your friends and community. Control who can join and customize the rules.
              </p>
              <div className="space-y-2 text-sm text-slate-500">
                <div>• Invite-only tournaments</div>
                <div>• Custom rules and settings</div>
                <div>• Perfect for groups</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
              Why Choose Solana Poker League?
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Experience the future of online poker with cutting-edge blockchain technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-2xl p-8 border border-purple-500/20 group-hover:border-purple-500/40 transition-all duration-300">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">⚡</div>
                <h3 className="text-2xl font-bold text-purple-400 mb-4">Instant Payouts</h3>
                <p className="text-slate-400 leading-relaxed">
                  Winners receive SOL directly to their wallet instantly. No waiting, no intermediaries, just pure blockchain efficiency.
                </p>
              </div>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl p-8 border border-blue-500/20 group-hover:border-blue-500/40 transition-all duration-300">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">🔒</div>
                <h3 className="text-2xl font-bold text-blue-400 mb-4">Provably Fair</h3>
                <p className="text-slate-400 leading-relaxed">
                  All buy-ins held in smart contract escrow with transparent rake structure. Every transaction is verifiable on-chain.
                </p>
              </div>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-2xl p-8 border border-green-500/20 group-hover:border-green-500/40 transition-all duration-300">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">🌍</div>
                <h3 className="text-2xl font-bold text-green-400 mb-4">Global Access</h3>
                <p className="text-slate-400 leading-relaxed">
                  Play from anywhere in the world, 24/7. No geographical restrictions, no banking limitations - just pure poker.
                </p>
              </div>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-pink-600/20 to-pink-800/20 rounded-2xl p-8 border border-pink-500/20 group-hover:border-pink-500/40 transition-all duration-300">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">🎮</div>
                <h3 className="text-2xl font-bold text-pink-400 mb-4">Flexible Tables</h3>
                <p className="text-slate-400 leading-relaxed">
                  Choose from 2-10 player tables with customizable blind structures. Progressive, Turbo, Slow, or Hyper Turbo - your choice.
                </p>
              </div>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-2xl p-8 border border-yellow-500/20 group-hover:border-yellow-500/40 transition-all duration-300">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">💰</div>
                <h3 className="text-2xl font-bold text-yellow-400 mb-4">Fair Rake Split</h3>
                <p className="text-slate-400 leading-relaxed">
                  Tournament creators earn 70% of rake, platform keeps 30%. Transparent, fair, and incentivizes community growth.
                </p>
              </div>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-800/20 rounded-2xl p-8 border border-indigo-500/20 group-hover:border-indigo-500/40 transition-all duration-300">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">🚀</div>
                <h3 className="text-2xl font-bold text-indigo-400 mb-4">Solana Speed</h3>
                <p className="text-slate-400 leading-relaxed">
                  Built on Solana blockchain for lightning-fast transactions and minimal fees. Experience poker at blockchain speed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Play Section */}
      <section id="rules" className="py-20 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
              How to Play
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Master the art of decentralized Texas Hold'em in just a few simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-2xl p-8 border border-purple-500/20 group-hover:border-purple-500/40 transition-all duration-300">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">🎰</div>
                <h4 className="text-xl font-bold text-purple-400 mb-4">1. Join or Create</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Join existing tournaments or create your own with 2-10 players, custom blinds, and privacy settings
                </p>
              </div>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl p-8 border border-blue-500/20 group-hover:border-blue-500/40 transition-all duration-300">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">👥</div>
                <h4 className="text-xl font-bold text-blue-400 mb-4">2. Wait for Players</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  See your seat position and watch as other players join. Tournament starts automatically when full
                </p>
              </div>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-2xl p-8 border border-green-500/20 group-hover:border-green-500/40 transition-all duration-300">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">🃏</div>
                <h4 className="text-xl font-bold text-green-400 mb-4">3. Play Poker</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Receive your hole cards and take strategic betting actions: Fold, Check, Call, Raise, or All-in
                </p>
              </div>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-2xl p-8 border border-yellow-500/20 group-hover:border-yellow-500/40 transition-all duration-300">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">🏆</div>
                <h4 className="text-xl font-bold text-yellow-400 mb-4">4. Win Prizes</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Best hand wins the pot! Receive real SOL directly to your wallet with instant payouts
                </p>
              </div>
            </div>
          </div>

          {/* Poker Hand Rankings */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-3xl p-12 border border-slate-700/50 backdrop-blur-sm">
            <h3 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-8">
              Poker Hand Rankings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
                  <span className="text-2xl">👑</span>
                  <div>
                    <div className="font-bold text-purple-400">Royal Flush</div>
                    <div className="text-sm text-slate-400">A-K-Q-J-10 same suit</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <div className="font-bold text-blue-400">Straight Flush</div>
                    <div className="text-sm text-slate-400">5 cards same suit in sequence</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-green-900/20 rounded-lg border border-green-500/20">
                  <span className="text-2xl">💪</span>
                  <div>
                    <div className="font-bold text-green-400">Four of a Kind</div>
                    <div className="text-sm text-slate-400">4 cards of same rank</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/20">
                  <span className="text-2xl">🏠</span>
                  <div>
                    <div className="font-bold text-yellow-400">Full House</div>
                    <div className="text-sm text-slate-400">3 of a kind + pair</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-pink-900/20 rounded-lg border border-pink-500/20">
                  <span className="text-2xl">🎨</span>
                  <div>
                    <div className="font-bold text-pink-400">Flush</div>
                    <div className="text-sm text-slate-400">5 cards same suit</div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 bg-cyan-900/20 rounded-lg border border-cyan-500/20">
                  <span className="text-2xl">📏</span>
                  <div>
                    <div className="font-bold text-cyan-400">Straight</div>
                    <div className="text-sm text-slate-400">5 cards in sequence</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-indigo-900/20 rounded-lg border border-indigo-500/20">
                  <span className="text-2xl">🔺</span>
                  <div>
                    <div className="font-bold text-indigo-400">Three of a Kind</div>
                    <div className="text-sm text-slate-400">3 cards of same rank</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-orange-900/20 rounded-lg border border-orange-500/20">
                  <span className="text-2xl">⚖️</span>
                  <div>
                    <div className="font-bold text-orange-400">Two Pair</div>
                    <div className="text-sm text-slate-400">2 pairs of different ranks</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-red-900/20 rounded-lg border border-red-500/20">
                  <span className="text-2xl">👆</span>
                  <div>
                    <div className="font-bold text-red-400">One Pair</div>
                    <div className="text-sm text-slate-400">2 cards of same rank</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600/50">
                  <span className="text-2xl">🎴</span>
                  <div>
                    <div className="font-bold text-slate-400">High Card</div>
                    <div className="text-sm text-slate-500">Highest card wins</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">♠</span>
                </div>
                <span className="text-xl font-bold text-white">Solana Poker League</span>
              </div>
              <p className="text-slate-400 mb-4 max-w-md">
                The ultimate decentralized poker experience. Play Texas Hold'em tournaments, compete for real SOL prizes, and join the future of online poker.
              </p>
              <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 backdrop-blur-sm">
                <div className="text-xl animate-pulse">⚡</div>
                <div className="text-left">
                  <div className="text-green-400 font-semibold text-sm">Solana Devnet Active</div>
                  <div className="text-xs text-green-300">Real blockchain transactions enabled</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Tournaments</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Sit & Go</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Scheduled</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bounty</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Free Roll</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Support</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">How to Play</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Rules</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-700/50 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2024 Solana Poker League. Built on Solana blockchain for the future of poker.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
