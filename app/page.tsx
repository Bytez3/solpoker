'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();

  useEffect(() => {
    // Redirect to lobby if wallet is connected
    if (connected && publicKey) {
      router.push('/lobby');
    }
  }, [connected, publicKey, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="text-center space-y-8 px-4">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Solana Poker
          </h1>
          <p className="text-xl text-gray-300">
            Decentralized PvP Texas Hold'em Tournaments
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-gray-400">
            Connect your Solana wallet to start playing
          </p>
          <div className="flex justify-center">
            <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 transition-colors" />
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-2 text-purple-400">🎮 6-Player Tournaments</h3>
            <p className="text-gray-400">
              Fast-paced tournaments with exactly 6 players per table
            </p>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-2 text-pink-400">⚡ Instant Payouts</h3>
            <p className="text-gray-400">
              Winners receive SOL directly to their wallet via smart contract
            </p>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-2 text-blue-400">🔒 Provably Fair</h3>
            <p className="text-gray-400">
              All buy-ins held in escrow, transparent rake structure
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
