# Environment Setup

## Create .env.local file

Create a file called `.env.local` in the root of your project with this content:

```bash
# Solana Configuration
NEXT_PUBLIC_POKER_PROGRAM_ID=HLwbRZWAGjK7w5T61xegvj37v1H3nATNdTcypAfbFRaq
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Admin Wallet (your deployer wallet)
ADMIN_WALLET_ADDRESS=3rWf9fKhQFFsjAfyM1cgtoBpeLZL75b77C8o8Fz9QeNF

# JWT Secret (generate a secure random string for production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database (if using PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/solpoker

# Demo Mode (set to false for real transactions)
NEXT_PUBLIC_DEMO_MODE=false
```

## Quick Setup Command

```bash
cat > /home/steven/solpoker/.env.local << 'EOF'
NEXT_PUBLIC_POKER_PROGRAM_ID=HLwbRZWAGjK7w5T61xegvj37v1H3nATNdTcypAfbFRaq
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
ADMIN_WALLET_ADDRESS=3rWf9fKhQFFsjAfyM1cgtoBpeLZL75b77C8o8Fz9QeNF
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=postgresql://user:password@localhost:5432/solpoker
NEXT_PUBLIC_DEMO_MODE=false
EOF
```

Then start your app with:
```bash
cd /home/steven/solpoker
npm run dev
```

