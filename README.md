# Solana Poker - Decentralized PvP Poker Tournaments

A fully decentralized poker platform built on Solana blockchain with Next.js, featuring 6-player Texas Hold'em tournaments with on-chain escrow and automatic prize distribution.

## Features

- **🎮 6-Player Tournaments**: Fast-paced sit-and-go tournaments with exactly 6 players per table
- **⚡ Instant Payouts**: Winners receive SOL directly to their wallet via Solana smart contract
- **🔒 Provably Fair**: All buy-ins held in escrow, transparent rake structure
- **👛 Wallet-Only Auth**: No passwords, just connect your Solana wallet
- **📊 Admin Dashboard**: Create tournaments, configure rake, view statistics
- **🎯 Real-Time Gameplay**: Live updates for all players at the table

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Blockchain**: Solana (Anchor framework)
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: Solana wallet signatures + JWT
- **Styling**: Tailwind CSS + shadcn/ui components
- **Wallet Integration**: @solana/wallet-adapter-react (Phantom, Solflare, Torus)

## Project Structure

```
solpoker/
├── app/                          # Next.js app router
│   ├── page.tsx                  # Home page (wallet connection)
│   ├── lobby/                    # Tournament lobby
│   ├── game/[tournamentId]/      # Poker table/game UI
│   ├── admin/                    # Admin dashboard
│   └── api/                      # API routes
│       ├── auth/wallet/          # Wallet authentication
│       ├── tournaments/          # Tournament management
│       ├── game/                 # Game actions & state
│       └── admin/                # Admin endpoints
├── components/
│   ├── providers/                # React context providers
│   └── poker/                    # Poker UI components
├── lib/
│   ├── poker-engine/             # Core poker game logic
│   │   ├── deck.ts               # Card shuffling
│   │   ├── hand-evaluator.ts    # Hand ranking algorithm
│   │   ├── game-state.ts         # Game state management
│   │   ├── actions.ts            # Action validation
│   │   └── pot-calculator.ts    # Pot/side pot calculation
│   ├── solana/                   # Solana integration
│   │   ├── poker-program.ts     # Program SDK
│   │   └── config.ts             # Solana configuration
│   ├── auth/                     # Authentication utilities
│   ├── tournament-manager.ts     # Tournament orchestration
│   └── db.ts                     # Prisma client
├── prisma/
│   └── schema.prisma             # Database schema
└── solana-program/               # Anchor Solana program
    └── programs/poker-escrow/    # Smart contract
        └── src/lib.rs            # Rust program code
```

## Prerequisites

- **Node.js** v18 or later
- **PostgreSQL** database
- **Rust** & **Anchor CLI** (for deploying Solana program)
- **Solana CLI** tools
- **Phantom/Solflare wallet** (for testing)

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

Create a PostgreSQL database and run migrations:

```bash
# Create .env file with your database URL
echo 'DATABASE_URL="postgresql://user:password@localhost:5432/poker_db"' > .env

# Run Prisma migrations
npx prisma migrate dev --name init
npx prisma generate
```

### 3. Deploy Solana Program

```bash
# Install Rust and Anchor (if not already installed)
# https://www.anchor-lang.com/docs/installation

cd solana-program

# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Copy the program ID from the output
```

### 4. Configure Environment Variables

Create/update `.env` in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/poker_db"

# Solana
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.devnet.solana.com"
NEXT_PUBLIC_POKER_PROGRAM_ID="<YOUR_DEPLOYED_PROGRAM_ID>"

# Admin
ADMIN_WALLET_ADDRESS="<YOUR_ADMIN_WALLET_ADDRESS>"

# JWT
JWT_SECRET="your-secret-key-change-in-production"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 5. Create Admin User

After running the app once (so a user is created), update the database to make yourself admin:

