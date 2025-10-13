import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, extractToken } from '@/lib/auth/wallet-auth';
import { tournamentManager } from '@/lib/tournament-manager';
import { PlayerAction } from '@/lib/poker-engine/types';

/**
 * POST /api/game/[tournamentId]/action
 * Process player action
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params;
  try {
    const token = extractToken(request.headers.get('authorization'));
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const user = await getUserFromToken(token);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { action, amount } = body;
    
    if (!action || !Object.values(PlayerAction).includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
    
    // Process action
    try {
      const gameState = await tournamentManager.processAction(
        tournamentId,
        user.id,
        action as PlayerAction,
        amount
      );
      
      return NextResponse.json({
        success: true,
        gameState,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid action';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}

