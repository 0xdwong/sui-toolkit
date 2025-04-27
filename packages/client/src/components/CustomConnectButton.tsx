import React from "react";
import { ConnectButton } from "@mysten/dapp-kit";
import { Box } from "@chakra-ui/react";

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
  );
};

export default CustomConnectButton;
