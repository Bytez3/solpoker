import { PlayerAction, GameState } from './types';

export interface ActionValidation {
  valid: boolean;
  error?: string;
  minBet?: number;
  maxBet?: number;
  callAmount?: number;
}

/**
 * Validate if a player action is legal
 */
export function validateAction(
  gameState: GameState,
  playerSeat: number,
  action: PlayerAction,
  amount?: number
): ActionValidation {
  const player = gameState.players.find(p => p.seatPosition === playerSeat);
  
  if (!player) {
    return { valid: false, error: 'Player not found' };
  }
  
  if (player.status === 'folded' || player.status === 'eliminated') {
    return { valid: false, error: 'Player is not active' };
  }
  
  if (gameState.currentPlayerSeat !== playerSeat) {
    return { valid: false, error: 'Not your turn' };
  }
  
  const callAmount = gameState.currentBet - player.bet;
  const minRaise = gameState.currentBet + gameState.bigBlind;
  
  switch (action) {
    case PlayerAction.FOLD:
      return { valid: true };
      
    case PlayerAction.CHECK:
      if (callAmount > 0) {
        return { valid: false, error: 'Cannot check, must call or raise' };
      }
      return { valid: true };
      
    case PlayerAction.CALL:
      if (callAmount === 0) {
        return { valid: false, error: 'Nothing to call, you can check' };
      }
      if (player.chips < callAmount) {
        return { valid: false, error: 'Not enough chips, must go all-in' };
      }
      return { valid: true, callAmount };
      
    case PlayerAction.RAISE:
      if (!amount) {
        return { valid: false, error: 'Raise amount not specified' };
      }
      if (amount < minRaise) {
        return { 
          valid: false, 
          error: `Minimum raise is ${minRaise}`,
          minBet: minRaise,
        };
      }
      if (amount > player.chips + player.bet) {
        return { 
          valid: false, 
          error: 'Cannot bet more than you have',
          maxBet: player.chips + player.bet,
        };
      }
      return { valid: true, minBet: minRaise, maxBet: player.chips + player.bet };
      
    case PlayerAction.ALL_IN:
      if (player.chips === 0) {
        return { valid: false, error: 'No chips to go all-in with' };
      }
      return { valid: true, maxBet: player.chips + player.bet };
      
    default:
      return { valid: false, error: 'Invalid action' };
  }
}

/**
 * Get available actions for a player
 */
export function getAvailableActions(
  gameState: GameState,
  playerSeat: number
): { action: PlayerAction; label: string; amount?: number }[] {
  const player = gameState.players.find(p => p.seatPosition === playerSeat);
  
  if (!player || player.status !== 'active') {
    return [];
  }
  
  if (gameState.currentPlayerSeat !== playerSeat) {
    return [];
  }
  
  const actions: { action: PlayerAction; label: string; amount?: number }[] = [];
  const callAmount = gameState.currentBet - player.bet;
  
  // Fold is always available
  actions.push({ action: PlayerAction.FOLD, label: 'Fold' });
  
  // Check or Call
  if (callAmount === 0) {
    actions.push({ action: PlayerAction.CHECK, label: 'Check' });
  } else if (player.chips >= callAmount) {
    actions.push({ 
      action: PlayerAction.CALL, 
      label: `Call ${callAmount}`,
      amount: callAmount,
    });
  }
  
  // Raise
  if (player.chips > callAmount) {
    const minRaise = gameState.currentBet + gameState.bigBlind;
    if (player.chips + player.bet >= minRaise) {
      actions.push({ 
        action: PlayerAction.RAISE, 
        label: 'Raise',
      });
    }
  }
  
  // All-in
  if (player.chips > 0) {
    actions.push({ 
      action: PlayerAction.ALL_IN, 
      label: `All-In (${player.chips})`,
      amount: player.chips,
    });
  }
  
  return actions;
}

/**
 * Apply an action to the game state
 */
export function applyAction(
  gameState: GameState,
  playerSeat: number,
  action: PlayerAction,
  amount?: number
): GameState {
  const newState = { ...gameState };
  const playerIndex = newState.players.findIndex(p => p.seatPosition === playerSeat);
  
  if (playerIndex === -1) {
    throw new Error('Player not found');
  }
  
  const player = { ...newState.players[playerIndex] };
  const timestamp = Date.now();
  
  switch (action) {
    case PlayerAction.FOLD:
      player.status = 'folded';
      player.lastAction = { action, timestamp };
      break;
      
    case PlayerAction.CHECK:
      player.lastAction = { action, timestamp };
      break;
      
    case PlayerAction.CALL:
      const callAmount = newState.currentBet - player.bet;
      player.chips -= callAmount;
      player.bet += callAmount;
      newState.pot += callAmount;
      player.lastAction = { action, amount: callAmount, timestamp };
      break;
      
    case PlayerAction.RAISE:
      if (!amount) throw new Error('Raise amount required');
      const raiseAmount = amount - player.bet;
      player.chips -= raiseAmount;
      player.bet = amount;
      newState.currentBet = amount;
      newState.pot += raiseAmount;
      player.lastAction = { action, amount, timestamp };
      break;
      
    case PlayerAction.ALL_IN:
      const allInAmount = player.chips;
      player.chips = 0;
      player.bet += allInAmount;
      newState.pot += allInAmount;
      player.status = 'all_in';
      if (player.bet > newState.currentBet) {
        newState.currentBet = player.bet;
      }
      player.lastAction = { action, amount: allInAmount, timestamp };
      break;
  }
  
  newState.players[playerIndex] = player;
  
  return newState;
}

/**
 * Check if betting round is complete
 */
export function isBettingRoundComplete(gameState: GameState): boolean {
  const activePlayers = gameState.players.filter(
    p => p.status === 'active' || p.status === 'all_in'
  );
  
  if (activePlayers.length === 0) {
    return true;
  }
  
  // Check if all active players have acted and matched the current bet
  const activePlayersNotAllIn = activePlayers.filter(p => p.status === 'active');
  
  if (activePlayersNotAllIn.length === 0) {
    return true; // All remaining players are all-in
  }
  
  const allMatched = activePlayersNotAllIn.every(
    p => p.bet === gameState.currentBet && p.lastAction !== undefined
  );
  
  return allMatched;
}

/**
 * Get next active player seat
 */
export function getNextPlayerSeat(gameState: GameState, currentSeat: number): number | null {
  const activePlayers = gameState.players.filter(
    p => p.status === 'active'
  );
  
  if (activePlayers.length === 0) {
    return null;
  }
  
  // Find next player clockwise
  let nextSeat = (currentSeat + 1) % 6;
  let attempts = 0;
  
  while (attempts < 6) {
    const player = gameState.players.find(p => p.seatPosition === nextSeat);
    if (player && player.status === 'active') {
      return nextSeat;
    }
    nextSeat = (nextSeat + 1) % 6;
    attempts++;
  }
  
  return null;
}

