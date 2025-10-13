// Card types
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type CardString = string; // e.g., "Ah", "Kd", "2c"

// Hand rankings
export enum HandRank {
  HIGH_CARD = 0,
  PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  STRAIGHT_FLUSH = 8,
  ROYAL_FLUSH = 9,
}

export interface HandEvaluation {
  rank: HandRank;
  rankName: string;
  value: number; // For comparison
  cards: Card[]; // The 5 best cards
  description: string;
}

// Player actions
export enum PlayerAction {
  FOLD = 'fold',
  CHECK = 'check',
  CALL = 'call',
  RAISE = 'raise',
  ALL_IN = 'all_in',
}

export interface PlayerActionData {
  action: PlayerAction;
  amount?: number;
  timestamp: number;
}

// Game state
export enum BettingRound {
  PRE_FLOP = 'pre_flop',
  FLOP = 'flop',
  TURN = 'turn',
  RIVER = 'river',
  SHOWDOWN = 'showdown',
}

export interface PlayerState {
  userId: string;
  walletAddress: string;
  username?: string;
  seatPosition: number;
  chips: number;
  bet: number;
  cards: Card[];
  status: 'active' | 'folded' | 'all_in' | 'sitting_out' | 'eliminated';
  lastAction?: PlayerActionData;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

export interface GameState {
  gameId: string;
  tournamentId: string;
  players: PlayerState[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  currentPlayerSeat: number | null;
  dealerSeat: number;
  smallBlind: number;
  bigBlind: number;
  bettingRound: BettingRound;
  deck: Card[];
  handNumber: number;
  status: 'waiting' | 'dealing' | 'betting' | 'showdown' | 'complete';
}

export interface Pot {
  amount: number;
  eligiblePlayers: string[]; // userIds
}

export interface WinnerInfo {
  userId: string;
  hand: HandEvaluation;
  potAmount: number;
}

