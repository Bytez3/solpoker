import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromToken, extractToken } from '@/lib/auth/wallet-auth';

/**
 * POST /api/tournaments/[id]/withdraw-rake
 * Tournament creator withdraws collected rake
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
    
    // Get tournament and verify creator
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdById: true,
        creatorRakeCollected: true,
        creatorRakeWithdrawn: true,
        tokenType: true,
        tokenMint: true,
        status: true,
      },
    });
    
    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }
    
    // Verify creator
    if (tournament.createdById !== user.id) {
      return NextResponse.json(
        { error: 'Only tournament creator can withdraw rake' },
        { status: 403 }
      );
    }
    
    // Calculate available rake
    const availableRake = tournament.creatorRakeCollected.sub(tournament.creatorRakeWithdrawn);
    
    if (availableRake.lte(0)) {
      return NextResponse.json(
        { error: 'No rake available to withdraw' },
        { status: 400 }
      );
    }
    
    // TODO: Implement actual Solana transaction for rake withdrawal
    // For now, we'll simulate the withdrawal by updating the database
    
    // Update tournament with withdrawn rake
    const updatedTournament = await prisma.tournament.update({
      where: { id },
      data: {
        creatorRakeWithdrawn: tournament.creatorRakeWithdrawn.add(availableRake),
      },
      select: {
        id: true,
        name: true,
        creatorRakeCollected: true,
        creatorRakeWithdrawn: true,
        tokenType: true,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: `Successfully withdrew ${availableRake.toString()} ${tournament.tokenType} rake`,
      tournament: updatedTournament,
      withdrawnAmount: availableRake.toString(),
      tokenType: tournament.tokenType,
    });
    
  } catch (error) {
    console.error('Error withdrawing rake:', error);
    return NextResponse.json(
      { error: 'Failed to withdraw rake' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tournaments/[id]/rake-info
 * Get rake information for a tournament
 */
export async function GET(
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
    
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdById: true,
        creatorRakeCollected: true,
        creatorRakeWithdrawn: true,
        tokenType: true,
        tokenMint: true,
        status: true,
      },
    });
    
    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }
    
    // Calculate available rake
    const availableRake = tournament.creatorRakeCollected.sub(tournament.creatorRakeWithdrawn);
    
    return NextResponse.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        tokenType: tournament.tokenType,
        tokenMint: tournament.tokenMint,
        status: tournament.status,
      },
      rakeInfo: {
        totalCollected: tournament.creatorRakeCollected.toString(),
        totalWithdrawn: tournament.creatorRakeWithdrawn.toString(),
        availableToWithdraw: availableRake.toString(),
        canWithdraw: availableRake.gt(0),
        isCreator: tournament.createdById === user.id,
      },
    });
    
  } catch (error) {
    console.error('Error fetching rake info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rake information' },
      { status: 500 }
    );
  }
}

