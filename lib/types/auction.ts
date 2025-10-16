// Auction Types for Poker Marketplace
export enum AuctionType {
  TOURNAMENT_SEAT = 'tournament_seat',
  NFT_THEME = 'nft_theme',
  PRIZE_POOL = 'prize_pool',
  ACHIEVEMENT = 'achievement',
  CUSTOM = 'custom'
}

export enum AuctionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
  SETTLED = 'settled'
}

export enum AuctionBidType {
  SOL = 'sol',
  SPL_TOKEN = 'spl_token',
  POINTS = 'points'
}

// Auction Model Structure
export interface Auction {
  id: string;
  title: string;
  description: string;
  type: AuctionType;
  status: AuctionStatus;
  
  // Auction Details
  startingPrice: number;
  reservePrice?: number;
  buyNowPrice?: number;
  bidIncrement: number;
  
  // Timing
  startTime: Date;
  endTime: Date;
  extendedTime?: number; // Auto-extend if bid in last X minutes
  
  // Bidding
  bidType: AuctionBidType;
  tokenMint?: string; // For SPL token auctions
  tokenDecimals?: number;
  
  // Participants
  creatorId: string;
  winnerId?: string;
  currentBid?: number;
  bidCount: number;
  
  // Metadata
  imageUrl?: string;
  metadata?: Record<string, any>;
  
  // Tournament-specific (if applicable)
  tournamentId?: string;
  seatNumber?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Bid Model Structure
export interface AuctionBid {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  bidType: AuctionBidType;
  timestamp: Date;
  isWinning: boolean;
  isCancelled: boolean;
}

// Auction Events
export interface AuctionEvent {
  type: 'bid_placed' | 'bid_outbid' | 'auction_ended' | 'auction_extended';
  auctionId: string;
  bidderId?: string;
  amount?: number;
  timestamp: Date;
}
