#!/bin/bash

echo "=========================================="
echo "   STARTING SOLANA POKER APPLICATION"
echo "=========================================="
echo ""

cd /home/steven/solpoker

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    cat > .env.local << 'EOF'
NEXT_PUBLIC_POKER_PROGRAM_ID=HLwbRZWAGjK7w5T61xegvj37v1H3nATNdTcypAfbFRaq
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
ADMIN_WALLET_ADDRESS=3rWf9fKhQFFsjAfyM1cgtoBpeLZL75b77C8o8Fz9QeNF
JWT_SECRET=dev-secret-change-in-production
NEXT_PUBLIC_DEMO_MODE=false
EOF
    echo "✅ .env.local created"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "Program ID: HLwbRZWAGjK7w5T61xegvj37v1H3nATNdTcypAfbFRaq"
echo "Network: Devnet"
echo ""
echo "=========================================="
echo "Starting Next.js development server..."
echo "=========================================="
echo ""
echo "Your app will be available at: http://localhost:3000"
echo ""
echo "Make sure your Solana wallet is set to DEVNET!"
echo ""

npm run dev

