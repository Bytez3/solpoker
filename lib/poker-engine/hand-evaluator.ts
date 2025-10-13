import { Card, HandRank, HandEvaluation, Rank } from './types';
import { getRankValue } from './deck';

/**
 * Evaluate the best 5-card poker hand from 7 cards (5 community + 2 hole cards)
 */
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate hand');
  }
  
  // Get all possible 5-card combinations
  const combinations = cards.length === 5 
    ? [cards]
    : getCombinations(cards, 5);
  
  // Evaluate each combination and return the best
  let bestHand: HandEvaluation | null = null;
  
  for (const combo of combinations) {
    const evaluation = evaluate5CardHand(combo);
    if (!bestHand || evaluation.value > bestHand.value) {
      bestHand = evaluation;
    }
  }
  
  return bestHand!;
}

/**
 * Evaluate a 5-card hand
 */
function evaluate5CardHand(cards: Card[]): HandEvaluation {
  const sorted = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
  
  const isFlush = checkFlush(sorted);
  const isStraight = checkStraight(sorted);
  const rankCounts = getRankCounts(sorted);
  
  // Royal Flush
  if (isFlush && isStraight && getRankValue(sorted[0].rank) === 14) {
    return {
      rank: HandRank.ROYAL_FLUSH,
      rankName: 'Royal Flush',
      value: 9000000 + getRankValue(sorted[0].rank),
      cards: sorted,
      description: 'Royal Flush',
    };
  }
  
  // Straight Flush
  if (isFlush && isStraight) {
    return {
      rank: HandRank.STRAIGHT_FLUSH,
      rankName: 'Straight Flush',
      value: 8000000 + getRankValue(sorted[0].rank),
      cards: sorted,
      description: `Straight Flush, ${sorted[0].rank} high`,
    };
  }
  
  // Four of a Kind
  if (rankCounts.some(c => c.count === 4)) {
    const quad = rankCounts.find(c => c.count === 4)!;
    const kicker = rankCounts.find(c => c.count === 1)!;
    return {
      rank: HandRank.FOUR_OF_A_KIND,
      rankName: 'Four of a Kind',
      value: 7000000 + getRankValue(quad.rank) * 100 + getRankValue(kicker.rank),
      cards: sorted,
      description: `Four ${quad.rank}s`,
    };
  }
  
  // Full House
  if (rankCounts.some(c => c.count === 3) && rankCounts.some(c => c.count === 2)) {
    const trips = rankCounts.find(c => c.count === 3)!;
    const pair = rankCounts.find(c => c.count === 2)!;
    return {
      rank: HandRank.FULL_HOUSE,
      rankName: 'Full House',
      value: 6000000 + getRankValue(trips.rank) * 100 + getRankValue(pair.rank),
      cards: sorted,
      description: `Full House, ${trips.rank}s over ${pair.rank}s`,
    };
  }
  
  // Flush
  if (isFlush) {
    const value = 5000000 + sorted.reduce((sum, card, idx) => 
      sum + getRankValue(card.rank) * Math.pow(100, 4 - idx), 0);
    return {
      rank: HandRank.FLUSH,
      rankName: 'Flush',
      value,
      cards: sorted,
      description: `Flush, ${sorted[0].rank} high`,
    };
  }
  
  // Straight
  if (isStraight) {
    return {
      rank: HandRank.STRAIGHT,
      rankName: 'Straight',
      value: 4000000 + getRankValue(sorted[0].rank),
      cards: sorted,
      description: `Straight, ${sorted[0].rank} high`,
    };
  }
  
  // Three of a Kind
  if (rankCounts.some(c => c.count === 3)) {
    const trips = rankCounts.find(c => c.count === 3)!;
    const kickers = rankCounts.filter(c => c.count === 1).map(c => getRankValue(c.rank));
    const kickerValue = kickers[0] * 10000 + (kickers[1] || 0) * 100;
    return {
      rank: HandRank.THREE_OF_A_KIND,
      rankName: 'Three of a Kind',
      value: 3000000 + getRankValue(trips.rank) * 100000 + kickerValue,
      cards: sorted,
      description: `Three ${trips.rank}s`,
    };
  }
  
  // Two Pair
  const pairs = rankCounts.filter(c => c.count === 2);
  if (pairs.length === 2) {
    const highPair = pairs[0];
    const lowPair = pairs[1];
    const kicker = rankCounts.find(c => c.count === 1)!;
    return {
      rank: HandRank.TWO_PAIR,
      rankName: 'Two Pair',
      value: 2000000 + getRankValue(highPair.rank) * 10000 + 
             getRankValue(lowPair.rank) * 100 + getRankValue(kicker.rank),
      cards: sorted,
      description: `Two Pair, ${highPair.rank}s and ${lowPair.rank}s`,
    };
  }
  
  // One Pair
  if (pairs.length === 1) {
    const pair = pairs[0];
    const kickers = rankCounts.filter(c => c.count === 1).map(c => getRankValue(c.rank));
    const kickerValue = kickers.reduce((sum, k, idx) => 
      sum + k * Math.pow(100, 2 - idx), 0);
    return {
      rank: HandRank.PAIR,
      rankName: 'Pair',
      value: 1000000 + getRankValue(pair.rank) * 100000 + kickerValue,
      cards: sorted,
      description: `Pair of ${pair.rank}s`,
    };
  }
  
  // High Card
  const kickerValue = sorted.reduce((sum, card, idx) => 
    sum + getRankValue(card.rank) * Math.pow(100, 4 - idx), 0);
  return {
    rank: HandRank.HIGH_CARD,
    rankName: 'High Card',
    value: kickerValue,
    cards: sorted,
    description: `${sorted[0].rank} high`,
  };
}

