import React, { useState, useEffect } from "react";
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
import {
  useCurrentAccount,
  useSuiClient,
  useSignAndExecuteTransaction
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_TYPE_ARG } from "@mysten/sui/utils";
import toast from "react-hot-toast";
import { formatCoinType } from "./utils";

// Import types and subcomponents
import { CoinTypeSummary, LoadingState } from "./types";
import CoinTypesList from "./CoinTypesList";

const CoinManager: React.FC = () => {
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  // Unified loading state management
  const [loadingState, setLoadingState] = useState<LoadingState>({
    fetchCoins: false,
    batchMerge: false,
    batchCleanZero: false,
    singleOperation: false
  });

  // State variables
  const [selectedCoinType, setSelectedCoinType] = useState<string | null>(null);
  const [coinTypeSummaries, setCoinTypeSummaries] = useState<CoinTypeSummary[]>([]);
  const [selectedCoins, setSelectedCoins] = useState<Set<string>>(new Set());

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

  // Helper to toggle expansion of a coin type
  const toggleCoinTypeExpansion = (coinType: string) => {
    setCoinTypeSummaries(prevSummaries =>
      prevSummaries.map(summary =>
        summary.type === coinType
          ? { ...summary, expanded: !summary.expanded }
          : summary
      )
    );

    // Set the selected coin type
    setSelectedCoinType(prevType => prevType === coinType ? null : coinType);

    // Reset selection when changing coin type
    setSelectedCoins(new Set());
  };

  // Fetch all coins for the connected wallet
  const fetchAllCoins = async () => {
    if (!currentAccount) return;

    try {
      setLoadingState(prev => ({ ...prev, fetchCoins: true }));

      // Get all coins for the account
      const { data: allCoins } = await suiClient.getAllCoins({
        owner: currentAccount.address,
      });

      // Group coins by type
      const coinsByType = new Map<string, any[]>();
      const coinMetadata = new Map<string, { decimals: number, symbol: string }>();

      // Fetch metadata for all coin types
      for (const coin of allCoins) {
        if (!coin.coinType) continue;
        
        if (!coinMetadata.has(coin.coinType)) {
          try {
            const metadata = await suiClient.getCoinMetadata({
              coinType: coin.coinType,
            });
            
            if (metadata) {
              let symbol = metadata.symbol || formatCoinType(coin.coinType);
              if(coin.coinType === "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN") symbol = "wUSDC"
              coinMetadata.set(coin.coinType, {
                decimals: metadata.decimals,
                symbol: symbol
              });
            } else {
              // Default values if metadata not found
              coinMetadata.set(coin.coinType, {
                decimals: 9,
                symbol: formatCoinType(coin.coinType)
              });
            }
          } catch (error) {
            console.error(`Error fetching metadata for ${coin.coinType}:`, error);
            // Default values on error
            coinMetadata.set(coin.coinType, {
              decimals: 9,
              symbol: formatCoinType(coin.coinType)
            });
          }
        }
      }

      allCoins.forEach(coin => {
        if (!coin.coinType) return;

        const metadata = coinMetadata.get(coin.coinType) || { decimals: 9, symbol: formatCoinType(coin.coinType) };
        
        const formattedCoin = {
          id: coin.coinObjectId,
          balance: coin.balance.toString(),
          type: coin.coinType,
          decimals: metadata.decimals,
        };

        if (!coinsByType.has(coin.coinType)) {
          coinsByType.set(coin.coinType, []);
        }

        coinsByType.get(coin.coinType)?.push(formattedCoin);
      });

      // Create summaries
      const summaries: CoinTypeSummary[] = [];

      for (const [type, coins] of coinsByType.entries()) {
        const totalBalance = coins.reduce(
          (sum, coin) => sum + BigInt(coin.balance),
          BigInt(0)
        ).toString();
        
        const metadata = coinMetadata.get(type) || { decimals: 9, symbol: formatCoinType(type) };

        summaries.push({
          type,
          symbol: metadata.symbol,
          totalBalance,
          objectCount: coins.length,
          objects: coins,
          expanded: false,
          decimals: metadata.decimals
        });
      }

      // Sort by type (SUI first, then others alphabetically)
      summaries.sort((a, b) => {
        if (a.type === SUI_TYPE_ARG) return -1;
        if (b.type === SUI_TYPE_ARG) return 1;
        return a.type.localeCompare(b.type);
      });

      setCoinTypeSummaries(summaries);
    } catch (error) {
      console.error("Error fetching coins:", error);
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.unknownError"));
    } finally {
      setLoadingState(prev => ({ ...prev, fetchCoins: false }));
    }
  };

  // Check if there's any coin type with multiple objects (can be merged)
  const hasMergeableCoins = coinTypeSummaries.some(summary => summary.objectCount > 1);
  
  // Check if there's any zero balance coin object
  const hasZeroBalanceCoins = coinTypeSummaries.some(summary => 
    summary.objects.some(coin => parseInt(coin.balance, 10) === 0)
  );

  // Generic transaction execution function to reduce code duplication
  const executeTransaction = async (
    tx: Transaction, 
    successMessage: string, 
    operationType: 'batchMerge' | 'batchCleanZero' | 'singleOperation'
  ) => {
    try {
      setLoadingState(prev => ({ ...prev, [operationType]: true }));
      
      return new Promise((resolve, reject) => {
        signAndExecute(
          { transaction: tx,
           },
          {
            onSuccess: (result) => {
              toast.success(successMessage);
              // Add a delay before resolving to allow blockchain state to update
              setTimeout(() => {
                resolve({ success: true, result });
              }, 2000); // 2 seconds delay
            },
            onError: (error) => {
              const errorMsg = error instanceof Error ? error.message : t("coinManager.error.unknownError");
              toast.error(t("coinManager.error.operationFailed") + ": " + errorMsg);
              reject({ success: false, error });
            }
          }
        );
      });
    } catch (error) {
      console.error("Transaction error:", error);
      const errorMsg = error instanceof Error ? error.message : t("coinManager.error.unknownError");
      toast.error(t("coinManager.error.operationFailed") + ": " + errorMsg);
      throw error;
    } finally {
      setLoadingState(prev => ({ ...prev, [operationType]: false }));
    }
  };

  // Optimized batch merge function
  const handleBatchMerge = async () => {
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }

    const mergeableCoinTypes = coinTypeSummaries.filter(summary => summary.objectCount > 1);
    if (mergeableCoinTypes.length === 0) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.noMergeableCoins"));
      return;
    }

    try {
      setLoadingState(prev => ({ ...prev, batchMerge: true }));
      
      // Create a single transaction for all coin types
      const tx = new Transaction();
      
      // Add merge operations for each coin type
      mergeableCoinTypes.forEach(summary => {
        const coinIds = summary.objects.map(coin => coin.id);
        const primaryCoin = coinIds[0];
        const otherCoins = coinIds.slice(1);
        tx.mergeCoins(primaryCoin, otherCoins);
      });
      
      // Execute the transaction
      await executeTransaction(
        tx, 
        t("coinManager.batchMergeSuccess"), 
        'batchMerge'
      );

      // Refresh coin list after transaction is complete
      fetchAllCoins();
    } catch (error) {
      console.error("Error batch merging coins:", error);
      toast.error(t("coinManager.error.operationFailed") + ": " + (error instanceof Error ? error.message : t("coinManager.error.unknownError")));
    } finally {
      setLoadingState(prev => ({ ...prev, batchMerge: false }));
    }
  };

  // Optimized batch clean zero balance coins function
  const handleBatchCleanZero = async () => {
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }

    const coinTypesWithZeroBalance = coinTypeSummaries.filter(summary => 
      summary.objects.some(coin => parseInt(coin.balance, 10) === 0)
    );

    if (coinTypesWithZeroBalance.length === 0) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.noZeroCoins"));
      return;
    }

    try {
      setLoadingState(prev => ({ ...prev, batchCleanZero: true }));
      
      // Create a single transaction for all zero-balance coins
      const tx = new Transaction();
      let totalCleanedCoins = 0;
      
      // Add clean operations for each coin type
      coinTypesWithZeroBalance.forEach(summary => {
        // Filter zero balance coins
        const zeroBalanceCoins = summary.objects.filter(coin =>
          parseInt(coin.balance, 10) === 0
        );
        
        if (zeroBalanceCoins.length === 0) return;
        totalCleanedCoins += zeroBalanceCoins.length;
        
        if (summary.type === SUI_TYPE_ARG) {
          // Handle SUI coins
          for (const zeroCoin of zeroBalanceCoins) {
            tx.moveCall({
              target: "0x2::sui::destroy_zero_value_coin",
              arguments: [tx.object(zeroCoin.id)],
              typeArguments: [],
            });
          }
        } else {
          // Handle other coin types
          for (const zeroCoin of zeroBalanceCoins) {
            tx.moveCall({
              target: "0x2::coin::destroy_zero",
              arguments: [tx.object(zeroCoin.id)],
              typeArguments: [summary.type],
            });
          }
        }
      });
      
      if (totalCleanedCoins === 0) {
        toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.noZeroCoins"));
        setLoadingState(prev => ({ ...prev, batchCleanZero: false }));
        return;
      }
      
      // Execute transaction
      await executeTransaction(
        tx,
        `${t("coinManager.batchCleanSuccess")}: ${totalCleanedCoins} objects`,
        'batchCleanZero'
      );
      
      // Refresh coin list
      fetchAllCoins();
      
    } catch (error) {
      console.error("Error batch cleaning zero-balance coins:", error);
      toast.error(t("coinManager.error.operationFailed") + ": " + (error instanceof Error ? error.message : t("coinManager.error.unknownError")));
    } finally {
      setLoadingState(prev => ({ ...prev, batchCleanZero: false }));
    }
  };

  // Optimized clean zero balance coins for single coin type
  const handleCleanZeroCoins = async (coinType: string) => {
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }

    const summary = coinTypeSummaries.find(s => s.type === coinType);
    if (!summary) return;

    try {
      setLoadingState(prev => ({ ...prev, singleOperation: true }));

      // Filter zero balance coins
      const zeroBalanceCoins = summary.objects.filter(coin =>
        parseInt(coin.balance, 10) === 0
      );

      if (zeroBalanceCoins.length === 0) {
        toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.noZeroCoins"));
        setLoadingState(prev => ({ ...prev, singleOperation: false }));
        return;
      }

      // Create transaction
      const tx = new Transaction();

      if (coinType === SUI_TYPE_ARG) {
        // Handle SUI coins
        const zeroIds = zeroBalanceCoins.map(coin => coin.id);
        const nonZeroCoins = summary.objects.filter(coin =>
          parseInt(coin.balance, 10) > 0
        );

        if (nonZeroCoins.length === 0) {
          toast.error(t("coinManager.error.operationFailed") + ": " + "Need at least one coin with balance for gas");
          setLoadingState(prev => ({ ...prev, singleOperation: false }));
          return;
        }

        for (const zeroId of zeroIds) {
          tx.moveCall({
            target: "0x2::sui::destroy_zero_value_coin",
            arguments: [tx.object(zeroId)],
            typeArguments: [],
          });
        }
      } else {
        // Handle other coin types
        for (const zeroCoin of zeroBalanceCoins) {
          tx.moveCall({
            target: "0x2::coin::destroy_zero",
            arguments: [tx.object(zeroCoin.id)],
            typeArguments: [coinType],
          });
        }
      }

      // Execute transaction
      await executeTransaction(
        tx,
        `${t("coinManager.cleanSuccess")}: ${zeroBalanceCoins.length} objects`,
        'singleOperation'
      );

      // Refresh coin list
      fetchAllCoins();
    } catch (error) {
      console.error("Error preparing clean transaction:", error);
    } finally {
      setLoadingState(prev => ({ ...prev, singleOperation: false }));
    }
  };

  // Optimized merge function for single coin type
  const autoMergeCoins = async (coinType: string) => {
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }

    const summary = coinTypeSummaries.find(s => s.type === coinType);
    if (!summary) return;

    if (summary.objects.length < 2) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.notEnoughCoins"));
      return;
    }

    try {
      setLoadingState(prev => ({ ...prev, singleOperation: true }));
      
      // Auto select all coins of this type
      const coinIds = summary.objects.map(coin => coin.id);
      const newSelection = new Set(coinIds);
      setSelectedCoins(newSelection);

      // Create new transaction
      const tx = new Transaction();
      const primaryCoin = coinIds[0];
      const otherCoins = coinIds.slice(1);
      tx.mergeCoins(primaryCoin, otherCoins);

      // Execute transaction
      await executeTransaction(
        tx,
        t("coinManager.mergeSuccess"),
        'singleOperation'
      );

      // Reset selection and refresh coin list
      setSelectedCoins(new Set());
      fetchAllCoins();
    } catch (error) {
      console.error("Error preparing merge transaction:", error);
    } finally {
      setLoadingState(prev => ({ ...prev, singleOperation: false }));
    }
  };

  // Load coins when account changes
  useEffect(() => {
    if (currentAccount) {
      fetchAllCoins();
    } else {
      setCoinTypeSummaries([]);
    }
  }, [currentAccount]);

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
            {/* Coin Type Summary */}
            <Box>
              <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Text fontWeight="medium">{t("coinManager.coinList")}</Text>
                <Flex gap={3}>
                  <Button
                    size="sm"
                    colorPalette="blue"
                    variant="solid"
                    loadingText={t("coinManager.loading")}
                    disabled={!hasMergeableCoins || loadingState.fetchCoins || loadingState.batchMerge || loadingState.batchCleanZero || loadingState.singleOperation}
                    onClick={handleBatchMerge}
                    title={!hasMergeableCoins ? t("coinManager.error.notEnoughCoins") : t("coinManager.batchMerge")}
                    loading={loadingState.batchMerge}
                  >
                    {t("coinManager.batchMerge")}
                  </Button>
                  <Button
                    size="sm"
                    colorPalette="red"
                    variant="solid"
                    loadingText={t("coinManager.loading")}
                    disabled={!hasZeroBalanceCoins || loadingState.fetchCoins || loadingState.batchMerge || loadingState.batchCleanZero || loadingState.singleOperation}
                    onClick={handleBatchCleanZero}
                    title={!hasZeroBalanceCoins ? t("coinManager.error.noZeroCoins") : t("coinManager.batchClean")}
                    loading={loadingState.batchCleanZero}
                  >
                    {t("coinManager.batchClean")}
                  </Button>
                </Flex>
              </Flex>

              {loadingState.fetchCoins ? (
                <Box textAlign="center" py={10}>
                  <Spinner size="xl" />
                  <Text mt={4}>{t("coinManager.loading")}</Text>
                </Box>
              ) : coinTypeSummaries.length === 0 ? (
                <Box p={4} bg="teal.50" color="teal.800" borderRadius="md">
                  <Text>{t("coinManager.noCoins")}</Text>
                </Box>
              ) : (
                <CoinTypesList
                  coinTypeSummaries={coinTypeSummaries}
                  selectedCoinType={selectedCoinType}
                  selectedCoins={selectedCoins}
                  isLoading={loadingState.singleOperation}
                  onToggleCoinTypeExpansion={toggleCoinTypeExpansion}
                  onToggleCoinSelection={toggleCoinSelection}
                  onMergeCoin={autoMergeCoins}
                  onCleanZeroCoins={handleCleanZeroCoins}
                />
              )}
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
};

export default CoinManager; 