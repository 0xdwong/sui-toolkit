import React, { useState } from "react";
import {
  Container,
  Heading,
  Text,
  Box,
  Flex,
  Stack,
  Button,
  Spinner,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";

// Interface for coin objects
interface CoinObject {
  id: string;
  balance: string;
  type: string;
}

// Simple toast implementation
const useSimpleToast = () => {
  return {
    success: (options: { title: string; description?: string }) => {
      console.log("Success:", options.title, options.description);
      alert(`成功: ${options.title}${options.description ? ` - ${options.description}` : ''}`);
    },
    error: (options: { title: string; description?: string }) => {
      console.error("Error:", options.title, options.description);
      alert(`错误: ${options.title}${options.description ? ` - ${options.description}` : ''}`);
    },
    warning: (options: { title: string; description?: string }) => {
      console.warn("Warning:", options.title, options.description);
      alert(`警告: ${options.title}${options.description ? ` - ${options.description}` : ''}`);
    }
  };
};

const CoinManager: React.FC = () => {
  const { t } = useTranslation();
  const toast = useSimpleToast();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  
  // State variables
  const [selectedCoinType, setSelectedCoinType] = useState<string>("0x2::sui::SUI");
  const [coinObjects, setCoinObjects] = useState<CoinObject[]>([]);
  const [selectedCoins, setSelectedCoins] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [availableCoinTypes, setAvailableCoinTypes] = useState<string[]>(["0x2::sui::SUI"]);
  
  // Helper for toggling coin selection
  const toggleCoinSelection = (coinId: string) => {
    const newSelection = new Set(selectedCoins);
    if (newSelection.has(coinId)) {
      newSelection.delete(coinId);
    } else {
      newSelection.add(coinId);
    }
    setSelectedCoins(newSelection);
  };
  
  // Helper to format balance for display
  const formatBalance = (balance: string): string => {
    const num = parseInt(balance, 10);
    return (num / 1_000_000_000).toFixed(9);
  };
  
  // Handle coin type change
  const handleCoinTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCoinType(e.target.value);
    // Reset selection when changing coin type
    setSelectedCoins(new Set());
  };
  
  // Handle merge coins action
  const handleMergeCoins = async () => {
    if (!currentAccount) {
      toast.error({
        title: t("coinManager.error.title"),
        description: t("coinManager.error.connectWallet"),
      });
      return;
    }
    
    if (selectedCoins.size < 2) {
      toast.warning({
        title: t("coinManager.error.title"),
        description: t("coinManager.selectSome"),
      });
      return;
    }
    
    // The actual merge logic will be implemented later
    toast.success({
      title: t("coinManager.mergeSuccess"),
    });
  };
  
  // Handle clean zero balance coins action
  const handleCleanZeroCoins = async () => {
    if (!currentAccount) {
      toast.error({
        title: t("coinManager.error.title"),
        description: t("coinManager.error.connectWallet"),
      });
      return;
    }
    
    // The actual cleaning logic will be implemented later
    toast.success({
      title: t("coinManager.cleanSuccess"),
    });
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Stack direction="column" gap={6}>
        <Box>
          <Heading as="h1" mb={2}>
            {t("coinManager.title")}
          </Heading>
          <Text color="gray.600">
            {t("coinManager.description")}
          </Text>
        </Box>
        
        <Box p={5} borderWidth="1px" borderRadius="md" bg="white">
          <Stack direction="column" gap={4}>
            {/* Coin Type Selection */}
            <Box>
              <Text fontWeight="medium" mb={2}>{t("coinManager.coinType")}</Text>
              <Box maxW="md">
                <select 
                  value={selectedCoinType}
                  onChange={handleCoinTypeChange}
                  style={{ 
                    width: "100%", 
                    padding: "8px 12px", 
                    borderRadius: "0.375rem", 
                    border: "1px solid #E2E8F0",
                    background: "white"
                  }}
                >
                  {availableCoinTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Box>
            </Box>
            
            {/* Coin List */}
            <Box>
              <Text fontWeight="medium" mb={2}>{t("coinManager.coinList")}</Text>
              {loading ? (
                <Box textAlign="center" py={10}>
                  <Spinner size="xl" />
                  <Text mt={4}>{t("coinManager.loading")}</Text>
                </Box>
              ) : coinObjects.length === 0 ? (
                <Box p={4} bg="blue.50" color="blue.800" borderRadius="md">
                  <Text>{t("coinManager.noCoins")}</Text>
                </Box>
              ) : (
                <Box overflowX="auto">
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "10px", textAlign: "left", width: "50px" }}>
                          {t("coinManager.select")}
                        </th>
                        <th style={{ padding: "10px", textAlign: "left" }}>
                          {t("coinManager.coinId")}
                        </th>
                        <th style={{ padding: "10px", textAlign: "left" }}>
                          {t("coinManager.balance")}
                        </th>
                        <th style={{ padding: "10px", textAlign: "left" }}>
                          {t("coinManager.type")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {coinObjects.map((coin) => (
                        <tr key={coin.id}>
                          <td style={{ padding: "10px" }}>
                            <input 
                              type="checkbox"
                              checked={selectedCoins.has(coin.id)}
                              onChange={() => toggleCoinSelection(coin.id)}
                              style={{ width: "16px", height: "16px" }}
                            />
                          </td>
                          <td style={{ padding: "10px", fontFamily: "monospace", fontSize: "0.9em" }}>
                            {coin.id.slice(0, 8)}...{coin.id.slice(-6)}
                          </td>
                          <td style={{ padding: "10px" }}>
                            {parseInt(coin.balance, 10) === 0 ? (
                              <Box as="span" px={2} py={1} bg="red.100" color="red.800" borderRadius="md" fontSize="0.8em">
                                0
                              </Box>
                            ) : (
                              formatBalance(coin.balance)
                            )}
                          </td>
                          <td style={{ padding: "10px", fontFamily: "monospace", fontSize: "0.9em", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {coin.type}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Box>
            
            {/* Action Buttons */}
            <Flex gap={4} pt={4}>
              <Button 
                colorScheme="blue" 
                disabled={selectedCoins.size < 2 || loading}
                onClick={handleMergeCoins}
              >
                {t("coinManager.mergeCoin")}
              </Button>
              <Button 
                colorScheme="red" 
                variant="outline"
                disabled={loading}
                onClick={handleCleanZeroCoins}
              >
                {t("coinManager.cleanZeroCoins")}
              </Button>
            </Flex>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
};

export default CoinManager; 