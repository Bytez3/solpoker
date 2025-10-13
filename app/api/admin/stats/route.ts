import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromToken, extractToken } from '@/lib/auth/wallet-auth';

/**
 * GET /api/admin/stats
 * Get admin statistics
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request.headers.get('authorization'));
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const user = await getUserFromToken(token);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Get tournament stats
    const totalTournaments = await prisma.tournament.count();
    const activeTournaments = await prisma.tournament.count({
      where: { status: 'IN_PROGRESS' },
    });
    const completedTournaments = await prisma.tournament.count({
      where: { status: 'COMPLETED' },
    });
    
    // Get player stats
    const totalPlayers = await prisma.user.count();
    
    // Calculate total rake collected
    const completedTournamentsData = await prisma.tournament.findMany({
      where: { status: 'COMPLETED' },
      select: {
        buyIn: true,
        rakePercentage: true,
        players: {
          select: { id: true },
        },
      },
    });
    
    let totalRakeCollected = 0;
    for (const tournament of completedTournamentsData) {
      const buyIn = typeof tournament.buyIn === 'number' 
        ? tournament.buyIn 
        : parseFloat(tournament.buyIn.toString());
      const rake = typeof tournament.rakePercentage === 'number'
        ? tournament.rakePercentage
        : parseFloat(tournament.rakePercentage.toString());
      
      const tournamentPot = buyIn * tournament.players.length;
      const rakeAmount = (tournamentPot * rake) / 100;
      totalRakeCollected += rakeAmount;
    }
    
    // Get recent tournaments
    const recentTournaments = await prisma.tournament.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                walletAddress: true,
              },
            },
          },
        },
      },
    });
    
    return NextResponse.json({
      stats: {
        totalTournaments,
        activeTournaments,
        completedTournaments,
        totalPlayers,
        totalRakeCollected,
      },
      recentTournaments,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

