# 🎮 Start Here - Demo Mode Setup

Welcome! This guide will get you running the Solana Poker app in **5 minutes** without deploying any blockchain code.

## What You'll Get

- ✅ Full poker game with 6 players
- ✅ Complete tournament system
- ✅ Admin dashboard
- ✅ All game logic working
- ❌ No real blockchain (demo mode)

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
# Create PostgreSQL database
createdb poker_db

# Create .env file
echo 'NEXT_PUBLIC_DEMO_MODE=true
DATABASE_URL="postgresql://localhost:5432/poker_db"
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.devnet.solana.com"
NEXT_PUBLIC_POKER_PROGRAM_ID="Demo11111111111111111111111111111111111"
ADMIN_WALLET_ADDRESS="DemoAdmin111111111111111111111111111111"
JWT_SECRET="demo-secret"
NEXTAUTH_SECRET="demo-secret"
NEXTAUTH_URL="http://localhost:3000"' > .env

# Run migrations
npm run db:migrate
```

### 3. Run the App
```bash
npm run dev
```

### 4. Open Browser
Go to http://localhost:3000

### 5. Connect Wallet
Click "Connect Wallet" and select your Solana wallet (Phantom recommended)

### 6. Make Yourself Admin
```bash
# Open database GUI
npm run db:studio

# In the "users" table, find your user
# Set "is_admin" to true
# Save
```

### 7. Create a Tournament
- Go to http://localhost:3000/admin
- Fill in tournament details
- Click "Create Tournament"

### 8. Test with Multiple Players
- Open 6 different browser tabs (or browsers)
- Connect different wallets in each
- Join the tournament from each tab
- Game starts automatically when 6 players join!

## What's Working?

Everything! The only difference from production is:
- No real SOL transactions
- Mock transaction signatures
- Database-only state (not on blockchain)

## Next Steps

Read these docs to learn more:
- **DEMO_MODE.md** - Complete demo mode guide
- **QUICKSTART.md** - Full setup instructions
- **README.md** - Complete documentation
- **IMPLEMENTATION_STATUS.md** - What's implemented

## Need Help?

Common issues:

**"Cannot connect to database"**
```bash
# Make sure PostgreSQL is running
pg_ctl status

# Or start it
pg_ctl start
```

**"Please authenticate your wallet first"**
- Refresh the page
- Try disconnecting and reconnecting wallet
- Clear browser cache

**"Tournament not found"**
- Make sure you created a tournament from /admin
- Check database with: `npm run db:studio`

## Ready for Real Blockchain?

When you want to use actual Solana transactions:

1. Set `NEXT_PUBLIC_DEMO_MODE=false` in .env
2. Deploy the smart contract (see QUICKSTART.md)
3. Update NEXT_PUBLIC_POKER_PROGRAM_ID
4. Test on devnet with airdropped SOL

---

**Have fun building! 🚀🎰**

