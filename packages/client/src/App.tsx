import React from 'react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Layout from './components/Layout/Layout';
import BulkTransfer from './components/BulkTransfer/BulkTransfer';

// Create React Query client
const queryClient = new QueryClient();

// Network configuration
const networks = {
  mainnet: { url: getFullnodeUrl('mainnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  devnet: { url: getFullnodeUrl('devnet') },
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="mainnet">
        <WalletProvider>
          <ChakraProvider value={defaultSystem}>
            <Layout>
              <BulkTransfer />
            </Layout>
          </ChakraProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
