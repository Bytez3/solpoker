# Quick Start Guide

## 🎮 Recommended: Start with Demo Mode

**Demo Mode lets you run the entire application WITHOUT deploying the Solana smart contract!**

Perfect for:
- Building and testing features quickly
- UI/UX development
- Understanding how the app works
- Running full 6-player tournaments locally

See **[DEMO_MODE.md](./DEMO_MODE.md)** for complete demo mode documentation.

## Prerequisites Checklist

### For Demo Mode (Recommended First)
- [ ] Node.js 18+ installed
- [ ] PostgreSQL database running
- [ ] Phantom or Solflare wallet installed

### For Production Mode (Later)
- [ ] Solana CLI tools installed
- [ ] Rust & Anchor installed
- [ ] SOL for deployment

## ⚡ 5-Minute Demo Mode Setup

If you want to test the app without deploying the Solana program first, follow these steps:

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

```bash
# Create PostgreSQL database
createdb poker_db

# Create .env file with DEMO MODE enabled
cat > .env << EOF
# Enable Demo Mode (no blockchain required!)
NEXT_PUBLIC_DEMO_MODE=true

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/poker_db"

# Solana (not used in demo mode, but required)
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.devnet.solana.com"
NEXT_PUBLIC_POKER_PROGRAM_ID="PokerEsc1111111111111111111111111111111111111"

# Admin
ADMIN_WALLET_ADDRESS="YOUR_WALLET_ADDRESS_HERE"

# JWT
JWT_SECRET="demo-secret-key"
NEXTAUTH_SECRET="demo-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
EOF

# Run migrations
npm run db:migrate
npm run db:generate
```

### 3. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 4. Connect Wallet and Authenticate

1. Click "Connect Wallet" on home page
2. Select your wallet (Phantom/Solflare)
3. Approve connection
4. You'll be redirected to the lobby

### 5. Make Yourself Admin

```bash
# Open Prisma Studio
npm run db:studio

# In the Users table, find your user (by wallet address)
# Edit the row and set is_admin to true
# Save
```

### 6. Create a Tournament

1. Navigate to http://localhost:3000/admin
2. Fill in tournament details:
   - Name: "Test Tournament"
   - Buy-in: 0.1 SOL
   - Rake: 5%
3. Click "Create Tournament"

**Note**: In demo mode, no blockchain transactions occur. Mock signatures are used instead. This is perfect for development!

**To disable demo mode later**: Set `NEXT_PUBLIC_DEMO_MODE=false` in `.env` and follow the "Complete Setup" section below.

---

## Complete Setup (With Solana Program)

### 1. Deploy Solana Program

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Create Solana wallet (if you don't have one)
solana-keygen new

# Configure CLI to use devnet
solana config set --url https://api.devnet.solana.com

# Airdrop SOL for deployment
solana airdrop 2

# Build and deploy
cd solana-program
anchor build
anchor deploy

# Copy the program ID from the output
# Update declare_id! in programs/poker-escrow/src/lib.rs
# Update NEXT_PUBLIC_POKER_PROGRAM_ID in .env
# Rebuild and redeploy
anchor build
anchor deploy
```

### 2. Update Environment Variables

Update `.env` with your deployed program ID:

```env
NEXT_PUBLIC_POKER_PROGRAM_ID="<YOUR_ACTUAL_PROGRAM_ID>"
```

### 3. Initialize Admin Config (One-Time)

```bash
# From the poker-next directory
# Run this script to initialize the admin config on-chain
# (You'll need to create this script or do it manually via Anchor)
```

---

## Testing the Full Flow

### Scenario: 6 Players Join a Tournament

1. **Admin creates tournament**:
   - Go to /admin
   - Create tournament with 0.01 SOL buy-in (for testing)

2. **Open 6 browser windows** (or use 6 different wallets):
   - Window 1-6: Connect different wallets
   - Each wallet needs ~0.02 SOL (buy-in + gas)

3. **Join tournament** from each window:
   - Each player clicks "Join Tournament" in lobby
   - Approve Solana transaction
   - Wait for 6/6 players

4. **Game auto-starts**:
   - All 6 players are redirected to game page
   - Poker table is displayed with all players

5. **Play poker**:
   - Each player takes turns
   - Use action buttons: Fold, Check, Call, Raise, All-In
   - Continue until one player has all chips

6. **Winner receives payout**:
   - Smart contract automatically distributes prize
   - Admin can withdraw rake

---

## Common Issues

### "Cannot connect to database"
- Ensure PostgreSQL is running: `pg_ctl status`
- Check DATABASE_URL in .env is correct
- Try: `psql -d poker_db` to test connection

### "Program not found"
- Verify NEXT_PUBLIC_POKER_PROGRAM_ID matches deployed program
- Check Solana cluster: `solana config get`
- Ensure program is deployed: `solana program show <PROGRAM_ID>`

### "Insufficient funds"
- Airdrop SOL to test wallet: `solana airdrop 1`
- Or use devnet faucet: https://faucet.solana.com/

### "Transaction failed"
- Check wallet has enough SOL for buy-in + fees
- Verify you're on correct network (devnet/mainnet)
- Check Solana network status: https://status.solana.com/

### "Not your turn" error in game
- Refresh page to sync game state
- Check currentPlayerSeat in database
- Ensure WebSocket/polling is working

---

## Development Tips

### View Database

```bash
npm run db:studio
```

### Reset Database

```bash
npx prisma migrate reset
npm run db:generate
```

### Check Logs

```bash
# Next.js logs
npm run dev

# Solana program logs
solana logs <PROGRAM_ID>
```

### Test Poker Engine

```bash
# Run unit tests (once implemented)
npm test
```

---

## Next Steps

After basic setup:

1. **Implement WebSocket server** for real-time updates
2. **Complete Solana integration** (replace mock transactions)
3. **Add comprehensive error handling**
4. **Implement player disconnection handling**
5. **Add UI polish** (card animations, sounds)
6. **Deploy to production** (Vercel + Supabase + Solana mainnet)

---

## Need Help?

- Check README.md for detailed documentation
- Review IMPLEMENTATION_STATUS.md for known limitations
- Check API endpoints in `app/api/` directories
- Review poker engine logic in `lib/poker-engine/`
- Inspect Solana program in `solana-program/programs/poker-escrow/src/lib.rs`

---

**Happy Coding! 🚀🎰**

