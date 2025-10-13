import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromToken, extractToken } from '@/lib/auth/wallet-auth';
import { tournamentManager } from '@/lib/tournament-manager';

/**
 * POST /api/tournaments/[id]/join
 * Join a tournament (after successful Solana transaction)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const { transactionSignature } = body;
    
    if (!transactionSignature) {
      return NextResponse.json(
        { error: 'Transaction signature required' },
        { status: 400 }
      );
    }
    
    // Get tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        players: true,
      },
    });
    
    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }
    
    if (tournament.status !== 'WAITING') {
      return NextResponse.json(
        { error: 'Tournament is not accepting players' },
        { status: 400 }
      );
    }
    
    if (tournament.players.length >= tournament.maxPlayers) {
      return NextResponse.json(
        { error: 'Tournament is full' },
        { status: 400 }
      );
    }
    
    // Check if player already joined
    const existingPlayer = tournament.players.find(p => p.userId === user.id);
    if (existingPlayer) {
      return NextResponse.json(
        { error: 'Already joined this tournament' },
        { status: 400 }
      );
    }
    
    // Add player to tournament
    const tournamentPlayer = await prisma.tournamentPlayer.create({
      data: {
        tournamentId: id,
        userId: user.id,
        buyInTx: transactionSignature,
        status: 'JOINED',
      },
      include: {
        user: {
          select: {
            id: true,
            walletAddress: true,
            username: true,
          },
        },
      },
    });
    
    // Check if tournament is ready to start (6 players)
    const isReady = await tournamentManager.isTournamentReady(id);
    
    if (isReady) {
      // Start the tournament
      try {
        await tournamentManager.startTournament(id);
        
        return NextResponse.json({
          tournamentPlayer,
          tournamentStarted: true,
          message: 'Tournament is starting!',
        });
      } catch (error) {
        console.error('Error starting tournament:', error);
        // Player joined but tournament failed to start
        return NextResponse.json({
          tournamentPlayer,
          tournamentStarted: false,
          error: 'Failed to start tournament',
        });
      }
    }
    
    return NextResponse.json({
      tournamentPlayer,
      tournamentStarted: false,
      playersJoined: tournament.players.length + 1,
      playersNeeded: tournament.maxPlayers - tournament.players.length - 1,
    });
  } catch (error) {
    console.error('Error joining tournament:', error);
    return NextResponse.json(
      { error: 'Failed to join tournament' },
      { status: 500 }
    );
  }
}

