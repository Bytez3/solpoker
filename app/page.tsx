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
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Hero Section */}
        <div className="text-center space-y-8 max-w-5xl mx-auto">
          {/* Main Title with enhanced styling */}
          <div className="space-y-6 animate-fade-in">
            <div className="inline-block">
              <h1 className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 animate-gradient mb-4">
                Solana Poker
              </h1>
              <div className="h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full"></div>
            </div>
            
                <p className="text-2xl md:text-3xl font-light text-gray-300 tracking-wide">
                  Decentralized PvP Texas Hold&apos;em
                </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Play poker on the blockchain with instant payouts and provably fair gameplay
            </p>
          </div>

              {/* Call to Action */}
              <div className="space-y-6 py-8">
                <div className="flex flex-col items-center gap-4">
                  {!mounted ? (
                    <div className="h-16 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    </div>
                  ) : !connected ? (
                    <>
                      <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 hover:!from-purple-700 hover:!to-pink-700 !transition-all !duration-300 !shadow-lg !shadow-purple-500/50 hover:!shadow-xl hover:!shadow-purple-500/70 !text-lg !px-8 !py-4 !rounded-xl !font-bold" />
                      <p className="text-sm text-gray-500">
                        Step 1: Connect your Phantom wallet
                      </p>
                    </>
                  ) : (
                    <>
                      {authenticating ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex items-center gap-2 text-purple-400">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                            <span>Waiting for signature...</span>
                          </div>
                          <p className="text-sm text-gray-500">Check your Phantom wallet popup</p>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={authenticateWallet}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-green-500/50 hover:shadow-xl hover:shadow-green-500/70 text-white text-lg px-12 py-4 rounded-xl font-bold"
                          >
                            Sign In to Play
                          </button>
                          <p className="text-sm text-gray-500">
                            Step 2: Sign the message to authenticate
                          </p>
                          <WalletMultiButton className="!bg-gray-700 hover:!bg-gray-600 !text-sm" />
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

          {/* Feature Cards with improved design */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="group bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm p-8 rounded-2xl border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🎮</div>
              <h3 className="text-2xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
                6-Player Tables
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Fast-paced tournament action with exactly 6 players per table for optimal gameplay
              </p>
            </div>

            <div className="group bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm p-8 rounded-2xl border border-pink-500/20 hover:border-pink-500/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-xl hover:shadow-pink-500/20">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">⚡</div>
              <h3 className="text-2xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-pink-600">
                Instant Payouts
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Winners receive SOL directly to their wallet via smart contract—no waiting
              </p>
            </div>

            <div className="group bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm p-8 rounded-2xl border border-blue-500/20 hover:border-blue-500/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🔒</div>
              <h3 className="text-2xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                Provably Fair
              </h3>
              <p className="text-gray-400 leading-relaxed">
                All buy-ins held in escrow with transparent rake structure on-chain
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-16 pt-12 border-t border-gray-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">6</div>
                <div className="text-sm text-gray-500">Max Players</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-400 mb-2">5%</div>
                <div className="text-sm text-gray-500">House Rake</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">24/7</div>
                <div className="text-sm text-gray-500">Always Online</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">SOL</div>
                <div className="text-sm text-gray-500">Devnet</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
