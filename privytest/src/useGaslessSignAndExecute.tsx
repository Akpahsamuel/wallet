import { useMutation } from '@tanstack/react-query';
import { Transaction } from '@mysten/sui/transactions';
import { useSuiClient, useCurrentAccount, useSignTransaction } from '@mysten/dapp-kit';
import { useGaslessTransaction } from './GaslessTransactionProvider';

interface GaslessSignAndExecuteTransactionArgs {
  transaction: Transaction;
  useGasless?: boolean;
}

interface GaslessSignAndExecuteTransactionResult {
  digest: string;
  effects?: any;
  events?: any;
}

export function useGaslessSignAndExecuteTransaction() {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { executeGaslessTransaction, isGaslessEnabled } = useGaslessTransaction();
  const { mutateAsync: signTransaction } = useSignTransaction();

  return useMutation({
    mutationFn: async ({
      transaction,
      useGasless = true,
    }: GaslessSignAndExecuteTransactionArgs): Promise<GaslessSignAndExecuteTransactionResult> => {
      
      // If gasless is enabled and requested, use gasless execution
      if (useGasless && isGaslessEnabled) {
        if (!currentAccount?.address) {
          throw new Error('No account connected for gasless transaction');
        }

        // Create a user signing function that uses the connected wallet
        const userSignTransaction = async (txBytes: Uint8Array) => {
          const result = await signTransaction({
            transaction: Transaction.from(txBytes),
          });
          return { signature: result.signature };
        };

        const digest = await executeGaslessTransaction(
          transaction, 
          currentAccount.address,
          userSignTransaction
        );
        
        // Wait for transaction and get full result
        const result = await suiClient.waitForTransaction({
          digest,
          options: {
            showEffects: true,
            showEvents: true,
          },
        });

        return {
          digest,
          effects: result.effects,
          events: result.events,
        };
      }

      // Fallback to regular transaction execution
      if (!currentAccount?.address) {
        throw new Error('No account connected for regular transaction execution');
      }

      // For regular transactions, we need to handle signing through the wallet
      // This is a simplified version - in practice you'd integrate with the wallet provider
      throw new Error('Regular transaction execution not implemented in this gasless hook. Use the standard useSignAndExecuteTransaction hook instead.');
    },
  });
}

// Alternative hook that automatically chooses between gasless and regular execution
export function useSmartSignAndExecuteTransaction() {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { executeGaslessTransaction, isGaslessEnabled } = useGaslessTransaction();
  const { mutateAsync: signTransaction } = useSignTransaction();

  return useMutation({
    mutationFn: async ({
      transaction,
      preferGasless = true,
    }: {
      transaction: Transaction;
      preferGasless?: boolean;
    }): Promise<GaslessSignAndExecuteTransactionResult> => {
      
      // Try gasless first if enabled and preferred
      if (preferGasless && isGaslessEnabled) {
        try {
          if (!currentAccount?.address) {
            throw new Error('No account connected for gasless transaction');
          }

          // Create a user signing function that uses the connected wallet
          const userSignTransaction = async (txBytes: Uint8Array) => {
            const result = await signTransaction({
              transaction: Transaction.from(txBytes),
            });
            return { signature: result.signature };
          };

          const digest = await executeGaslessTransaction(
            transaction, 
            currentAccount.address,
            userSignTransaction
          );
          
          const result = await suiClient.waitForTransaction({
            digest,
            options: {
              showEffects: true,
              showEvents: true,
            },
          });

          return {
            digest,
            effects: result.effects,
            events: result.events,
          };
        } catch (error) {
          console.warn('Gasless transaction failed, falling back to regular transaction:', error);
          // Fall through to regular transaction
        }
      }

      // If gasless failed or not preferred, throw error since we can't handle wallet signing here
      throw new Error('Gasless transaction failed and regular transaction fallback is not implemented in this hook');
    },
  });
} 