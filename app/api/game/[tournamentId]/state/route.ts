import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, extractToken } from '@/lib/auth/wallet-auth';
import { tournamentManager } from '@/lib/tournament-manager';
import { sanitizeGameStateForPlayer } from '@/lib/poker-engine/game-state';
import { prisma } from '@/lib/db';

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
      // Game hasn't started yet, return tournament information with available seats
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          players: {
            include: {
              user: {
                select: {
                  id: true,
                  walletAddress: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      if (!tournament) {
        return NextResponse.json(
          { error: 'Tournament not found' },
          { status: 404 }
        );
      }

      // Return tournament info with seat availability
      return NextResponse.json({
        tournament,
        gameStarted: false,
        availableSeats: tournament.maxPlayers - tournament.players.length,
        playerSeat: tournament.players.findIndex(p => p.userId === user.id),
      });
    }

    // Sanitize game state for this player (hide other players' cards)
    const sanitized = sanitizeGameStateForPlayer(gameState, user.id);

    return NextResponse.json({
      gameState: sanitized,
      gameStarted: true
    });
  } catch (error) {
    console.error('Error fetching game state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game state' },
      { status: 500 }
    );
  }
}

