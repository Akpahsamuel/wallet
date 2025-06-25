import { Transaction } from "@mysten/sui/transactions";
import { Button, Container, Flex, Heading, Text, Badge, Switch } from "@radix-ui/themes";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "./networkConfig";
import ClipLoader from "react-spinners/ClipLoader";
import { useState } from "react";
import { useGaslessSignAndExecuteTransaction } from "./useGaslessSignAndExecute";
import { useGaslessTransaction } from "./GaslessTransactionProvider";

export function CreateCounter({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const counterPackageId = useNetworkVariable("counterPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending, isSuccess } = useSignAndExecuteTransaction();
  const { mutate: executeGasless, isPending: isGaslessPending, isSuccess: isGaslessSuccess } = useGaslessSignAndExecuteTransaction();
  const { isGaslessEnabled, sponsorAddress } = useGaslessTransaction();
  
  const [useGaslessMode, setUseGaslessMode] = useState(true);

  const canUseGasless = isGaslessEnabled && useGaslessMode;
  const isLoading = canUseGasless ? isGaslessPending : isPending;
  const isComplete = canUseGasless ? isGaslessSuccess : isSuccess;

  function create() {
    const tx = new Transaction();

    tx.moveCall({
      arguments: [],
      target: `${counterPackageId}::counter::create`,
    });

    if (canUseGasless) {
      executeGasless(
        {
          transaction: tx,
          useGasless: true,
        },
        {
          onSuccess: async (result) => {
            console.log('Gasless counter creation successful:', result);
            
            // Wait for transaction and get effects
            const { effects } = await suiClient.waitForTransaction({
              digest: result.digest,
              options: {
                showEffects: true,
              },
            });

            const createdObjectId = effects?.created?.[0]?.reference?.objectId;
            if (createdObjectId) {
              onCreated(createdObjectId);
            } else {
              console.error('Failed to get created object ID from transaction effects');
            }
          },
          onError: (error) => {
            console.error('Gasless counter creation failed:', error);
            alert(`Gasless transaction failed: ${error.message}`);
          },
        }
      );
    } else {
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            console.log('Regular counter creation successful:', result);
            
            const { effects } = await suiClient.waitForTransaction({
              digest: result.digest,
              options: {
                showEffects: true,
              },
            });

            const createdObjectId = effects?.created?.[0]?.reference?.objectId;
            if (createdObjectId) {
              onCreated(createdObjectId);
            } else {
              console.error('Failed to get created object ID from transaction effects');
            }
          },
          onError: (error) => {
            console.error('Regular counter creation failed:', error);
            alert(`Transaction failed: ${error.message}`);
          },
        }
      );
    }
  }

  return (
    <Container>
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2">
          <Heading size="3">Create Counter</Heading>
          {canUseGasless ? (
            <Badge color="green">✨ Gasless Mode</Badge>
          ) : (
            <Badge color="blue">Regular Mode</Badge>
          )}
        </Flex>

        {/* Gasless Toggle */}
        {isGaslessEnabled && (
          <Flex align="center" gap="2">
            <Text size="2">Use Gasless Transaction:</Text>
            <Switch
              checked={useGaslessMode}
              onCheckedChange={setUseGaslessMode}
            />
          </Flex>
        )}

        {sponsorAddress && canUseGasless && (
          <Text size="2" color="gray">
            Sponsor: {sponsorAddress}
          </Text>
        )}

        {canUseGasless ? (
          <Text size="2" color="green">
            💡 Create a counter without spending any gas! The sponsor pays for you.
          </Text>
        ) : (
          <Text size="2" color="gray">
            💰 This transaction will use your wallet's SUI for gas fees.
          </Text>
        )}

        <Button
          size="3"
          onClick={create}
          disabled={isComplete || isLoading}
          color={canUseGasless ? "blue" : undefined}
        >
          {isComplete || isLoading ? (
            <ClipLoader size={20} />
          ) : (
            canUseGasless ? "🚀 Create Gasless Counter" : "Create Counter"
          )}
        </Button>

        {!isGaslessEnabled && (
          <Text size="2" color="gray">
            ℹ️ Gasless transactions not available
          </Text>
        )}
      </Flex>
    </Container>
  );
}
