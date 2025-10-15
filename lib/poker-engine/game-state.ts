import { 
  GameState, 
  PlayerState, 
  BettingRound,
  PlayerAction,
} from './types';
import { createDeck, shuffleDeck, dealCards } from './deck';
import { evaluateHand } from './hand-evaluator';
import { applyAction, getNextPlayerSeat, isBettingRoundComplete } from './actions';
import { 
  calculatePots, 
  distributePots, 
  collectBets, 
  awardPot, 
  eliminateBrokePlayers,
  getActivePlayers,
} from './pot-calculator';

/**
 * Initialize a new game
 */
export function initializeGame(
  gameId: string,
  tournamentId: string,
  players: { userId: string; walletAddress: string; username?: string }[],
  buyIn: number,
  smallBlind: number,
  bigBlind: number
): GameState {
  if (players.length < 2 || players.length > 10) {
    throw new Error('Game requires between 2 and 10 players');
  }
  
  const playerStates: PlayerState[] = players.map((player, index) => ({
    userId: player.userId,
    walletAddress: player.walletAddress,
    username: player.username,
    seatPosition: index,
    chips: buyIn,
    bet: 0,
    cards: [],
    status: 'active',
    isDealer: index === 0,
    isSmallBlind: index === 1,
    isBigBlind: index === 2,
  }));
  
  return {
    gameId,
    tournamentId,
    players: playerStates,
    communityCards: [],
    pot: 0,
    currentBet: 0,
    currentPlayerSeat: null,
    dealerSeat: 0,
    smallBlind,
    bigBlind,
    bettingRound: BettingRound.PRE_FLOP,
    deck: [],
    handNumber: 0,
    status: 'waiting',
  };
}

/**
 * Start a new hand
 */
export function startNewHand(gameState: GameState): GameState {
  const newState = { ...gameState };
  
  // Move dealer button (circular for any number of players)
  newState.dealerSeat = (newState.dealerSeat + 1) % newState.players.length;
  newState.handNumber++;
  
  // Reset players
  newState.players = newState.players.map((player) => {
    const seatPosition = player.seatPosition;
    const dealerSeat = newState.dealerSeat;
    
    return {
      ...player,
      bet: 0,
      cards: [],
      status: player.chips > 0 ? 'active' : 'eliminated',
      lastAction: undefined,
      isDealer: seatPosition === dealerSeat,
      isSmallBlind: seatPosition === (dealerSeat + 1) % newState.players.length,
      isBigBlind: seatPosition === (dealerSeat + 2) % newState.players.length,
    };
  });
  
  // Create and shuffle deck
  newState.deck = shuffleDeck(createDeck());
  newState.communityCards = [];
  newState.pot = 0;
  newState.currentBet = newState.bigBlind;
  newState.bettingRound = BettingRound.PRE_FLOP;
  newState.status = 'dealing';
  
  // Post blinds (dynamic for any number of players)
  const smallBlindSeat = (newState.dealerSeat + 1) % newState.players.length;
  const bigBlindSeat = (newState.dealerSeat + 2) % newState.players.length;
  
  const smallBlindPlayer = newState.players.find(p => p.seatPosition === smallBlindSeat);
  const bigBlindPlayer = newState.players.find(p => p.seatPosition === bigBlindSeat);
  
  if (smallBlindPlayer) {
    const sbAmount = Math.min(smallBlindPlayer.chips, newState.smallBlind);
    smallBlindPlayer.chips -= sbAmount;
    smallBlindPlayer.bet = sbAmount;
    newState.pot += sbAmount;
    if (smallBlindPlayer.chips === 0) {
      smallBlindPlayer.status = 'all_in';
    }
  }
  
  if (bigBlindPlayer) {
    const bbAmount = Math.min(bigBlindPlayer.chips, newState.bigBlind);
    bigBlindPlayer.chips -= bbAmount;
    bigBlindPlayer.bet = bbAmount;
    newState.pot += bbAmount;
    if (bigBlindPlayer.chips === 0) {
      bigBlindPlayer.status = 'all_in';
    }
  }
  
  // Deal hole cards to each player
  for (const player of newState.players) {
    if (player.status !== 'eliminated') {
      const { cards, remainingDeck } = dealCards(newState.deck, 2);
      player.cards = cards;
      newState.deck = remainingDeck;
    }
  }
  
  // Set current player (UTG - under the gun, after big blind)
  newState.currentPlayerSeat = getNextPlayerSeat(newState, bigBlindSeat);
  newState.status = 'betting';
  
  return newState;
}

/**
 * Process a player action
 */
export function processPlayerAction(
  gameState: GameState,
  playerSeat: number,
  action: PlayerAction,
  amount?: number
): GameState {
  let newState = applyAction(gameState, playerSeat, action, amount);
  
  // Check if only one player remains
  const activePlayers = getActivePlayers(newState.players);
  if (activePlayers.length === 1) {
    // Everyone else folded, award pot to last player
    return finishHandEarly(newState, activePlayers[0].userId);
  }
  
  // Move to next player
  const nextSeat = getNextPlayerSeat(newState, playerSeat);
  newState.currentPlayerSeat = nextSeat;
  
  // Check if betting round is complete
  if (isBettingRoundComplete(newState)) {
    newState = advanceBettingRound(newState);
  }
  
  return newState;
}

