<!-- b5d943ae-3582-4901-a852-3e92ca7d4c5f 1847483f-c2ba-4cba-becd-a9001adecc16 -->
# Next.js Solana Poker Migration Plan

## Phase 1: Project Foundation

### 1.1 Initialize Next.js Project

- Create new Next.js 14+ app with TypeScript, App Router, and Tailwind CSS
- Structure: `/app`, `/lib`, `/components`, `/solana-program`, `/prisma`
- Install core dependencies: `@solana/web3.js`, `@solana/wallet-adapter-react`, `@prisma/client`, `ws`, `socket.io`

### 1.2 Database Setup (PostgreSQL + Prisma)

- Define schema in `prisma/schema.prisma`:
- **User** (wallet_address PK, username, created_at, total_winnings)
- **Tournament** (id, name, buy_in, rake_percentage, status, max_players=6, created_by_admin)
- **TournamentPlayer** (tournament_id, user_id, position, buy_in_tx, payout_tx, status)
- **Game** (tournament_id, table_number, current_hand, pot, status)
- **GamePlayer** (game_id, user_id, seat_position, chips, status, cards)
- **Hand** (game_id, hand_number, community_cards, pot, winner_id, actions_json)
- **AdminConfig** (key, value) - for rake percentages, default buy-ins

## Phase 2: Solana Smart Contract (Anchor)

### 2.1 Create Anchor Program (`solana-program/`)

- Initialize Anchor project: `anchor init poker_escrow`
- **Program accounts:**
- `TournamentEscrow`: Holds buy-ins, tracks player entries, calculates rake
- `AdminConfig`: Stores admin wallet, rake percentages
- **Instructions:**
- `initialize_tournament(buy_in, rake_percentage)` - admin creates escrow
- `join_tournament()` - player deposits buy-in (transferred to escrow PDA)
- `distribute_prizes(winners[])` - admin triggers payout (1st place gets pot minus rake)
- `withdraw_rake()` - admin withdraws accumulated rake

### 2.2 Deploy & Test

- Deploy to Solana devnet
- Create TypeScript SDK in `/lib/solana/poker-program.ts` to interact with program
- Unit tests for escrow logic, rake calculation

## Phase 3: Authentication & Wallet Integration

### 3.1 Wallet Adapter Setup

- Configure `@solana/wallet-adapter-react` with Phantom, Solflare, etc.
- Create `WalletProvider` wrapper in `/components/providers/WalletProvider.tsx`
- Implement middleware in `/app/api/auth/[...wallet]/route.ts`:
- Verify wallet signature
- Create/fetch user by wallet address
- Issue JWT or session token

### 3.2 Protected Routes

- `/app/(authenticated)/lobby` - tournament list
- `/app/(authenticated)/game/[tournamentId]` - poker table
- `/app/(authenticated)/admin` - admin dashboard (wallet-gated)

## Phase 4: Poker Game Engine

### 4.1 Core Logic (`/lib/poker-engine/`)

- **deck.ts**: Card generation, shuffling (server-side secure random)
- **hand-evaluator.ts**: Rank hands (high card → royal flush), compare winners
- **game-state.ts**: Manage betting rounds (pre-flop, flop, turn, river)
- **actions.ts**: Validate fold, call, raise, all-in
- **pot-calculator.ts**: Main pot, side pots for all-ins

### 4.2 Tournament Manager (`/lib/tournament-manager.ts`)

- Track 6-player tournament lifecycle:
- Wait for 6 players to join
- Start game when full
- Deal cards, run betting rounds
- Award winner, trigger Solana payout
- Close tournament

## Phase 5: Real-Time Communication

### 5.1 WebSocket Server (Socket.IO)

- Create `/app/api/socket/route.ts` for Socket.IO server
- Events:
- `join-tournament` - player enters lobby
- `game-update` - broadcast table state (pot, community cards, current player)
- `player-action` - handle bet/fold/call
- `hand-complete` - show winner, update chips
- `tournament-end` - final results

### 5.2 Client Socket Hook

- `/lib/hooks/useGameSocket.ts` - React hook for real-time updates
- Optimistic UI updates with server validation

## Phase 6: Frontend UI

### 6.1 Lobby (`/app/(authenticated)/lobby/page.tsx`)

- List active/upcoming tournaments (fetch from DB)
- Show buy-in, players joined (X/6), status
- "Join Tournament" button → calls Solana program `join_tournament()`
- After successful on-chain tx, insert into DB and redirect to table

### 6.2 Poker Table (`/app/(authenticated)/game/[tournamentId]/page.tsx`)

