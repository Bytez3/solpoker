import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, extractToken } from '@/lib/auth/wallet-auth';
import { tournamentManager } from '@/lib/tournament-manager';
import { sanitizeGameStateForPlayer } from '@/lib/poker-engine/game-state';

/**
 * GET /api/game/[tournamentId]/state
 * Get current game state
 */
export async function GET(
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
    
    const gameState = tournamentManager.getGameState(tournamentId);
    
    if (!gameState) {
      return NextResponse.json(
        { error: 'Game not found or not started' },
        { status: 404 }
      );
    }
    
    // Sanitize game state for this player (hide other players' cards)
    const sanitized = sanitizeGameStateForPlayer(gameState, user.id);
    
    return NextResponse.json({ gameState: sanitized });
  } catch (error) {
    console.error('Error fetching game state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game state' },
      { status: 500 }
    );
  }
}

