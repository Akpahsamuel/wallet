import { useState, useEffect } from 'react';
import { Button, Flex, Text, Badge, Dialog, IconButton, Code, Box } from '@radix-ui/themes';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { useSuiClient } from '@mysten/dapp-kit';
import { getSponsorKeypair, clearDemoSponsor, checkSponsorBalance, fundSponsorAccount, isSponsorConfiguredFromEnv, getSponsorSource } from './sponsorUtils';
import { GearIcon } from '@radix-ui/react-icons';

interface SponsorConfigProps {
  onSponsorChange: (keypair: Ed25519Keypair | undefined) => void;
  currentSponsor?: Ed25519Keypair;
}

export function SponsorConfig({ onSponsorChange, currentSponsor }: SponsorConfigProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [balanceInfo, setBalanceInfo] = useState<{
    hasBalance: boolean;
    totalBalance: bigint;
    coinCount: number;
  } | null>(null);
  const [open, setOpen] = useState(false);
  
  const suiClient = useSuiClient();
  const sponsorSource = getSponsorSource();
  const isEnvConfigured = isSponsorConfiguredFromEnv();

  // Check balance when sponsor changes
  useEffect(() => {
    if (currentSponsor) {
      const sponsorAddress = currentSponsor.getPublicKey().toSuiAddress();
      checkSponsorBalance(suiClient, sponsorAddress).then(setBalanceInfo);
    } else {
      setBalanceInfo(null);
    }
  }, [currentSponsor, suiClient]);

  const handleSetupSponsor = async () => {
    setIsLoading(true);
    try {
      const sponsorKeypair = getSponsorKeypair();
      const sponsorAddress = sponsorKeypair.getPublicKey().toSuiAddress();
      
      // Check balance
      const balance = await checkSponsorBalance(suiClient, sponsorAddress);
      setBalanceInfo(balance);

      if (!balance.hasBalance) {
        const shouldFund = confirm(
          `Sponsor account has no SUI balance. Would you like to request test SUI from faucet?\n\nAddress: ${sponsorAddress}`
        );
        
        if (shouldFund) {
          await fundSponsorAccount(sponsorAddress, 'testnet');
          // Recheck balance after funding
          const newBalance = await checkSponsorBalance(suiClient, sponsorAddress);
          setBalanceInfo(newBalance);
        }
      }

      onSponsorChange(sponsorKeypair);
      setOpen(false);
      
      alert(`Sponsor set successfully!\nAddress: ${sponsorAddress}\nBalance: ${balance.totalBalance.toString()} MIST`);
    } catch (error) {
      alert(`Failed to set sponsor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSponsor = () => {
    if (sponsorSource === 'localStorage') {
      clearDemoSponsor();
    }
    onSponsorChange(undefined);
    setBalanceInfo(null);
    setOpen(false);
    alert('Sponsor cleared successfully');
  };

  const handleRefreshBalance = async () => {
    if (currentSponsor) {
      setIsLoading(true);
      try {
        const sponsorAddress = currentSponsor.getPublicKey().toSuiAddress();
        const balance = await checkSponsorBalance(suiClient, sponsorAddress);
        setBalanceInfo(balance);
      } catch (error) {
        // Failed to refresh balance, will show unknown status
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFundSponsor = async () => {
    if (currentSponsor) {
      setIsLoading(true);
      try {
        const sponsorAddress = currentSponsor.getPublicKey().toSuiAddress();
        await fundSponsorAccount(sponsorAddress, 'testnet');
        // Refresh balance after funding
        const balance = await checkSponsorBalance(suiClient, sponsorAddress);
        setBalanceInfo(balance);
        alert('Funding request sent! Balance updated.');
      } catch (error) {
        alert(`Failed to fund sponsor: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const currentSponsorAddress = currentSponsor?.getPublicKey().toSuiAddress();

  const getSourceBadge = () => {
    switch (sponsorSource) {
      case 'env_private_key':
        return <Badge color="green">Environment (Private Key)</Badge>;
      case 'env_mnemonic':
        return <Badge color="green">Environment (Mnemonic)</Badge>;
      case 'localStorage':
        return <Badge color="blue">Demo Account</Badge>;
      case 'generated':
        return <Badge color="gray">Auto-Generated</Badge>;
      default:
        return <Badge color="gray">Unknown</Badge>;
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton variant="soft" size="2">
          <GearIcon />
        </IconButton>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: '600px' }}>
        <Dialog.Title>Sponsor Account Configuration</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Gasless transactions are powered by a sponsor account that pays for all gas fees.
        </Dialog.Description>

        <Flex direction="column" gap="4">
          {/* Configuration Status */}
          <Box p="3" style={{ background: "var(--gray-a3)", borderRadius: "8px" }}>
            <Flex align="center" gap="2" mb="2">
              <Text size="2" weight="bold">Configuration Source:</Text>
              {getSourceBadge()}
            </Flex>
            
            {isEnvConfigured ? (
              <Text size="2" color="green">
                ✅ Sponsor configured via environment variables
              </Text>
            ) : (
              <Flex direction="column" gap="2">
                <Text size="2" color="orange">
                  ⚠️ No environment configuration found. Using demo/auto-generated account.
                </Text>
                <Text size="1" color="gray">
                  For production use, set VITE_SPONSOR_PRIVATE_KEY or VITE_SPONSOR_MNEMONIC in your .env file.
                </Text>
              </Flex>
            )}
          </Box>

          {/* Current Sponsor Info */}
          {currentSponsorAddress ? (
            <Flex direction="column" gap="3">
              <Text size="2" weight="bold">Current Sponsor:</Text>
              <Code size="1" style={{ wordBreak: 'break-all', padding: '8px' }}>
                {currentSponsorAddress}
              </Code>
              
              {balanceInfo && (
                <Flex direction="column" gap="2">
                  <Text size="2" color={balanceInfo.hasBalance ? 'green' : 'red'}>
                    Balance: {balanceInfo.totalBalance.toString()} MIST ({balanceInfo.coinCount} coins)
                  </Text>
                  
                  <Flex gap="2">
                    <Button size="2" variant="soft" onClick={handleRefreshBalance} disabled={isLoading}>
                      {isLoading ? 'Refreshing...' : 'Refresh Balance'}
                    </Button>
                    
                    {!balanceInfo.hasBalance && (
                      <Button size="2" color="blue" onClick={handleFundSponsor} disabled={isLoading}>
                        {isLoading ? 'Funding...' : 'Fund from Faucet'}
                      </Button>
                    )}
                  </Flex>
                </Flex>
              )}
            </Flex>
          ) : (
            <Text size="2" color="gray">
              No sponsor currently active.
            </Text>
          )}

          {/* Environment Configuration Guide */}
          {!isEnvConfigured && (
            <Box p="3" style={{ background: "var(--blue-a3)", borderRadius: "8px" }}>
              <Text size="2" weight="bold" mb="2" style={{ display: 'block' }}>
                💡 How to configure your own sponsor account:
              </Text>
              <Text size="1" style={{ display: 'block', marginBottom: '8px' }}>
                1. Copy .env.example to .env
              </Text>
              <Text size="1" style={{ display: 'block', marginBottom: '8px' }}>
                2. Set either VITE_SPONSOR_PRIVATE_KEY or VITE_SPONSOR_MNEMONIC
              </Text>
              <Text size="1" style={{ display: 'block', marginBottom: '8px' }}>
                3. Restart your development server
              </Text>
              <Text size="1" color="red" style={{ display: 'block' }}>
                ⚠️ Only use testnet accounts - never mainnet credentials!
              </Text>
            </Box>
          )}

          {/* Action Buttons */}
          <Flex direction="column" gap="2">
            {!currentSponsor && (
              <Button
                onClick={handleSetupSponsor}
                disabled={isLoading}
                color="blue"
              >
                {isLoading ? 'Setting up...' : 'Setup Sponsor Account'}
              </Button>
            )}

            {currentSponsor && sponsorSource === 'localStorage' && (
              <Button
                onClick={handleClearSponsor}
                disabled={isLoading}
                color="red"
                variant="soft"
              >
                Clear Demo Sponsor
              </Button>
            )}
          </Flex>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
} 