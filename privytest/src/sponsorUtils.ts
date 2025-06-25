import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { requestSuiFromFaucetV0, getFaucetHost } from '@mysten/sui/faucet';

/**
 * Create a sponsor keypair from environment variables or generate a new one
 * In production, this would be managed server-side and never exposed to the client
 */
export function createSponsorKeypair(): Ed25519Keypair {
  // Try to get credentials from environment variables
  const privateKey = import.meta.env.VITE_SPONSOR_PRIVATE_KEY;
  const mnemonic = import.meta.env.VITE_SPONSOR_MNEMONIC;
  
  if (privateKey) {
    console.log('Using sponsor private key from environment variables');
    return Ed25519Keypair.fromSecretKey(privateKey);
  }
  
  if (mnemonic) {
    console.log('Using sponsor mnemonic from environment variables');
    return Ed25519Keypair.deriveKeypair(mnemonic);
  }
  
  // Fallback: Try to get from localStorage (for demo persistence)
  const storedPrivateKey = localStorage.getItem('demo_sponsor_private_key');
  
  if (storedPrivateKey) {
    console.log('Using stored demo sponsor account');
    return Ed25519Keypair.fromSecretKey(storedPrivateKey);
  }
  
  // Last resort: Generate a new keypair for demo purposes
  console.log('Creating new demo sponsor account (consider setting VITE_SPONSOR_PRIVATE_KEY or VITE_SPONSOR_MNEMONIC in .env)');
  const sponsorKeypair = new Ed25519Keypair();
  const secretKeyString = sponsorKeypair.getSecretKey();
  localStorage.setItem('demo_sponsor_private_key', secretKeyString);
  
  return sponsorKeypair;
}

/**
 * Fund a sponsor account with SUI tokens
 * This is for demonstration purposes only
 */
export async function fundSponsorAccount(
  sponsorAddress: string,
  network: 'testnet' | 'devnet' = 'testnet'
): Promise<void> {
  try {
    const faucetHost = getFaucetHost(network);
    await requestSuiFromFaucetV0({
      host: faucetHost,
      recipient: sponsorAddress,
    });
    console.log(`Requested test SUI for sponsor account: ${sponsorAddress}`);
  } catch (error) {
    console.error('Failed to fund sponsor account:', error);
    throw error;
  }
}

/**
 * Check if sponsor has enough SUI for gas payments
 */
export async function checkSponsorBalance(
  suiClient: SuiClient,
  sponsorAddress: string
): Promise<{ hasBalance: boolean; totalBalance: bigint; coinCount: number }> {
  try {
    const { data: coins } = await suiClient.getCoins({
      owner: sponsorAddress,
      coinType: '0x2::sui::SUI',
    });

    const totalBalance = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    const hasBalance = totalBalance > 0n && coins.length > 0;

    return {
      hasBalance,
      totalBalance,
      coinCount: coins.length,
    };
  } catch (error) {
    console.error('Failed to check sponsor balance:', error);
    return {
      hasBalance: false,
      totalBalance: 0n,
      coinCount: 0,
    };
  }
}

/**
 * Get sponsor keypair from environment variables or create/use demo sponsor
 */
export function getSponsorKeypair(): Ed25519Keypair {
  return createSponsorKeypair();
}

/**
 * Check if sponsor is configured via environment variables
 */
export function isSponsorConfiguredFromEnv(): boolean {
  return !!(import.meta.env.VITE_SPONSOR_PRIVATE_KEY || import.meta.env.VITE_SPONSOR_MNEMONIC);
}

/**
 * Get sponsor configuration source
 */
export function getSponsorSource(): 'env_private_key' | 'env_mnemonic' | 'localStorage' | 'generated' {
  if (import.meta.env.VITE_SPONSOR_PRIVATE_KEY) return 'env_private_key';
  if (import.meta.env.VITE_SPONSOR_MNEMONIC) return 'env_mnemonic';
  if (localStorage.getItem('demo_sponsor_private_key')) return 'localStorage';
  return 'generated';
}

/**
 * Clear stored demo sponsor (useful for testing different sponsors)
 */
export function clearDemoSponsor(): void {
  localStorage.removeItem('demo_sponsor_private_key');
  console.log('Cleared demo sponsor from localStorage');
}

// Legacy function for backward compatibility
export function getOrCreateDemoSponsor(): Ed25519Keypair {
  return getSponsorKeypair();
} 