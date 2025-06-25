import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import type { SuiObjectData } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Flex, Heading, Text, Badge, Switch } from "@radix-ui/themes";
import { useNetworkVariable } from "./networkConfig";
import { useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import { useGaslessSignAndExecuteTransaction } from "./useGaslessSignAndExecute";
import { useGaslessTransaction } from "./GaslessTransactionProvider";

export function Counter({ id }: { id: string }) {
  const counterPackageId = useNetworkVariable("counterPackageId");
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { mutate: executeGasless } = useGaslessSignAndExecuteTransaction();
  const { isGaslessEnabled, sponsorAddress } = useGaslessTransaction();
  
  const { data, isPending, error, refetch } = useSuiClientQuery("getObject", {
    id,
    options: {
      showContent: true,
      showOwner: true,
    },
  });

  const [waitingForTxn, setWaitingForTxn] = useState("");
  const [useGaslessMode, setUseGaslessMode] = useState(true);

  const executeMoveCall = (method: "increment" | "reset") => {
    setWaitingForTxn(method);

    const tx = new Transaction();

    if (method === "reset") {
      tx.moveCall({
        arguments: [tx.object(id), tx.pure.u64(0)],
        target: `${counterPackageId}::counter::set_value`,
      });
    } else {
      tx.moveCall({
        arguments: [tx.object(id)],
        target: `${counterPackageId}::counter::increment`,
      });
    }

    // Use gasless if enabled and selected
    if (useGaslessMode && isGaslessEnabled) {
      executeGasless(
        {
          transaction: tx,
          useGasless: true,
        },
        {
          onSuccess: (result) => {
            console.log('Gasless transaction successful:', result);
            suiClient.waitForTransaction({ digest: result.digest }).then(async () => {
              await refetch();
              setWaitingForTxn("");
            });
          },
          onError: (error) => {
            console.error('Gasless transaction failed:', error);
            setWaitingForTxn("");
            alert(`Gasless transaction failed: ${error.message}`);
          },
        }
      );
    } else {
      // Use regular transaction
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (tx) => {
            suiClient.waitForTransaction({ digest: tx.digest }).then(async () => {
              await refetch();
              setWaitingForTxn("");
            });
          },
          onError: (error) => {
            console.error('Regular transaction failed:', error);
            setWaitingForTxn("");
            alert(`Transaction failed: ${error.message}`);
          },
        }
      );
    }
  };

  if (isPending) return <Text>Loading...</Text>;

  if (error) return <Text>Error: {error.message}</Text>;

  if (!data.data) return <Text>Not found</Text>;

  const ownedByCurrentAccount =
    getCounterFields(data.data)?.owner === currentAccount?.address;

  const canUseGasless = isGaslessEnabled && useGaslessMode;

  return (
    <>
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2">
          <Heading size="3">Counter {id}</Heading>
          {canUseGasless ? (
            <Badge color="green">Gasless Mode</Badge>
          ) : (
            <Badge color="blue">Regular Mode</Badge>
          )}
        </Flex>

        {/* Gasless Toggle */}
        {isGaslessEnabled && (
          <Flex align="center" gap="2">
            <Text size="2">Use Gasless Transactions:</Text>
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

        <Flex direction="column" gap="2">
          <Text>Count: {getCounterFields(data.data)?.value}</Text>
          
          {canUseGasless && (
            <Text size="2" color="green">
              💡 Gas fees are paid by the sponsor!
            </Text>
          )}
          
          <Flex direction="row" gap="2">
            <Button
              onClick={() => executeMoveCall("increment")}
              disabled={waitingForTxn !== ""}
              color={canUseGasless ? "blue" : undefined}
            >
              {waitingForTxn === "increment" ? (
                <ClipLoader size={20} />
              ) : (
                canUseGasless ? "🚀 Gasless Increment" : "Increment"
              )}
            </Button>
            {ownedByCurrentAccount ? (
              <Button
                onClick={() => executeMoveCall("reset")}
                disabled={waitingForTxn !== ""}
                color={canUseGasless ? "orange" : undefined}
              >
                {waitingForTxn === "reset" ? (
                  <ClipLoader size={20} />
                ) : (
                  canUseGasless ? "🔄 Gasless Reset" : "Reset"
                )}
              </Button>
            ) : null}
          </Flex>

          {!isGaslessEnabled && (
            <Text size="2" color="gray">
              ℹ️ Gasless transactions not available
            </Text>
          )}
        </Flex>
      </Flex>
    </>
  );
}

function getCounterFields(data: SuiObjectData) {
  if (data.content?.dataType !== "moveObject") {
    return null;
  }

  return data.content.fields as { value: number; owner: string };
}
