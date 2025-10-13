#!/bin/bash

# Solana Program Deployment Script
# This script helps deploy the poker escrow program to Solana devnet

set -e

echo "🚀 Solana Poker Program Deployment Script"
echo "=========================================="
echo ""

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Error: Solana CLI is not installed"
    echo "Please install it first: sh -c \"\$(wget -qO- https://release.anza.xyz/stable/install)\""
    exit 1
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Error: Anchor CLI is not installed"
    echo "Please install build-essential first, then install Anchor:"
    echo "  sudo apt-get install -y build-essential pkg-config libssl-dev"
    echo "  cargo install --git https://github.com/coral-xyz/anchor avm --locked --force"
    echo "  avm install 0.30.1 && avm use 0.30.1"
    exit 1
fi

echo "✅ Solana CLI version: $(solana --version)"
echo "✅ Anchor CLI version: $(anchor --version)"
echo ""

# Configure Solana to use devnet
echo "📡 Configuring Solana CLI for devnet..."
solana config set --url devnet
echo ""

# Check wallet
WALLET_PATH="$HOME/.config/solana/id.json"
if [ ! -f "$WALLET_PATH" ]; then
    echo "🔑 No wallet found. Creating new keypair..."
    solana-keygen new --outfile "$WALLET_PATH" --no-bip39-passphrase
    echo ""
fi

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo "💰 Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo "🪂 Insufficient balance. Requesting airdrop..."
    solana airdrop 2
    echo "✅ Airdrop completed"
    echo "💰 New balance: $(solana balance)"
fi
echo ""

# Navigate to Solana program directory
cd "$(dirname "$0")/../solana-program" || exit 1

# Build the program
echo "🔨 Building Solana program..."
anchor build
echo "✅ Build completed"
echo ""

# Deploy the program
echo "🚀 Deploying program to devnet..."
DEPLOY_OUTPUT=$(anchor deploy --provider.cluster devnet 2>&1)
echo "$DEPLOY_OUTPUT"
echo ""

# Extract program ID from output
PROGRAM_ID=$(echo "$DEPLOY_OUTPUT" | grep "Program Id:" | awk '{print $3}')

if [ -z "$PROGRAM_ID" ]; then
    echo "❌ Failed to extract Program ID from deployment output"
    exit 1
fi

echo "✅ Program deployed successfully!"
echo "📋 Program ID: $PROGRAM_ID"
echo ""

# Update Anchor.toml
echo "📝 Updating Anchor.toml..."
sed -i "s/poker_escrow = \".*\"/poker_escrow = \"$PROGRAM_ID\"/" Anchor.toml
echo "✅ Updated Anchor.toml"
echo ""

# Update config.ts
echo "📝 Updating lib/solana/config.ts..."
cd ..
sed -i "s/export const POKER_PROGRAM_ID = new PublicKey('.*');/export const POKER_PROGRAM_ID = new PublicKey('$PROGRAM_ID');/" lib/solana/config.ts
echo "✅ Updated lib/solana/config.ts"
echo ""

# Create/update .env.local
ENV_FILE=".env.local"
echo "📝 Creating/updating $ENV_FILE..."

cat > "$ENV_FILE" << EOF
# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_POKER_PROGRAM_ID=$PROGRAM_ID
NEXT_PUBLIC_DEMO_MODE=false

# Admin Configuration
ADMIN_WALLET_ADDRESS=$(solana address)

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-this-secret-in-production")
NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-this-nextauth-secret")
NEXTAUTH_URL=http://localhost:3000

# Database Configuration (update with your actual database URL)
DATABASE_URL=postgresql://user:password@localhost:5432/poker_db
EOF

echo "✅ Created $ENV_FILE"
echo ""

echo "🎉 Deployment Complete!"
echo ""
echo "Next steps:"
echo "1. Update DATABASE_URL in .env.local with your PostgreSQL connection string"
echo "2. Run database migrations: npx prisma migrate dev"
echo "3. Start the development server: npm run dev"
echo "4. Connect your wallet and test the application"
echo ""
echo "Your admin wallet address: $(solana address)"
echo "Remember to mark this wallet as admin in the database!"

