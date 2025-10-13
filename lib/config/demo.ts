/**
 * Demo Mode Configuration
 * 
 * When DEMO_MODE is enabled:
 * - No real Solana transactions are required
 * - Mock wallet signatures are accepted
 * - Automatic prize distribution happens without blockchain
 * - All game logic works exactly the same
 * 
 * Enable by setting: NEXT_PUBLIC_DEMO_MODE=true in .env
 */

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export const DEMO_CONFIG = {
  // Mock wallet addresses for testing
  DEMO_ADMIN_WALLET: 'DemoAdmin1111111111111111111111111111111',
  DEMO_PLAYER_WALLETS: [
    'DemoPlayer11111111111111111111111111111111',
    'DemoPlayer21111111111111111111111111111111',
    'DemoPlayer31111111111111111111111111111111',
    'DemoPlayer41111111111111111111111111111111',
    'DemoPlayer51111111111111111111111111111111',
    'DemoPlayer61111111111111111111111111111111',
  ],
  
  // Mock transaction signatures
  MOCK_TX_PREFIX: 'demo_tx_',
  
  // Demo defaults
  DEFAULT_BALANCE: 1000, // 1000 SOL in demo mode
  AUTO_APPROVE_TRANSACTIONS: true,
  SKIP_SIGNATURE_VERIFICATION: true,
};

/**
 * Generate a mock transaction signature
 */
export function generateMockSignature(): string {
  return `${DEMO_CONFIG.MOCK_TX_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if a transaction is a mock transaction
 */
export function isMockTransaction(signature: string): boolean {
  return signature.startsWith(DEMO_CONFIG.MOCK_TX_PREFIX);
}

/**
 * Log demo mode warning
 */
export function logDemoModeWarning() {
  if (DEMO_MODE) {
    console.warn('⚠️  DEMO MODE ENABLED - No real blockchain transactions will occur');
    console.warn('⚠️  To use real Solana blockchain, set NEXT_PUBLIC_DEMO_MODE=false');
  }
}