/**
 * Advance to next betting round
 */
export function advanceBettingRound(gameState: GameState): GameState {
  const newState = { ...gameState };
  
  // Collect bets into pot
  const collectedBets = collectBets(newState.players);
  newState.pot += collectedBets;
  newState.currentBet = 0;
  
  // Reset last actions
  newState.players.forEach(p => {
    if (p.status === 'active') {
      p.lastAction = undefined;
    }
  });
  
  switch (newState.bettingRound) {
    case BettingRound.PRE_FLOP:
      // Deal flop (3 cards)
      const { cards: flop, remainingDeck: deckAfterFlop } = dealCards(newState.deck, 3);
      newState.communityCards = flop;
      newState.deck = deckAfterFlop;
      newState.bettingRound = BettingRound.FLOP;
      break;
      
    case BettingRound.FLOP:
      // Deal turn (1 card)
      const { cards: turn, remainingDeck: deckAfterTurn } = dealCards(newState.deck, 1);
      newState.communityCards = [...newState.communityCards, ...turn];
      newState.deck = deckAfterTurn;
      newState.bettingRound = BettingRound.TURN;
      break;
      
    case BettingRound.TURN:
      // Deal river (1 card)
      const { cards: river, remainingDeck: deckAfterRiver } = dealCards(newState.deck, 1);
      newState.communityCards = [...newState.communityCards, ...river];
      newState.deck = deckAfterRiver;
      newState.bettingRound = BettingRound.RIVER;
      break;
      
    case BettingRound.RIVER:
      // Go to showdown
      newState.bettingRound = BettingRound.SHOWDOWN;
      newState.status = 'showdown';
      return determineWinner(newState);
      
    default:
      break;
  }
  
  // Set first player to act (first active player after dealer)
  newState.currentPlayerSeat = getNextPlayerSeat(newState, newState.dealerSeat);
  
  // If all players are all-in, skip to showdown
  const playersCanAct = newState.players.filter(p => p.status === 'active');
  if (playersCanAct.length === 0) {
    return runAllInShowdown(newState);
  }
  
  return newState;
}

/**
 * Run all-in showdown (deal remaining cards without betting)
 */
function runAllInShowdown(gameState: GameState): GameState {
  const newState = { ...gameState };
  
  // Deal remaining community cards
  while (newState.communityCards.length < 5) {
    const { cards, remainingDeck } = dealCards(newState.deck, 1);
    newState.communityCards = [...newState.communityCards, ...cards];
    newState.deck = remainingDeck;
  }
  
  newState.bettingRound = BettingRound.SHOWDOWN;
  newState.status = 'showdown';
  
  return determineWinner(newState);
}

/**
 * Determine winner at showdown
 */
export function determineWinner(gameState: GameState): GameState {
  const newState = { ...gameState };
  
  // Get active players (not folded)
  const activePlayers = getActivePlayers(newState.players);
  
  // Evaluate each player's hand
  const hands = activePlayers.map(player => {
    const allCards = [...player.cards, ...newState.communityCards];
    const evaluation = evaluateHand(allCards);
    return {
      userId: player.userId,
      hand: evaluation,
      handValue: evaluation.value,
    };
  });
  
  // Calculate pots (main pot and side pots)
  const pots = calculatePots(newState.players);
  
  // Distribute pots to winners
  const payouts = distributePots(pots, hands);
  
  // Award payouts to players
  newState.players = awardPot(newState.players, payouts);
  
  // Eliminate players with no chips
  newState.players = eliminateBrokePlayers(newState.players);
  
  // Reset pot
  newState.pot = 0;
  newState.status = 'complete';
  
  return newState;
}

/**
 * Finish hand early when all but one player folds
 */
function finishHandEarly(gameState: GameState, winnerId: string): GameState {
  const newState = { ...gameState };
  
  // Collect all bets into pot
  const collectedBets = collectBets(newState.players);
  newState.pot += collectedBets;
  
  // Award entire pot to winner
  const winner = newState.players.find(p => p.userId === winnerId);
  if (winner) {
    winner.chips += newState.pot;
  }
  
  newState.pot = 0;
  newState.status = 'complete';
  newState.bettingRound = BettingRound.SHOWDOWN;
  
  return newState;
}

/**
 * Check if game is over (only one player with chips remaining)
 */
export function isGameOver(gameState: GameState): boolean {
  const playersWithChips = gameState.players.filter(p => p.chips > 0);
  return playersWithChips.length === 1;
}

/**
 * Get game winner
 */
export function getGameWinner(gameState: GameState): PlayerState | null {
  const playersWithChips = gameState.players.filter(p => p.chips > 0);
  return playersWithChips.length === 1 ? playersWithChips[0] : null;
}

/**
 * Sanitize game state for client (hide other players' cards)
 */
export function sanitizeGameStateForPlayer(
  gameState: GameState,
  userId: string
): GameState {
  const sanitized = { ...gameState };
  
  sanitized.players = gameState.players.map(player => {
    if (player.userId === userId || gameState.status === 'showdown') {
      return player;
    }
    
    // Hide other players' cards
    return {
      ...player,
      cards: [],
    };
  });
  
  // Don't send remaining deck to client
  sanitized.deck = [];
  
  return sanitized;
}

