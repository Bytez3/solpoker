import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromToken, extractToken } from '@/lib/auth/wallet-auth';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * GET /api/tournaments
 * List all tournaments
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    
    const where = status ? { status: status as any } : {};
    
    const tournaments = await prisma.tournament.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json({ tournaments });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournaments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tournaments
 * Create a new tournament (admin only)
 */
export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const { name, buyIn, rakePercentage, escrowAddress } = body;
    
    if (!name || buyIn === undefined || rakePercentage === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (rakePercentage < 0 || rakePercentage > 10) {
      return NextResponse.json(
        { error: 'Rake percentage must be between 0 and 10' },
        { status: 400 }
      );
    }
    
    const tournament = await prisma.tournament.create({
      data: {
        name,
        buyIn: new Decimal(buyIn),
        rakePercentage: new Decimal(rakePercentage),
        escrowAddress,
        createdById: user.id,
        status: 'WAITING',
      },
      include: {
        createdBy: {
          select: {
            id: true,
            walletAddress: true,
            username: true,
          },
        },
      },
    });
    
    return NextResponse.json({ tournament }, { status: 201 });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    );
  }
}

