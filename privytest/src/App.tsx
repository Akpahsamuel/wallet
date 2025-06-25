import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Container, Flex, Heading, Text, Badge } from "@radix-ui/themes";
import { Counter } from "./Counter";
import { CreateCounter } from "./CreateCounter";
import { useState } from "react";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SponsorConfig } from "./SponsorConfig";
import { useGaslessTransaction } from "./GaslessTransactionProvider";

interface AppProps {
  onSponsorChange: (keypair: Ed25519Keypair | undefined) => void;
  currentSponsor?: Ed25519Keypair;
}

function App({ onSponsorChange, currentSponsor }: AppProps) {
  const currentAccount = useCurrentAccount();
  const [counterId, setCounter] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("counterPackageId") || null;
  });
  const { isGaslessEnabled, sponsorAddress } = useGaslessTransaction();

  return (
    <>
      <Flex
        position="sticky"
        px="4"
        py="2"
        justify="between"
        style={{
          borderBottom: "1px solid var(--gray-a2)",
        }}
      >
        <Box>
          <Heading>Privy Test dApp</Heading>
        </Box>

        <Flex align="center" gap="3">
          {/* Gasless Status Indicator */}
          {isGaslessEnabled ? (
            <Badge color="green" variant="soft">
              ✨ Gasless Ready
            </Badge>
          ) : (
            <Badge color="gray" variant="soft">
              ⚠️ No Sponsor
            </Badge>
          )}
          
          {/* Sponsor Configuration */}
          <SponsorConfig 
            onSponsorChange={onSponsorChange}
            currentSponsor={currentSponsor}
          />
          
          <ConnectButton />
        </Flex>
      </Flex>
      <Container>
        <Container
          mt="5"
          pt="2"
          px="4"
          style={{ background: "var(--gray-a2)", minHeight: 500 }}
        >
          {currentAccount ? (
            <Flex direction="column" gap="4">
              {/* Sponsor Info */}
              {sponsorAddress && (
                <Box p="3" style={{ background: "var(--green-a3)", borderRadius: "8px" }}>
                  <Text size="2" weight="bold" color="green">
                    🚀 Gasless Mode Active
                  </Text>
                  <Text size="1" style={{ display: "block", marginTop: "4px", fontFamily: "monospace" }}>
                    Sponsor: {sponsorAddress}
                  </Text>
                  <Text size="1" style={{ display: "block", marginTop: "2px" }}>
                    All gas fees are paid by the sponsor account!
                  </Text>
                </Box>
              )}

              <Flex direction="column" gap="2">
                <Heading>Counter</Heading>
                <CreateCounter
                  onCreated={(id) => {
                    window.history.replaceState(
                      null,
                      "",
                      `?counterPackageId=${id}`,
                    );
                    setCounter(id);
                  }}
                />
                {counterId && <Counter id={counterId} />}
              </Flex>
            </Flex>
          ) : (
            <Heading>Please connect your wallet</Heading>
          )}
        </Container>
      </Container>
    </>
  );
}

export default App;