```sql
-- Connect to your PostgreSQL database
psql -d poker_db

-- Make your wallet address an admin
UPDATE users SET is_admin = true WHERE wallet_address = 'YOUR_WALLET_ADDRESS';
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### For Players

1. **Connect Wallet**: Click "Connect Wallet" on the home page
2. **Join Tournament**: Browse available tournaments in the lobby
3. **Play Poker**: Once 6 players join, the game starts automatically
4. **Win Prizes**: Winner receives the prize pool (minus rake) directly to their wallet

### For Admins

1. **Access Admin Dashboard**: Navigate to `/admin` after connecting admin wallet
2. **Create Tournament**: Set name, buy-in amount, and rake percentage
3. **Monitor Stats**: View total tournaments, active games, and rake collected
4. **Withdraw Rake**: Collect accumulated rake from completed tournaments

## Game Flow

1. **Tournament Creation**:
   - Admin creates tournament via dashboard
   - Smart contract initializes tournament escrow account
   - Tournament appears in lobby

2. **Player Join**:
   - Players connect wallet and join tournament
   - Each player sends buy-in to escrow via Solana transaction
   - Once 6 players join, game auto-starts

3. **Gameplay**:
   - Server manages game state (dealing cards, betting rounds)
   - Players take turns: fold, check, call, raise, all-in
   - Hand evaluator determines winner at showdown
   - Repeat until only one player has chips

4. **Payout**:
   - Smart contract distributes prize pool to winner
   - Admin can withdraw accumulated rake
   - Tournament marked as complete

## Architecture

### Smart Contract (Solana)

- **Escrow Account**: Holds all buy-ins during tournament
- **Rake Calculation**: Automatically deducts rake from buy-ins
- **Prize Distribution**: Transfers prize pool to winner
- **Admin Controls**: Only admin can trigger payouts and withdraw rake

### Game Engine (Off-Chain)

- **Card Shuffling**: Cryptographically secure random shuffling
- **Hand Evaluation**: Accurate poker hand ranking (high card to royal flush)
- **Action Validation**: Prevents invalid moves
- **Pot Management**: Handles main pot and side pots for all-ins
- **Tournament Manager**: Orchestrates 6-player lifecycle

### Database Schema

- **Users**: Wallet address, username, admin status, total winnings
- **Tournaments**: Buy-in, rake, status, escrow address
- **Games**: Current hand, pot, dealer position, blind amounts
- **Hands**: Community cards, winner, action history

## API Endpoints

### Authentication
- `GET /api/auth/wallet?address=xxx` - Get message to sign
- `POST /api/auth/wallet` - Verify signature and get JWT

### Tournaments
- `GET /api/tournaments` - List all tournaments
- `POST /api/tournaments` - Create tournament (admin only)
- `GET /api/tournaments/[id]` - Get tournament details
- `POST /api/tournaments/[id]/join` - Join tournament

### Game
- `GET /api/game/[tournamentId]/state` - Get current game state
- `POST /api/game/[tournamentId]/action` - Submit player action

### Admin
- `GET /api/admin/stats` - Get statistics (admin only)

## Development

### Running Tests

```bash
# Run poker engine tests (once implemented)
npm test

# Run Prisma Studio (database GUI)
npx prisma studio
```

### Generating Prisma Client

After schema changes:

```bash
npx prisma migrate dev
npx prisma generate
```

### Building for Production

```bash
npm run build
npm start
```

## Deployment

### Deploying to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Database (Railway/Supabase)

1. Create PostgreSQL instance
2. Update DATABASE_URL
3. Run `npx prisma migrate deploy`

### Solana Program

Deploy to mainnet when ready:

```bash
cd solana-program
anchor build --verifiable
anchor deploy --provider.cluster mainnet-beta
```

## Troubleshooting

### "Game not found" error
- Ensure tournament has 6 players and has started
- Check that game state is being synced to database

### Wallet connection issues
- Clear browser cache
- Try different wallet (Phantom vs Solflare)
- Check wallet is on correct network (devnet vs mainnet)

### Transaction failures
- Ensure sufficient SOL for buy-in + gas fees
- Verify program ID is correct in .env
- Check Solana network status

## Security Considerations

⚠️ **This is a reference implementation. For production use:**

- Audit smart contract thoroughly
- Implement proper WebSocket authentication
- Add rate limiting to API endpoints
- Use secure random number generation
- Implement connection pooling
- Add comprehensive error handling
- Set up monitoring and logging
- Consider regulatory compliance

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Inspired by [crypto-poker](https://github.com/fairpoker/crypto-poker) by troytroy
- Built with [Anchor](https://anchor-lang.com/)
- Uses [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)

## Support

For issues and questions:
- Open a GitHub issue
- Check IMPLEMENTATION_STATUS.md for known limitations
- Review Solana and Anchor documentation

---

**Note**: This project is for educational purposes. Online poker may be restricted in some jurisdictions. Do your research and ensure compliance with local laws before deploying.
