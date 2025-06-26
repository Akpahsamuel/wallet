import { createContext, useContext, ReactNode } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

interface GaslessTransactionContextType {
  executeGaslessTransaction: (
    transaction: Transaction,
    sender: string,
    userSignTransaction: (txBytes: Uint8Array) => Promise<{ signature: string }>
  ) => Promise<string>;
  isGaslessEnabled: boolean;
  sponsorAddress?: string;
}

const GaslessTransactionContext = createContext<GaslessTransactionContextType | null>(null);

interface GaslessTransactionProviderProps {
  children: ReactNode;
  suiClient: SuiClient;
  sponsorKeypair?: Ed25519Keypair; // In production, this would be managed server-side
  enabled?: boolean;
}

export function GaslessTransactionProvider({
  children,
  suiClient,
  sponsorKeypair,
  enabled = true,
}: GaslessTransactionProviderProps) {
  const executeGaslessTransaction = async (
    transaction: Transaction,
    sender: string,
    userSignTransaction: (txBytes: Uint8Array) => Promise<{ signature: string }>
  ): Promise<string> => {
    if (!sponsorKeypair) {
      throw new Error('Sponsor keypair not configured for gasless transactions');
    }

    try {
      const sponsorAddress = sponsorKeypair.getPublicKey().toSuiAddress();
      
      // Build transaction kind bytes only (without gas configuration)
      const kindBytes = await transaction.build({ 
        client: suiClient, 
        onlyTransactionKind: true 
      });
      
      // Create sponsored transaction from kind bytes
      const sponsoredTx = Transaction.fromKind(kindBytes);
      
      // Set sender (user who initiated the transaction)
      sponsoredTx.setSender(sender);
      
      // Set sponsor as gas owner
      sponsoredTx.setGasOwner(sponsorAddress);
      
      // Get sponsor's coins for gas payment
      const { data: coins } = await suiClient.getCoins({
        owner: sponsorAddress,
        coinType: '0x2::sui::SUI',
      });

      if (coins.length === 0) {
        throw new Error('Sponsor has no SUI coins for gas payment');
      }

      // Set gas payment using sponsor's coins
      sponsoredTx.setGasPayment(coins.slice(0, 10).map(coin => ({
        objectId: coin.coinObjectId,
        version: coin.version,
        digest: coin.digest,
      })));

      // Build the sponsored transaction to get bytes for signing
      const transactionBytes = await sponsoredTx.build({ client: suiClient });
      
      // Get both signatures
      const userSignature = await userSignTransaction(transactionBytes);
      const sponsorSignature = await sponsorKeypair.signTransaction(transactionBytes);

      // Execute the sponsored transaction with both signatures
      // User signature comes first, then sponsor signature
      const result = await suiClient.executeTransactionBlock({
        transactionBlock: transactionBytes,
        signature: [userSignature.signature, sponsorSignature.signature],
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      return result.digest;
    } catch (error) {
      throw error;
    }
  };

  const contextValue: GaslessTransactionContextType = {
    executeGaslessTransaction,
    isGaslessEnabled: enabled && !!sponsorKeypair,
    sponsorAddress: sponsorKeypair?.getPublicKey().toSuiAddress(),
  };

  return (
    <GaslessTransactionContext.Provider value={contextValue}>
      {children}
    </GaslessTransactionContext.Provider>
  );
}

export function useGaslessTransaction() {
  const context = useContext(GaslessTransactionContext);
  if (!context) {
    throw new Error('useGaslessTransaction must be used within a GaslessTransactionProvider');
  }
  return context;
} 