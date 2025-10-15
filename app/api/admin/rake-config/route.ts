import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromToken, extractToken } from '@/lib/auth/wallet-auth';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * GET /api/admin/rake-config
 * Get current rake distribution configuration
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
    
    // Get or create admin config
    let config = await prisma.adminConfig.findFirst({
      where: { key: 'rake_distribution' },
    });
    
    if (!config) {
      // Create default config
      config = await prisma.adminConfig.create({
        data: {
          key: 'rake_distribution',
          value: JSON.stringify({
            creatorRakePercentage: 70,
            adminRakePercentage: 30,
          }),
          creatorRakePercentage: new Decimal(70),
          adminRakePercentage: new Decimal(30),
        },
      });
    }
    
    const configData = JSON.parse(config.value);
    
    return NextResponse.json({
      creatorRakePercentage: config.creatorRakePercentage.toString(),
      adminRakePercentage: config.adminRakePercentage.toString(),
      totalRakeCollected: config.totalRakeCollected.toString(),
      totalCreatorRakePaid: config.totalCreatorRakePaid.toString(),
      totalAdminRakeCollected: config.totalAdminRakeCollected.toString(),
      config: configData,
    });
    
  } catch (error) {
    console.error('Error fetching rake config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rake configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/rake-config
 * Update rake distribution configuration
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
    const { creatorRakePercentage, adminRakePercentage } = body;
    
    // Validate percentages
    if (creatorRakePercentage < 0 || creatorRakePercentage > 100) {
      return NextResponse.json(
        { error: 'Creator rake percentage must be between 0 and 100' },
        { status: 400 }
      );
    }
    
    if (adminRakePercentage < 0 || adminRakePercentage > 100) {
      return NextResponse.json(
        { error: 'Admin rake percentage must be between 0 and 100' },
        { status: 400 }
      );
    }
    
    if (creatorRakePercentage + adminRakePercentage !== 100) {
      return NextResponse.json(
        { error: 'Creator and admin percentages must sum to 100%' },
        { status: 400 }
      );
    }
    
    // Update or create config
    const config = await prisma.adminConfig.upsert({
      where: { key: 'rake_distribution' },
      update: {
        value: JSON.stringify({
          creatorRakePercentage,
          adminRakePercentage,
        }),
        creatorRakePercentage: new Decimal(creatorRakePercentage),
        adminRakePercentage: new Decimal(adminRakePercentage),
      },
      create: {
        key: 'rake_distribution',
        value: JSON.stringify({
          creatorRakePercentage,
          adminRakePercentage,
        }),
        creatorRakePercentage: new Decimal(creatorRakePercentage),
        adminRakePercentage: new Decimal(adminRakePercentage),
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Rake distribution configuration updated successfully',
      config: {
        creatorRakePercentage: config.creatorRakePercentage.toString(),
        adminRakePercentage: config.adminRakePercentage.toString(),
      },
    });
    
  } catch (error) {
    console.error('Error updating rake config:', error);
    return NextResponse.json(
      { error: 'Failed to update rake configuration' },
      { status: 500 }
    );
  }
}

