# 🎨 Poker Game Assets from OpenGameArt.org

## 📦 Asset Pack Pixel Poker by Chasersgaming

**License**: CC0 (Public Domain) - Free for commercial use  
**Source**: https://opengameart.org/content/asset-pack-pixel-poker

### 🎯 What's Included:
- **Poker Table Background** (256x192 pixels)
- **Complete Playing Cards** (Hearts, Diamonds, Clubs, Spades)
- **Poker Title Logo**
- **Dealer Character** with talking animations
- **Poker Chips** in various colors
- **Card Machine** image

### 📥 How to Download:

1. **Visit the Source**: https://opengameart.org/content/asset-pack-pixel-poker
2. **Click "Download"** button
3. **Extract the ZIP** file
4. **Organize Assets** into the following structure:

```
public/assets/poker/
├── cards/
│   ├── card-back.png
│   ├── hearts-ace.png
│   ├── hearts-2.png
│   ├── hearts-3.png
│   ├── ... (all 52 cards)
│   ├── diamonds-ace.png
│   ├── clubs-ace.png
│   └── spades-ace.png
├── tables/
│   ├── green-felt.png
│   ├── red-felt.png
│   └── blue-felt.png
├── chips/
│   ├── white.png
│   ├── red.png
│   ├── blue.png
│   ├── green.png
│   └── black.png
├── ui/
│   ├── button-fold.png
│   ├── button-call.png
│   ├── button-raise.png
│   └── button-allin.png
└── sounds/
    ├── card-deal.mp3
    ├── chip-place.mp3
    ├── win.mp3
    └── lose.mp3
```

### 🚀 Usage in Your App:

The assets are already integrated into your poker game! Use these components:

```tsx
import { PokerCard, PokerChip, PokerTable, SoundEffects } from '@/components/poker/PokerAssets';

// In your game component
<PokerTable theme="green" />
<PokerCard suit="hearts" rank="Ace" faceUp={true} />
<PokerChip color="red" value={100} />
<SoundEffects /> // Preloads sounds
```

### 🎵 Sound Effects:

```tsx
import { playCardDealSound, playWinSound } from '@/components/poker/PokerAssets';

// In your game logic
playCardDealSound(); // When dealing cards
playWinSound(); // When player wins
```

### 🎨 Customization:

You can easily add more assets by:
1. Adding them to the `POKER_ASSETS` array in `lib/assets/asset-manager.ts`
2. Creating new components in `components/poker/PokerAssets.tsx`
3. Using the `AssetManager` class for custom asset loading

### 📝 Notes:

- All assets are **CC0 licensed** (public domain)
- **Attribution appreciated** but not required
- Assets can be **modified and redistributed** freely
- **Retro pixel art style** with Master System colors
- Optimized for **8x8 tile systems**

### 🔧 Fallbacks:

If assets fail to load, the components will show:
- **CSS-based fallbacks** for cards and chips
- **Animated placeholders** while loading
- **Error handling** for missing assets

Happy gaming! 🎰🃏