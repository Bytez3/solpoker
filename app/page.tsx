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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

        {/* Additional floating elements */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl animate-pulse delay-2000"></div>

        {/* Animated particles */}
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-purple-400/30 rounded-full animate-ping"></div>
        <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-pink-400/20 rounded-full animate-pulse delay-1500"></div>
        <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-blue-400/40 rounded-full animate-bounce delay-3000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Hero Section */}
        <div className="text-center space-y-8 max-w-5xl mx-auto">
          {/* Enhanced Main Title */}
          <div className="space-y-8 animate-fade-in">
            <div className="inline-block relative">
              <h1 className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 animate-gradient mb-4 relative">
                Solana Poker
                {/* Glowing effect behind title */}
                <div className="absolute inset-0 text-7xl md:text-8xl font-black text-purple-400/20 blur-sm animate-pulse">
                  Solana Poker
                </div>
              </h1>
              <div className="h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full animate-pulse"></div>
            </div>

            <div className="space-y-4">
              <p className="text-2xl md:text-3xl font-light text-gray-300 tracking-wide animate-fade-in delay-300">
                Decentralized PvP Texas Hold&apos;em
              </p>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto animate-fade-in delay-500">
                Play poker on the blockchain with instant payouts and provably fair gameplay
              </p>
            </div>
          </div>

              {/* Enhanced Call to Action */}
              <div className="space-y-8 py-12 animate-fade-in delay-700">
                <div className="flex flex-col items-center gap-6">
                  {!mounted ? (
                    <div className="h-20 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
                      <span className="ml-4 text-lg text-gray-400">Loading...</span>
                    </div>
                  ) : !connected ? (
                    <div className="text-center space-y-6">
                      <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-2xl p-8 border border-purple-500/20 backdrop-blur-sm">
                        <div className="text-6xl mb-4 animate-bounce">🎰</div>
                        <h3 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                          Ready to Play?
                        </h3>
                        <p className="text-gray-400 mb-6">
                          Connect your wallet to start playing decentralized poker
                        </p>
                        <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 hover:!from-purple-700 hover:!to-pink-700 !transition-all !duration-300 !shadow-lg !shadow-purple-500/50 hover:!shadow-xl hover:!shadow-purple-500/70 !text-lg !px-10 !py-4 !rounded-xl !font-bold" />
                      </div>
                      <p className="text-sm text-gray-500">
                        Step 1: Connect your Phantom wallet to get started
                      </p>
                    </div>
                  ) : (
                    <div className="text-center space-y-6">
                      {authenticating ? (
                        <div className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-2xl p-8 border border-green-500/20 backdrop-blur-sm">
                          <div className="flex flex-col items-center gap-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                            <div>
                              <h3 className="text-xl font-bold text-green-400 mb-2">Authenticating...</h3>
                              <p className="text-gray-400">Check your Phantom wallet for the signature request</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-2xl p-8 border border-green-500/20 backdrop-blur-sm">
                          <div className="text-6xl mb-4 animate-pulse">🎯</div>
                          <h3 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
                            Welcome Back!
                          </h3>
                          <p className="text-gray-400 mb-6">
                            Sign in to access tournaments and start playing
                          </p>
                          <button
                            onClick={authenticateWallet}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-green-500/50 hover:shadow-xl hover:shadow-green-500/70 text-white text-lg px-12 py-4 rounded-xl font-bold animate-pulse"
                          >
                            🚀 Sign In to Play
                          </button>
                          <p className="text-sm text-gray-500 mt-4">
                            Step 2: Sign the authentication message
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

          {/* Enhanced Feature Cards */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto animate-fade-in delay-1000">
            <div className="group bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm p-10 rounded-3xl border border-purple-500/20 hover:border-purple-500/60 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 hover:bg-gradient-to-br hover:from-purple-900/20 hover:to-gray-900/90">
              <div className="text-6xl mb-6 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 text-center">🎮</div>
              <h3 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600 group-hover:from-purple-300 group-hover:to-pink-400 transition-all duration-300">
                6-Player Tables
              </h3>
              <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                Fast-paced tournament action with exactly 6 players per table for optimal gameplay and strategy
              </p>
            </div>

            <div className="group bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm p-10 rounded-3xl border border-pink-500/20 hover:border-pink-500/60 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/20 hover:bg-gradient-to-br hover:from-pink-900/20 hover:to-gray-900/90">
              <div className="text-6xl mb-6 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 text-center animate-pulse">⚡</div>
              <h3 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-pink-600 group-hover:from-pink-300 group-hover:to-purple-400 transition-all duration-300">
                Instant Payouts
              </h3>
              <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                Winners receive SOL directly to their wallet via smart contract—no waiting, no intermediaries
              </p>
            </div>

            <div className="group bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm p-10 rounded-3xl border border-blue-500/20 hover:border-blue-500/60 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 hover:bg-gradient-to-br hover:from-blue-900/20 hover:to-gray-900/90">
              <div className="text-6xl mb-6 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 text-center">🔒</div>
              <h3 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 group-hover:from-blue-300 group-hover:to-cyan-400 transition-all duration-300">
                Provably Fair
              </h3>
              <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                All buy-ins held in escrow with transparent 5% rake structure—all verifiable on-chain
              </p>
            </div>
          </div>

          {/* Enhanced Stats Section */}
          <div className="mt-20 pt-16 border-t border-gray-800/50 animate-fade-in delay-1200">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
                Tournament Specifications
              </h3>
              <p className="text-gray-400 text-lg">
                Built for competitive play with fair economics
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              <div className="text-center group">
                <div className="relative mb-4">
                  <div className="text-4xl font-bold text-purple-400 mb-2 group-hover:scale-110 transition-transform duration-300">6</div>
                  <div className="absolute inset-0 bg-purple-400/10 rounded-full blur-xl group-hover:bg-purple-400/20 transition-all duration-300"></div>
                </div>
                <div className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Max Players</div>
                <div className="text-xs text-gray-600 mt-1">Optimal table size</div>
              </div>

              <div className="text-center group">
                <div className="relative mb-4">
                  <div className="text-4xl font-bold text-pink-400 mb-2 group-hover:scale-110 transition-transform duration-300">5%</div>
                  <div className="absolute inset-0 bg-pink-400/10 rounded-full blur-xl group-hover:bg-pink-400/20 transition-all duration-300"></div>
                </div>
                <div className="text-sm text-gray-500 uppercase tracking-wide font-semibold">House Rake</div>
                <div className="text-xs text-gray-600 mt-1">Sustainable platform</div>
              </div>

              <div className="text-center group">
                <div className="relative mb-4">
                  <div className="text-4xl font-bold text-blue-400 mb-2 group-hover:scale-110 transition-transform duration-300">24/7</div>
                  <div className="absolute inset-0 bg-blue-400/10 rounded-full blur-xl group-hover:bg-blue-400/20 transition-all duration-300"></div>
                </div>
                <div className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Always Online</div>
                <div className="text-xs text-gray-600 mt-1">Global accessibility</div>
              </div>

              <div className="text-center group">
                <div className="relative mb-4">
                  <div className="text-4xl font-bold text-green-400 mb-2 group-hover:scale-110 transition-transform duration-300">SOL</div>
                  <div className="absolute inset-0 bg-green-400/10 rounded-full blur-xl group-hover:bg-green-400/20 transition-all duration-300"></div>
                </div>
                <div className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Solana Devnet</div>
                <div className="text-xs text-gray-600 mt-1">Test environment</div>
              </div>
            </div>

            {/* Demo Mode Notice */}
            <div className="mt-16 text-center">
              <div className="inline-flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-6 py-3 backdrop-blur-sm">
                <div className="text-2xl animate-spin">🎮</div>
                <div className="text-left">
                  <div className="text-yellow-400 font-semibold">Demo Mode Active</div>
                  <div className="text-sm text-yellow-300">Test all features without real SOL</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