/**
 * Check if all cards are the same suit
 */
function checkFlush(cards: Card[]): boolean {
  const suit = cards[0].suit;
  return cards.every(card => card.suit === suit);
}

/**
 * Check if cards form a straight
 */
function checkStraight(cards: Card[]): boolean {
  const values = cards.map(c => getRankValue(c.rank)).sort((a, b) => b - a);
  
  // Check regular straight
  let isStraight = true;
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] - values[i + 1] !== 1) {
      isStraight = false;
      break;
    }
  }
  
  if (isStraight) return true;
  
  // Check A-2-3-4-5 (wheel)
  if (values[0] === 14 && values[1] === 5 && values[2] === 4 && 
      values[3] === 3 && values[4] === 2) {
    return true;
  }
  
  return false;
}

/**
 * Count occurrences of each rank
 */
interface RankCount {
  rank: Rank;
  count: number;
}

function getRankCounts(cards: Card[]): RankCount[] {
  const counts = new Map<Rank, number>();
  
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
  }
  
  const result: RankCount[] = Array.from(counts.entries()).map(([rank, count]) => ({
    rank,
    count,
  }));
  
  // Sort by count (descending), then by rank value (descending)
  result.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return getRankValue(b.rank) - getRankValue(a.rank);
  });
  
  return result;
}

/**
 * Get all combinations of k elements from array
 */
function getCombinations<T>(array: T[], k: number): T[][] {
  if (k === 1) return array.map(item => [item]);
  if (k === array.length) return [array];
  
  const result: T[][] = [];
  
  for (let i = 0; i <= array.length - k; i++) {
    const head = array[i];
    const tailCombos = getCombinations(array.slice(i + 1), k - 1);
    for (const combo of tailCombos) {
      result.push([head, ...combo]);
    }
  }
  
  return result;
}

/**
 * Compare two hands and return the winner (1 if hand1 wins, -1 if hand2 wins, 0 if tie)
 */
export function compareHands(hand1: HandEvaluation, hand2: HandEvaluation): number {
  if (hand1.value > hand2.value) return 1;
  if (hand1.value < hand2.value) return -1;
  return 0;
}

/**
 * Find the winner(s) from multiple hands
 */
export function findWinners(hands: { playerId: string; hand: HandEvaluation }[]): string[] {
  if (hands.length === 0) return [];
  if (hands.length === 1) return [hands[0].playerId];
  
  let maxValue = hands[0].hand.value;
  let winners = [hands[0].playerId];
  
  for (let i = 1; i < hands.length; i++) {
    const currentValue = hands[i].hand.value;
    if (currentValue > maxValue) {
      maxValue = currentValue;
      winners = [hands[i].playerId];
    } else if (currentValue === maxValue) {
      winners.push(hands[i].playerId);
    }
  }
  
  return winners;
}

