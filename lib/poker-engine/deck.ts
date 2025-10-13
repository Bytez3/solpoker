import { Card, Suit, Rank, CardString } from './types';
import crypto from 'crypto';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

/**
 * Create a new standard 52-card deck
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * Shuffle a deck using Fisher-Yates algorithm with cryptographically secure random
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate cryptographically secure random index
    const randomBytes = crypto.randomBytes(4);
    const randomValue = randomBytes.readUInt32BE(0) / 0x100000000;
    const j = Math.floor(randomValue * (i + 1));
    
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Deal cards from the deck
 */
export function dealCards(deck: Card[], count: number): { cards: Card[]; remainingDeck: Card[] } {
  if (count > deck.length) {
    throw new Error('Not enough cards in deck');
  }
  
  const cards = deck.slice(0, count);
  const remainingDeck = deck.slice(count);
  
  return { cards, remainingDeck };
}

/**
 * Convert card to string notation (e.g., "Ah" for Ace of Hearts)
 */
export function cardToString(card: Card): CardString {
  const suitChar = card.suit.charAt(0).toLowerCase();
  return `${card.rank}${suitChar}`;
}

/**
 * Parse card from string notation
 */
export function stringToCard(str: CardString): Card {
  if (str.length !== 2) {
    throw new Error('Invalid card string');
  }
  
  const rank = str[0].toUpperCase() as Rank;
  const suitChar = str[1].toLowerCase();
  
  let suit: Suit;
  switch (suitChar) {
    case 'h':
      suit = 'hearts';
      break;
    case 'd':
      suit = 'diamonds';
      break;
    case 'c':
      suit = 'clubs';
      break;
    case 's':
      suit = 'spades';
      break;
    default:
      throw new Error('Invalid suit');
  }
  
  return { rank, suit };
}

/**
 * Convert multiple cards to string array
 */
export function cardsToString(cards: Card[]): CardString[] {
  return cards.map(cardToString);
}

/**
 * Parse multiple cards from string array
 */
export function stringToCards(strings: CardString[]): Card[] {
  return strings.map(stringToCard);
}

/**
 * Get rank value for comparison (2=2, 3=3, ..., T=10, J=11, Q=12, K=13, A=14)
 */
export function getRankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  };
  return values[rank];
}

/**
 * Get suit symbol
 */
export function getSuitSymbol(suit: Suit): string {
  const symbols: Record<Suit, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return symbols[suit];
}

/**
 * Format card for display
 */
export function formatCard(card: Card): string {
  return `${card.rank}${getSuitSymbol(card.suit)}`;
}

