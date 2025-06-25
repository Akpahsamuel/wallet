import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "@mysten/dapp-kit/dist/index.css";
import "@radix-ui/themes/styles.css";

import { SuiClientProvider, WalletProvider, useSuiClient } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Theme } from "@radix-ui/themes";
import App from "./App.tsx";
import { networkConfig } from "./networkConfig.ts";
import { GaslessTransactionProvider } from "./GaslessTransactionProvider.tsx";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getSponsorKeypair } from "./sponsorUtils.ts";

const queryClient = new QueryClient();

function AppWithGasless() {
  const suiClient = useSuiClient();
  
  // State for dynamic sponsor configuration
  const [sponsorKeypair, setSponsorKeypair] = useState<Ed25519Keypair | undefined>(() => {
    // Initialize with sponsor from environment variables or existing demo
    return getSponsorKeypair();
  });

  return (
    <GaslessTransactionProvider
      suiClient={suiClient}
      sponsorKeypair={sponsorKeypair}
      enabled={!!sponsorKeypair}
    >
      <App onSponsorChange={setSponsorKeypair} currentSponsor={sponsorKeypair} />
    </GaslessTransactionProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Theme appearance="dark">
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
          <WalletProvider 
            autoConnect
            slushWallet={{
              name: 'Privy Test App',
            }}
          >
            <AppWithGasless />
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </Theme>
  </React.StrictMode>,
);
