import React, { useEffect } from "react";
import { ConnectButton, useSuiClientContext, useCurrentWallet, useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Flex } from "@chakra-ui/react";

// 自定义钩子，用于获取当前钱包的网络
export const useWalletNetwork = (autoSync = false) => {
  const ctx = useSuiClientContext();
  const appNetwork = ctx.network;
  const { isConnected } = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const [walletNetwork, setWalletNetwork] = React.useState(appNetwork);

  useEffect(() => {
    if (isConnected && currentAccount && currentAccount.chains) {
      // The wallet chain usually contains the network ID (e.g., "sui:testnet")
      const chain = currentAccount.chains[0];
      if (typeof chain === 'string') {
        const network = chain.split(':')[1];
        if (network && ['mainnet', 'testnet', 'devnet', 'localnet'].includes(network)) {
          setWalletNetwork(network);

          // Sync dApp network with wallet network if autoSync is enabled
          if (network !== appNetwork && autoSync) {
            try {
              ctx.selectNetwork(network);
              console.log(`Auto-synced dApp network to wallet network: ${network}`);
            } catch (error) {
              console.error("Failed to switch network:", error);
            }
          } else if (network !== appNetwork) {
            console.log(`Wallet is connected to ${network}, but dApp is on ${appNetwork}`);
          }
        }
      }
    } else {
      // If not connected, show app network
      setWalletNetwork(appNetwork);
    }
  }, [isConnected, currentAccount, appNetwork, ctx, autoSync]);

  return walletNetwork;
};

// 获取网络标签颜色
export const getNetworkTagColor = (network: string) => {
  switch (network) {
    case 'mainnet':
      return 'green';
    case 'testnet':
      return 'orange';
    case 'devnet':
      return 'purple';
    default:
      return 'gray';
  }
};

// 创建网络标识组件
export const NetworkBadge = () => {
  const walletNetwork = useWalletNetwork();
  const color = getNetworkTagColor(walletNetwork);
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      height="24px"
      bg={`${color}.100`}
      color={`${color}.800`}
      borderRadius="full"
      px={3}
      fontSize="sm"
      fontWeight="medium"
    >
      {walletNetwork}
    </Box>
  );
};

// Custom ConnectButton component that uses direct styling
const CustomConnectButton = () => {
  // Define custom button styles to apply via CSS
  React.useEffect(() => {
    // Create a style element
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      .dapp-kit-connect-button button {
        background-color: #3182CE !important;
        color: white !important;
        padding: 8px 16px !important;
        border-radius: 6px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        transition: background-color 0.2s !important;
        border: none !important;
        display: flex !important;
        align-items: center !important;
      }
      
      .dapp-kit-connect-button button:hover {
        background-color: #2B6CB0 !important;
      }
      
      /* Fix z-index issues with wallet modal */
      .sui-wallet-modal-overlay {
        z-index: 10000 !important;
        position: fixed !important;
      }
      
      .sui-wallet-modal {
        z-index: 10001 !important;
        position: relative !important;
      }
      
      .sui-wallet-modal-content {
        z-index: 10002 !important;
      }
      
      /* Support wallet standard modal */
      [data-overlay-container="true"] {
        z-index: 10000 !important;
        position: relative !important;
      }
      
      [data-radix-popper-content-wrapper] {
        z-index: 10001 !important;
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  return (
    <Flex gap={3} align="center">
      {/* Display current network */}
      <NetworkBadge />

      <Box
        className="dapp-kit-connect-button"
        position="relative"
        zIndex={10}
        display="inline-block"
        onClick={() => {
          console.log("Wallet button clicked");
        }}
      >
        <ConnectButton connectText="Connect Wallet" />
      </Box>
    </Flex>
  );
};

export default CustomConnectButton;