- Canvas or SVG-based table rendering:
- 6 player seats around table
- Community cards in center
- Pot amount, player chips, current bet
- Action buttons: Fold, Call, Raise (with slider)
- Player cards (only show user's own cards until showdown)
- Chat sidebar (optional)

### 6.3 Admin Dashboard (`/app/(authenticated)/admin/page.tsx`)

- **Protected route**: Check wallet address against admin list in DB
- Features:
- Create tournament (set buy-in, rake %)
- View all active tournaments
- Trigger `distribute_prizes()` on Solana (normally automated, manual override)
- Configure global rake percentage
- View total rake collected
- Withdraw rake to admin wallet

### 6.4 Styling

- Use Tailwind CSS + shadcn/ui components
- Dark theme with poker table green felt aesthetic
- Card sprites from existing `poker.ui/images/cards-sprite.png` (can reuse)
- Responsive design (desktop priority, mobile-friendly)

## Phase 7: API Routes

### 7.1 Tournament APIs

- `POST /api/tournaments/create` - admin creates tournament (also initializes Solana escrow)
- `GET /api/tournaments` - list all tournaments
- `POST /api/tournaments/[id]/join` - after Solana tx, add player to DB
- `GET /api/tournaments/[id]` - get tournament details + players

### 7.2 Game APIs

- `POST /api/game/[tournamentId]/action` - validate and process player action (fold/call/raise)
- `GET /api/game/[tournamentId]/state` - current game state (for reconnections)

### 7.3 Admin APIs

- `POST /api/admin/rake/configure` - set global rake %
- `POST /api/admin/payout` - trigger manual payout
- `GET /api/admin/stats` - total rake, active games, etc.

## Phase 8: Integration & Testing

### 8.1 End-to-End Flow

1. Admin creates tournament with 0.1 SOL buy-in, 5% rake
2. 6 players join (each deposits 0.1 SOL to escrow PDA)
3. Game auto-starts, cards dealt
4. Betting rounds complete, winner determined
5. Smart contract distributes: winner gets 0.57 SOL (6 * 0.1 - 5% rake), admin gets 0.03 SOL

### 8.2 Edge Cases

- Player disconnects mid-game (auto-fold after timeout)
- Multiple simultaneous tournaments
- Reconnection logic (restore game state from DB)

## Key Files to Create

**Solana Program:**

- `solana-program/programs/poker-escrow/src/lib.rs`

**Database:**

- `prisma/schema.prisma`
- `lib/db.ts` (Prisma client singleton)

**Game Engine:**

- `lib/poker-engine/deck.ts`
- `lib/poker-engine/hand-evaluator.ts`
- `lib/poker-engine/game-state.ts`

**Frontend:**

- `app/(authenticated)/lobby/page.tsx`
- `app/(authenticated)/game/[tournamentId]/page.tsx`
- `app/(authenticated)/admin/page.tsx`
- `components/poker/PokerTable.tsx`
- `components/poker/PlayerSeat.tsx`

**API:**

- `app/api/tournaments/route.ts`
- `app/api/game/[tournamentId]/action/route.ts`
- `app/api/socket/route.ts`

**Solana Integration:**

- `lib/solana/poker-program.ts` (SDK for program interactions)
- `lib/solana/config.ts` (program IDs, RPC endpoints)

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Blockchain**: Solana (Anchor framework)
- **Real-time**: Socket.IO or native WebSockets
- **Styling**: Tailwind CSS + shadcn/ui
- **Wallet**: @solana/wallet-adapter-react
- **Deployment**: Vercel (Next.js), Railway/Supabase (PostgreSQL), Solana devnet/mainnet

## Migration Notes

- **No code reuse** from existing codebase (fresh rebuild per requirements)
- Existing poker logic in `poker.engine/src/poker-evaluator.ts` and `poker.engine/src/table.ts` can serve as reference for hand ranking algorithms
- Admin features expand from read-only to full CRUD on tournaments
- Payment system completely replaced: no BTC/ETH/DASH, Solana-only

### To-dos

- [ ] Initialize Next.js 14 project with TypeScript, Tailwind CSS, and core dependencies
- [ ] Set up PostgreSQL database and Prisma schema with User, Tournament, Game, Hand tables
- [ ] Build Solana Anchor program for tournament escrow, rake, and prize distribution
- [ ] Deploy Anchor program to devnet and create TypeScript SDK
- [ ] Implement Solana wallet authentication with signature verification
- [ ] Build poker game engine (deck, hand evaluator, betting rounds, pot calculator)
- [ ] Create tournament manager for 6-player game lifecycle
- [ ] Set up Socket.IO for real-time game state updates
- [ ] Build lobby page showing active tournaments and join functionality
- [ ] Create poker table UI with 6 seats, cards, chips, and action buttons
- [ ] Build admin panel for tournament creation, rake configuration, and stats
- [ ] Implement API routes for game actions and tournament management
- [ ] Integrate Solana program calls with frontend (join, payout, rake withdrawal)
- [ ] Test complete flow: create tournament → 6 players join → game → payout