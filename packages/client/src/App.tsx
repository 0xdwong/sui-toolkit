import React from 'react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout/Layout';
import BulkTransfer from './components/BulkTransfer/BulkTransfer';
import ToolList from './components/ToolList/ToolList';

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
            <Router>
              <Layout>
                <Routes>
                  <Route path="/" element={<ToolList />} />
                  <Route path="/bulk-transfer" element={<BulkTransfer />} />
                  {/* 其他工具路由将在实现后添加 */}
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
