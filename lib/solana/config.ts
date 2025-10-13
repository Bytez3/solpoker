import { PublicKey, clusterApiUrl } from '@solana/web3.js';

export const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK as 'devnet' | 'mainnet-beta' | 'testnet' || 'devnet';
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK);
export const POKER_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_POKER_PROGRAM_ID || 'PokerEsc1111111111111111111111111111111111111');

// Admin wallet address (configured in env)
export const ADMIN_WALLET_ADDRESS = process.env.ADMIN_WALLET_ADDRESS || '';

export const COMMITMENT = 'confirmed';

