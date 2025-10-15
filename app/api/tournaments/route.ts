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
    
    type TournamentStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    const where = status ? { status: status as TournamentStatus } : {};
    
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
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Allow any authenticated user to create tournaments (community feature)
    // Admin users get additional privileges but regular users can also create
    
    const body = await request.json();
    const { 
      name, 
      buyIn, 
      rakePercentage, 
      maxPlayers = 6,
      tournamentType = 'sit_n_go',
      privacy = 'public',
      blindStructure = 'progressive',
      tokenType = 'SOL',
      tokenMint = null,
      tokenDecimals = 9,
      escrowAddress 
    } = body;
    
    if (!name || buyIn === undefined || rakePercentage === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (maxPlayers < 2 || maxPlayers > 10) {
      return NextResponse.json(
        { error: 'Max players must be between 2 and 10' },
        { status: 400 }
      );
    }
    
    if (rakePercentage < 0 || rakePercentage > 10) {
      return NextResponse.json(
        { error: 'Rake percentage must be between 0 and 10' },
        { status: 400 }
      );
    }
    
    // Validate token type
    if (tokenType !== 'SOL' && tokenType !== 'SPL') {
      return NextResponse.json(
        { error: 'Token type must be SOL or SPL' },
        { status: 400 }
      );
    }
    
    // Validate SPL token requirements
    if (tokenType === 'SPL') {
      if (!tokenMint) {
        return NextResponse.json(
          { error: 'Token mint address required for SPL tokens' },
          { status: 400 }
        );
      }
      if (!tokenDecimals || tokenDecimals < 0 || tokenDecimals > 9) {
        return NextResponse.json(
          { error: 'Token decimals must be between 0 and 9' },
          { status: 400 }
        );
      }
    }
    
    const tournament = await prisma.tournament.create({
      data: {
        name,
        buyIn: new Decimal(buyIn),
        rakePercentage: new Decimal(rakePercentage),
        maxPlayers,
        tournamentType,
        privacy,
        blindStructure,
        tokenType,
        tokenMint,
        tokenDecimals,
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

