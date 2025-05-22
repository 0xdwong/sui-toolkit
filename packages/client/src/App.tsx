import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useState } from "react";

// Import i18n configuration
import "./i18n/i18n";

import Layout from "./components/Layout/Layout";
import BulkTransfer from "./components/BulkTransfer/BulkTransfer";
import ToolList from "./components/ToolList/ToolList";
import Faucet from "./components/Faucet/Faucet";
import CoinManager from "./components/CoinManager/CoinManager";

// Create React Query client
const queryClient = new QueryClient();

// Network configuration
const networks = {
  mainnet: { url: getFullnodeUrl("mainnet") },
  testnet: { url: getFullnodeUrl("testnet") },
  devnet: { url: getFullnodeUrl("devnet") },
};

function App() {
  // Track current selected network using useState
  const [activeNetwork, setActiveNetwork] = useState<keyof typeof networks>("mainnet");

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networks}
        network={activeNetwork}
        onNetworkChange={(network) => {
          console.log(`Network changed to: ${network}`);
          setActiveNetwork(network as keyof typeof networks);
        }}
      >
        <WalletProvider
          autoConnect
        >
          <ChakraProvider value={defaultSystem}>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: "#363636",
                  color: "#fff",
                }
              }}
            />
            <Router>
              <Layout>
                <Routes>
                  <Route path="/" element={<ToolList />} />
                  <Route path="/bulk-transfer" element={<BulkTransfer />} />
                  <Route path="/faucet" element={<Faucet />} />
                  <Route path="/coin-manager" element={<CoinManager />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </Router>
          </ChakraProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
