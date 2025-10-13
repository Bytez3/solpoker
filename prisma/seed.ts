import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Check if any users exist
  const userCount = await prisma.user.count();
  
  if (userCount === 0) {
    console.log('⚠️  No users found. Please connect a wallet first, then run this seed again.');
    console.log('   1. Run: npm run dev');
    console.log('   2. Open http://localhost:3000');
    console.log('   3. Connect your wallet');
    console.log('   4. Then run: npm run db:seed');
    return;
  }

  // Get first user and make them admin
  const firstUser = await prisma.user.findFirst();
  
  if (!firstUser) {
    console.log('⚠️  No users found');
    return;
  }

  // Update user to be admin
  const adminUser = await prisma.user.update({
    where: { id: firstUser.id },
    data: { isAdmin: true },
  });

  console.log(`✅ Made user ${adminUser.walletAddress.slice(0, 8)}... an admin`);

  // Check if tournaments already exist
  const existingTournaments = await prisma.tournament.count();
  
  if (existingTournaments > 0) {
    console.log(`ℹ️  Found ${existingTournaments} existing tournaments. Skipping tournament creation.`);
    console.log('   To reset: npx prisma migrate reset');
    return;
  }

  // Create sample tournaments
  const tournaments = [
    {
      name: 'Quick Play Tournament',
      buyIn: 0.01,
      rakePercentage: 5,
    },
    {
      name: 'Medium Stakes',
      buyIn: 0.05,
      rakePercentage: 5,
    },
    {
      name: 'High Roller',
      buyIn: 0.1,
      rakePercentage: 3,
    },
  ];

  for (const tournament of tournaments) {
    const created = await prisma.tournament.create({
      data: {
        name: tournament.name,
        buyIn: tournament.buyIn,
        rakePercentage: tournament.rakePercentage,
        status: 'WAITING',
        createdById: adminUser.id,
        escrowAddress: `demo_escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
    });
    
    console.log(`✅ Created tournament: ${created.name} (${created.buyIn} SOL buy-in)`);
  }

  console.log('\n🎉 Seeding complete!');
  console.log('📝 Next steps:');
  console.log('   1. Go to http://localhost:3000/lobby');
  console.log('   2. You should see 3 tournaments ready to join');
  console.log('   3. Join a tournament and test the game!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

