import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/tournaments/[id]
 * Get tournament details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
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
        createdBy: {
          select: {
            id: true,
            walletAddress: true,
            username: true,
          },
        },
        game: {
          include: {
            players: true,
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
    
    return NextResponse.json({ tournament });
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament' },
      { status: 500 }
    );
  }
}

