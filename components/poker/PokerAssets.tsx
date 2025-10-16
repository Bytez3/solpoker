'use client';

import React, { useEffect, useState } from 'react';
import { assetManager, POKER_ASSETS } from '@/lib/assets/asset-manager';

interface PokerCardProps {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
  faceUp?: boolean;
  className?: string;
}

export const PokerCard: React.FC<PokerCardProps> = ({ 
  suit, 
  rank, 
  faceUp = true, 
  className = '' 
}) => {
  const [cardImage, setCardImage] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadCard = async () => {
      if (faceUp) {
        const assetId = `card-${suit}-${rank.toLowerCase()}`;
        const asset = POKER_ASSETS.find(a => a.id === assetId);
        if (asset) {
          const img = await assetManager.loadAsset(assetId) as HTMLImageElement;
          if (img) {
            setCardImage(img.src);
            setIsLoaded(true);
          }
        }
      } else {
        const img = await assetManager.loadAsset('card-back') as HTMLImageElement;
        if (img) {
          setCardImage(img.src);
          setIsLoaded(true);
        }
      }
    };

    loadCard();
  }, [suit, rank, faceUp]);

  if (!isLoaded) {
    return (
      <div className={`w-16 h-24 bg-gray-300 rounded-lg flex items-center justify-center ${className}`}>
        <div className="animate-pulse">🃏</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <img 
        src={cardImage} 
        alt={`${rank} of ${suit}`}
        className="w-16 h-24 rounded-lg shadow-lg border-2 border-white"
        onError={() => {
          // Fallback to CSS-based card if image fails to load
          setIsLoaded(false);
        }}
      />
    </div>
  );
};

interface PokerChipProps {
  color: 'white' | 'red' | 'blue' | 'green' | 'black';
  value?: number;
  className?: string;
}

export const PokerChip: React.FC<PokerChipProps> = ({ 
  color, 
  value, 
  className = '' 
}) => {
  const [chipImage, setChipImage] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadChip = async () => {
      const assetId = `chip-${color}`;
      const img = await assetManager.loadAsset(assetId) as HTMLImageElement;
      if (img) {
        setChipImage(img.src);
        setIsLoaded(true);
      }
    };

    loadChip();
  }, [color]);

  if (!isLoaded) {
    return (
      <div className={`w-8 h-8 rounded-full bg-${color}-500 flex items-center justify-center ${className}`}>
        {value && <span className="text-xs font-bold text-white">{value}</span>}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <img 
        src={chipImage} 
        alt={`${color} chip`}
        className="w-8 h-8 rounded-full shadow-md"
      />
      {value && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white">{value}</span>
        </div>
      )}
    </div>
  );
};

interface PokerTableProps {
  theme: 'green' | 'red' | 'blue';
  className?: string;
}

export const PokerTable: React.FC<PokerTableProps> = ({ 
  theme, 
  className = '' 
}) => {
  const [tableImage, setTableImage] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTable = async () => {
      const assetId = `table-${theme}`;
      const img = await assetManager.loadAsset(assetId) as HTMLImageElement;
      if (img) {
        setTableImage(img.src);
        setIsLoaded(true);
      }
    };

    loadTable();
  }, [theme]);

  if (!isLoaded) {
    return (
      <div className={`w-full h-64 bg-${theme}-800 rounded-full border-8 border-amber-900 ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-white">🃏</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <img 
        src={tableImage} 
        alt={`${theme} poker table`}
        className="w-full h-auto rounded-full border-8 border-amber-900"
      />
    </div>
  );
};

// Sound effects component
export const SoundEffects: React.FC = () => {
  useEffect(() => {
    // Preload common sounds
    const preloadSounds = async () => {
      await assetManager.preloadAssets([
        'sound-card-deal',
        'sound-chip-place',
        'sound-win',
        'sound-lose'
      ]);
    };

    preloadSounds();
  }, []);

  return null; // This component doesn't render anything
};

// Export sound functions for use in game logic
export const playCardDealSound = () => assetManager.playSound('sound-card-deal');
export const playChipPlaceSound = () => assetManager.playSound('sound-chip-place');
export const playWinSound = () => assetManager.playSound('sound-win');
export const playLoseSound = () => assetManager.playSound('sound-lose');
