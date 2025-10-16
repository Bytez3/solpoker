// Poker Asset Manager
// Handles loading and using poker game assets from OpenGameArt.org

export interface PokerAsset {
  id: string;
  name: string;
  type: 'card' | 'table' | 'chip' | 'ui' | 'sound';
  path: string;
  width?: number;
  height?: number;
}

export const POKER_ASSETS: PokerAsset[] = [
  // Cards
  { id: 'card-back', name: 'Card Back', type: 'card', path: '/assets/poker/cards/card-back.png' },
  { id: 'card-hearts-ace', name: 'Ace of Hearts', type: 'card', path: '/assets/poker/cards/hearts-ace.png' },
  { id: 'card-diamonds-ace', name: 'Ace of Diamonds', type: 'card', path: '/assets/poker/cards/diamonds-ace.png' },
  { id: 'card-clubs-ace', name: 'Ace of Clubs', type: 'card', path: '/assets/poker/cards/clubs-ace.png' },
  { id: 'card-spades-ace', name: 'Ace of Spades', type: 'card', path: '/assets/poker/cards/spades-ace.png' },
  
  // Tables
  { id: 'table-green', name: 'Green Felt Table', type: 'table', path: '/assets/poker/tables/green-felt.png', width: 256, height: 192 },
  { id: 'table-red', name: 'Red Felt Table', type: 'table', path: '/assets/poker/tables/red-felt.png', width: 256, height: 192 },
  { id: 'table-blue', name: 'Blue Felt Table', type: 'table', path: '/assets/poker/tables/blue-felt.png', width: 256, height: 192 },
  
  // Chips
  { id: 'chip-white', name: 'White Chip', type: 'chip', path: '/assets/poker/chips/white.png' },
  { id: 'chip-red', name: 'Red Chip', type: 'chip', path: '/assets/poker/chips/red.png' },
  { id: 'chip-blue', name: 'Blue Chip', type: 'chip', path: '/assets/poker/chips/blue.png' },
  { id: 'chip-green', name: 'Green Chip', type: 'chip', path: '/assets/poker/chips/green.png' },
  { id: 'chip-black', name: 'Black Chip', type: 'chip', path: '/assets/poker/chips/black.png' },
  
  // UI Elements
  { id: 'button-fold', name: 'Fold Button', type: 'ui', path: '/assets/poker/ui/button-fold.png' },
  { id: 'button-call', name: 'Call Button', type: 'ui', path: '/assets/poker/ui/button-call.png' },
  { id: 'button-raise', name: 'Raise Button', type: 'ui', path: '/assets/poker/ui/button-raise.png' },
  { id: 'button-allin', name: 'All-In Button', type: 'ui', path: '/assets/poker/ui/button-allin.png' },
  
  // Sounds
  { id: 'sound-card-deal', name: 'Card Deal Sound', type: 'sound', path: '/assets/poker/sounds/card-deal.mp3' },
  { id: 'sound-chip-place', name: 'Chip Place Sound', type: 'sound', path: '/assets/poker/sounds/chip-place.mp3' },
  { id: 'sound-win', name: 'Win Sound', type: 'sound', path: '/assets/poker/sounds/win.mp3' },
  { id: 'sound-lose', name: 'Lose Sound', type: 'sound', path: '/assets/poker/sounds/lose.mp3' },
];

export class AssetManager {
  private loadedAssets: Map<string, HTMLImageElement | HTMLAudioElement> = new Map();
  
  async loadAsset(assetId: string): Promise<HTMLImageElement | HTMLAudioElement | null> {
    const asset = POKER_ASSETS.find(a => a.id === assetId);
    if (!asset) {
      console.warn(`Asset not found: ${assetId}`);
      return null;
    }
    
    if (this.loadedAssets.has(assetId)) {
      return this.loadedAssets.get(assetId)!;
    }
    
    try {
      if (asset.type === 'sound') {
        const audio = new Audio(asset.path);
        await audio.load();
        this.loadedAssets.set(assetId, audio);
        return audio;
      } else {
        const img = new Image();
        img.src = asset.path;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        this.loadedAssets.set(assetId, img);
        return img;
      }
    } catch (error) {
      console.error(`Failed to load asset ${assetId}:`, error);
      return null;
    }
  }
  
  async preloadAssets(assetIds: string[]): Promise<void> {
    const promises = assetIds.map(id => this.loadAsset(id));
    await Promise.all(promises);
  }
  
  getAsset(assetId: string): HTMLImageElement | HTMLAudioElement | null {
    return this.loadedAssets.get(assetId) || null;
  }
  
  playSound(soundId: string): void {
    const audio = this.getAsset(soundId) as HTMLAudioElement;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(console.error);
    }
  }
}

// Singleton instance
export const assetManager = new AssetManager();
