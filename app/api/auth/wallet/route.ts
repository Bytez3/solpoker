import { NextRequest, NextResponse } from 'next/server';
import { authenticateWallet, generateAuthMessage } from '@/lib/auth/wallet-auth';

/**
 * GET /api/auth/wallet?address=xxx
 * Generate authentication message for wallet to sign
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  // Support both 'address' and 'walletAddress' params for compatibility
  const walletAddress = searchParams.get('walletAddress') || searchParams.get('address');
  
  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Wallet address required' },
      { status: 400 }
    );
  }
  
  const message = generateAuthMessage(walletAddress);
  
  return NextResponse.json({ message });
}

/**
 * POST /api/auth/wallet
 * Verify signature and issue JWT token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, signature, message } = body;
    
    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const result = await authenticateWallet(walletAddress, signature, message);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Invalid signature or expired message' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      token: result.token,
      user: {
        id: result.user.id,
        walletAddress: result.user.walletAddress,
        username: result.user.username,
        isAdmin: result.user.isAdmin,
      },
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

