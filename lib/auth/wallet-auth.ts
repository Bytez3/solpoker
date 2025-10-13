import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { DEMO_MODE, DEMO_CONFIG } from '../config/demo';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '7d'; // 7 days

export interface WalletAuthPayload {
  walletAddress: string;
  timestamp: number;
}

export interface JWTPayload {
  userId: string;
  walletAddress: string;
  isAdmin: boolean;
}

/**
 * Verify a wallet signature
 */
export async function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  message: string
): Promise<boolean> {
  // Skip verification in demo mode
  if (DEMO_MODE && DEMO_CONFIG.SKIP_SIGNATURE_VERIFICATION) {
    console.log('✅ Demo mode: Skipping signature verification');
    return true;
  }
  
  try {
    const publicKey = new PublicKey(walletAddress);
    const signatureBytes = bs58.decode(signature);
    const messageBytes = new TextEncoder().encode(message);
    
    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );
    
    return verified;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Generate authentication message for wallet to sign
 */
export function generateAuthMessage(walletAddress: string): string {
  const timestamp = Date.now();
  return `Sign this message to authenticate with Poker App\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`;
}

/**
 * Authenticate user with wallet signature
 */
export async function authenticateWallet(
  walletAddress: string,
  signature: string,
  message: string
): Promise<{ token: string; user: { id: string; walletAddress: string; username: string | null; isAdmin: boolean } } | null> {
  // Verify signature
  const isValid = await verifyWalletSignature(walletAddress, signature, message);
  
  if (!isValid) {
    return null;
  }
  
  // Check message timestamp (must be within 5 minutes)
  const timestampMatch = message.match(/Timestamp: (\d+)/);
  if (timestampMatch) {
    const messageTimestamp = parseInt(timestampMatch[1]);
    const now = Date.now();
    if (now - messageTimestamp > 5 * 60 * 1000) {
      // Message too old
      return null;
    }
  }
  
  // Find or create user
  let user = await prisma.user.findUnique({
    where: { walletAddress },
  });
  
  if (!user) {
    // Create new user
    user = await prisma.user.create({
      data: {
        walletAddress,
        username: `Player_${walletAddress.slice(0, 8)}`,
      },
    });
  }
  
  // Generate JWT
  const payload: JWTPayload = {
    userId: user.id,
    walletAddress: user.walletAddress,
    isAdmin: user.isAdmin,
  };
  
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  
  return { token, user };
}

/**
 * Verify JWT token
 */
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Get user from JWT token
 */
export async function getUserFromToken(token: string): Promise<{ id: string; walletAddress: string; username: string | null; isAdmin: boolean } | null> {
  const payload = verifyJWT(token);
  
  if (!payload) {
    return null;
  }
  
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });
  
  return user;
}

/**
 * Check if user is admin
 */
export async function isAdmin(walletAddress: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { walletAddress },
  });
  
  return user?.isAdmin || false;
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
}

