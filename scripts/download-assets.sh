#!/bin/bash

# Download poker assets from OpenGameArt.org
echo "🎨 Downloading poker assets from OpenGameArt.org..."

# Create directories
mkdir -p public/assets/poker/{cards,tables,chips,ui,sounds}

# Download Asset Pack Pixel Poker by Chasersgaming
echo "📦 Downloading Asset Pack Pixel Poker..."

# Note: We'll need to manually download these as they require clicking through the website
# Let me create a list of assets we need and their sources

cat > public/assets/poker/README.md << 'EOF'
# Poker Game Assets

## Sources from OpenGameArt.org

### Asset Pack Pixel Poker by Chasersgaming
- **License**: CC0 (Public Domain)
- **URL**: https://opengameart.org/content/asset-pack-pixel-poker
- **Includes**:
  - Poker table background (256x192)
  - Playing cards (Hearts, Diamonds, Clubs, Spades)
  - Poker title logo
  - Dealer character with animations
  - Poker chips
  - Card machine image

### Additional Assets Needed:
1. **Playing Cards**: Complete 52-card deck
2. **Poker Tables**: Different table themes
3. **Chips**: Various denominations
4. **UI Elements**: Buttons, panels, icons
5. **Sound Effects**: Card dealing, win/lose sounds

## Manual Download Instructions:
1. Visit: https://opengameart.org/content/asset-pack-pixel-poker
2. Click "Download" button
3. Extract the ZIP file
4. Copy assets to appropriate directories:
   - Cards → public/assets/poker/cards/
   - Tables → public/assets/poker/tables/
   - Chips → public/assets/poker/chips/
   - UI → public/assets/poker/ui/

## Asset Usage:
- All assets are CC0 licensed (free for commercial use)
- Attribution appreciated but not required
- Can be modified and redistributed freely
EOF

echo "✅ Asset directory structure created!"
echo "📝 Please manually download assets from:"
echo "   https://opengameart.org/content/asset-pack-pixel-poker"
echo "   And place them in the appropriate directories."
