# Demo Mode Guide

## What is Demo Mode?

Demo Mode allows you to run and test the entire poker application **without deploying the Solana smart contract or using real blockchain transactions**. This is perfect for:

- **Development**: Build and test features faster without waiting for blockchain confirmations
- **Testing**: Run full game flows with multiple players without needing real SOL
- **UI/UX Development**: Focus on the interface without blockchain complexity
- **Learning**: Understand how the app works before diving into Solana integration

## 🚀 Quick Start with Demo Mode

### 1. Enable Demo Mode

Add this to your `.env` file:

```env
NEXT_PUBLIC_DEMO_MODE=true
```

### 2. Set Up Database

```bash
# Create database
createdb poker_db

# Run migrations
npm run db:migrate
npm run db:generate
```

### 3. Create Minimal .env

```env
# Demo Mode
NEXT_PUBLIC_DEMO_MODE=true

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/poker_db"

# JWT (any values work in demo mode)
JWT_SECRET="demo-secret"
NEXTAUTH_SECRET="demo-secret"
NEXTAUTH_URL="http://localhost:3000"

# Solana (not required but needs to be set)
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.devnet.solana.com"
NEXT_PUBLIC_POKER_PROGRAM_ID="PokerEsc1111111111111111111111111111111111111"
```

### 4. Run the App

```bash
npm run dev
```

Open http://localhost:3000

## ✨ What Works in Demo Mode

### ✅ Fully Functional
- **Wallet Connection**: Connect any Solana wallet (Phantom, Solflare, etc.)
- **Authentication**: Wallet signatures are automatically accepted
- **Tournament Creation**: Admin can create unlimited tournaments
- **Joining Tournaments**: Players can join without real SOL
- **Complete Game Flow**: Full Texas Hold'em gameplay
  - Card dealing
  - Betting rounds (fold, check, call, raise, all-in)
  - Hand evaluation
  - Winner determination
  - Chip distribution
- **Multiple Simultaneous Tournaments**: Run as many as you want
- **Admin Dashboard**: Full stats and management

### ⚠️ Simulated (Not Real Blockchain)
- **Transactions**: Mock signatures instead of real Solana transactions
- **Escrow**: No actual smart contract, balances tracked in database
- **Prize Distribution**: Happens automatically in database
- **Rake Collection**: Tracked in database, not on-chain

## 📝 Testing Workflow

### Scenario: Full 6-Player Tournament

1. **Create Admin User**
   ```bash
   npm run db:studio
   # In Prisma Studio, find your user and set is_admin = true
   ```

2. **Admin Creates Tournament**
   - Go to http://localhost:3000/admin
   - Create tournament with:
     - Name: "Test Tournament"
     - Buy-in: 0.01 SOL (doesn't matter in demo)
     - Rake: 5%

3. **Open 6 Browser Tabs** (or use different browsers/incognito)
   - Each tab connects a different wallet
   - Each joins the tournament
   - When 6th player joins, game auto-starts

4. **Play the Game**
   - Players take turns
   - Use fold, check, call, raise buttons
   - Continue until one player wins all chips

5. **View Results**
   - Winner's balance updated in database
   - Admin can see rake collected
   - Tournament marked as complete

## 🎮 Demo Mode Features

### Visual Indicators
- Yellow banner on all pages: "🎮 DEMO MODE"
- Console logs showing mock transactions
- No real wallet balance checks

### Mock Transaction Signatures
Format: `demo_tx_1234567890_abc123xyz`

These are accepted by the join tournament API and tracked in the database just like real transactions.

### Skip Signature Verification
Wallet signatures are automatically verified in demo mode, so you don't need to actually sign messages.

### No Gas Fees
Since nothing happens on-chain, there are no transaction fees or SOL requirements.

## 🔄 Switching to Production Mode

When you're ready to use the real Solana blockchain:

### 1. Deploy Smart Contract

```bash
cd solana-program
anchor build
anchor deploy --provider.cluster devnet
```

### 2. Update .env

```env
# Disable demo mode
NEXT_PUBLIC_DEMO_MODE=false

# Add your deployed program ID
NEXT_PUBLIC_POKER_PROGRAM_ID="<YOUR_ACTUAL_PROGRAM_ID>"

# Add real admin wallet
ADMIN_WALLET_ADDRESS="<YOUR_ADMIN_WALLET>"
```

### 3. Implement Real Transactions

Update `app/lobby/page.tsx` to replace the demo transaction code with actual Solana program calls using the SDK in `lib/solana/poker-program.ts`.

## 🐛 Troubleshooting Demo Mode

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
pg_ctl status

# Verify DATABASE_URL in .env
```

### "Please authenticate your wallet first"
- Check that you connected your wallet on the home page
- Wallet connection persists in browser
- Try refreshing the page

### "Tournament not found"
- Ensure tournament was created via admin dashboard
- Check Prisma Studio to verify tournament exists

### Game state not updating
- Refresh the page (polling-based in MVP)
- Check browser console for errors
- Verify tournament has started (6 players joined)

## 📊 Database Management in Demo Mode

### View Database
```bash
npm run db:studio
```

### Reset Everything
```bash
npx prisma migrate reset
npm run db:generate
```

### Manually Create Admin
```sql
psql -d poker_db
UPDATE users SET is_admin = true WHERE wallet_address = 'YOUR_WALLET_ADDRESS';
```

## 💡 Development Tips

### Test Multi-Player Scenarios
1. Use multiple browsers (Chrome, Firefox, Edge)
2. Use incognito/private windows
3. Each can connect a different wallet or same wallet

### Quick Tournament Creation
Create a script or seed file to auto-create tournaments:

```typescript
// prisma/seed.ts
import { prisma } from '../lib/db';

async function main() {
  await prisma.tournament.create({
    data: {
      name: "Quick Test Tournament",
      buyIn: 0.01,
      rakePercentage: 5,
      status: 'WAITING',
      createdById: 'YOUR_ADMIN_USER_ID',
    },
  });
}

main();
```

### Monitor Game State
Watch console logs for:
- Mock transaction signatures
- Game state transitions
- Player actions
- Winner determination

## 🎯 What to Build/Test in Demo Mode

### Priority 1: Core Features
- ✅ Tournament creation
- ✅ Player joining
- ✅ Game flow (betting rounds)
- ✅ Hand evaluation
- ✅ Winner determination

### Priority 2: UI/UX
- Polish poker table layout
- Add animations for cards
- Improve action buttons
- Add sound effects
- Player avatars

### Priority 3: Enhanced Features
- Chat system
- Tournament history
- Player statistics
- Multiple tournament types
- Different blind structures

## 🔒 Security Note

**Demo mode disables security features:**
- Signature verification skipped
- Transaction validation bypassed
- No on-chain verification

**Never use demo mode in production!**

## 🚀 When to Move Beyond Demo Mode

Move to production mode when:
1. Core game logic is tested and working
2. UI is polished and user-friendly
3. Ready to test real blockchain transactions
4. Smart contract is audited (for mainnet)
5. Have real SOL for testing (devnet airdrop)

## 📚 Additional Resources

- **QUICKSTART.md**: Full setup guide
- **README.md**: Complete project documentation
- **IMPLEMENTATION_STATUS.md**: What's done and what's next
- **PROJECT_SUMMARY.md**: Technical overview

---

**Remember**: Demo mode is for development only. Switch to production mode with real smart contracts before launching! 🚀

