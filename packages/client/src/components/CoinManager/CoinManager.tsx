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
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_TYPE_ARG } from "@mysten/sui/utils";
import toast from "react-hot-toast";
import { formatCoinType, fetchCoinPrices, isSmallValueCoin } from "./utils";
import { useWalletNetwork } from "../CustomConnectButton";

// Import types and subcomponents
import { CoinTypeSummary, LoadingState } from "./types";
import CoinTypesList from "./CoinTypesList";
import SmallValueModal from "./SmallValueModal";

// 固定的小额币接收地址（项目方地址）
const SMALL_VALUE_RECEIVER = "0xe1917d3f7f036260ee211893d7228c9574d257e45dd9396b265532d1205df052";

const CoinManager: React.FC = () => {
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const walletNetwork = useWalletNetwork(true);

  // Unified loading state management
  const [loadingState, setLoadingState] = useState<LoadingState>({
    fetchCoins: false,
    batchMerge: false,
    batchCleanZero: false,
    singleOperation: false,
    cleanSmallValue: false
  });

  // State variables
  const [selectedCoinType, setSelectedCoinType] = useState<string | null>(null);
  const [coinTypeSummaries, setCoinTypeSummaries] = useState<CoinTypeSummary[]>([]);
  const [selectedCoins, setSelectedCoins] = useState<Set<string>>(new Set());

  // 小额币相关状态
  const [isSmallValueModalOpen, setIsSmallValueModalOpen] = useState<boolean>(false);
  const [threshold, setThreshold] = useState<number>(1.0); // 默认阈值 $1
  const [coinPrices, setCoinPrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState<boolean>(false);
  const [smallValueCoins, setSmallValueCoins] = useState<Array<{
    coinType: string;
    symbol: string;
    objects: any[];
  }>>([]);
  const [selectedSmallValueCoins, setSelectedSmallValueCoins] = useState<Set<string>>(new Set());

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
              if (coin.coinType === "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN") symbol = "wUSDC"
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
    operationType: 'batchMerge' | 'batchCleanZero' | 'singleOperation' | 'cleanSmallValue'
  ) => {
    try {
      setLoadingState(prev => ({ ...prev, [operationType]: true }));

      return new Promise((resolve, reject) => {
        signAndExecute(
          {
            transaction: tx,
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

        // Special handling for SUI coins
        if (summary.type === SUI_TYPE_ARG) {
          // Skip SUI if only 2 objects (one needed for gas)
          if (summary.objects.length <= 2) {
            return;
          }

          // Sort coins by balance and keep highest balance for gas
          const sortedCoins = [...summary.objects].sort((a, b) =>
            Number(BigInt(b.balance) - BigInt(a.balance))
          );

          const primaryCoin = sortedCoins[0].id;
          const otherCoins = sortedCoins.slice(1).map(coin => coin.id);

          if (otherCoins.length > 0) {
            tx.mergeCoins(primaryCoin, otherCoins);
          }
        } else {
          // For non-SUI coins, proceed as normal
          const primaryCoin = coinIds[0];
          const otherCoins = coinIds.slice(1);
          tx.mergeCoins(primaryCoin, otherCoins);
        }
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

    // Special handling for SUI coins with only 2 objects
    if (coinType === SUI_TYPE_ARG && summary.objects.length === 2) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.cannotMergeTwoSuiCoins"));
      return;
    }

    try {
      setLoadingState(prev => ({ ...prev, singleOperation: true }));

      // Auto select all coins of this type
      const coinIds = summary.objects.map(coin => coin.id);

      // For SUI coins, ensure we keep one coin separate for gas
      const tx = new Transaction();

      if (coinType === SUI_TYPE_ARG) {
        // Sort coins by balance and keep the highest balance one for potential gas payment
        const sortedCoins = [...summary.objects].sort((a, b) =>
          Number(BigInt(b.balance) - BigInt(a.balance))
        );

        const primaryCoin = sortedCoins[0].id;
        // Use all other coins except the primary one
        const otherCoins = sortedCoins.slice(1).map(coin => coin.id);

        if (otherCoins.length > 0) {
          tx.mergeCoins(primaryCoin, otherCoins);
        } else {
          toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.notEnoughCoins"));
          setLoadingState(prev => ({ ...prev, singleOperation: false }));
          return;
        }
      } else {
        // For non-SUI coins, proceed as normal
        const primaryCoin = coinIds[0];
        const otherCoins = coinIds.slice(1);
        tx.mergeCoins(primaryCoin, otherCoins);
      }

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

  // 获取币价格信息
  const loadCoinPrices = async () => {
    if (coinTypeSummaries.length === 0) return;
    console.log('====loadCoinPrices====000')
    try {
      setLoadingPrices(true);
      // 直接传递 coinTypeSummaries 给 fetchCoinPrices
      const prices = await fetchCoinPrices(coinTypeSummaries);
      console.log('====loadCoinPrices====1111', prices)
      setCoinPrices(prices);

      return prices;
    } catch (error) {
    console.log('====loadCoinPrices====2222')

      console.error("Error fetching coin prices:", error);
      toast.error(t("coinManager.error.fetchPricesFailed"));
      return {};
    } finally {
      setLoadingPrices(false);
      console.log('====loadCoinPrices====333')
    }
  };

  // 筛选小额币
  const filterSmallValueCoins = (prices: Record<string, number>) => {
    const result: Array<{
      coinType: string;
      symbol: string;
      objects: any[];
    }> = [];
    
    const allCoinIds: string[] = [];
    
    coinTypeSummaries.forEach(summary => {
      const coinPrice = prices[summary.type] || 0;
      if (coinPrice <= 0) return;
      
      const smallObjects = summary.objects.filter(obj => 
        isSmallValueCoin(obj, summary.decimals, coinPrice, threshold)
      );
      
      if (smallObjects.length > 0) {
        result.push({
          coinType: summary.type,
          symbol: summary.symbol,
          objects: smallObjects
        });
        
        smallObjects.forEach(obj => allCoinIds.push(obj.id));
      }
    });
    
    setSmallValueCoins(result);
    
    // 默认全选所有小额币
    setSelectedSmallValueCoins(new Set(allCoinIds));
    
    return result;
  };

  // 打开小额币清理模态框
  const handleOpenSmallValueModal = async () => {
    // 先获取币价格
    const prices = await loadCoinPrices();
    // 筛选小额币
    filterSmallValueCoins(prices || {});
    // 打开模态框
    setIsSmallValueModalOpen(true);
  };

  // 更新阈值
  const handleThresholdChange = (value: number) => {
    setThreshold(value);
  };

  // 应用新阈值重新筛选
  const handleApplyThreshold = () => {
    filterSmallValueCoins(coinPrices);
  };

  // 切换单个小额币选择状态
  const toggleSmallCoinSelection = (coinId: string) => {
    const newSelection = new Set(selectedSmallValueCoins);
    if (newSelection.has(coinId)) {
      newSelection.delete(coinId);
    } else {
      newSelection.add(coinId);
    }
    setSelectedSmallValueCoins(newSelection);
  };

  // 全选所有小额币
  const selectAllSmallCoins = () => {
    const allIds = smallValueCoins.flatMap(group => group.objects.map(coin => coin.id));
    setSelectedSmallValueCoins(new Set(allIds));
  };

  // 取消选择所有小额币
  const unselectAllSmallCoins = () => {
    setSelectedSmallValueCoins(new Set());
  };

  // 处理小额币清理操作
  const handleConfirmCleanSmallValue = async () => {
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }

    if (selectedSmallValueCoins.size === 0) {
      toast.error(t("coinManager.error.noCoinsSelected"));
      return;
    }

    try {
      setLoadingState(prev => ({ ...prev, cleanSmallValue: true }));
      
      // 创建交易
      const tx = new Transaction();
      let totalCleanedCoins = 0;
      
      // 找出选中的币对象
      smallValueCoins.forEach(({ coinType, objects }) => {
        objects.forEach(coin => {
          if (selectedSmallValueCoins.has(coin.id)) {
            tx.transferObjects([tx.object(coin.id)], tx.pure.address(SMALL_VALUE_RECEIVER));
            totalCleanedCoins++;
          }
        });
      });
      
      // 执行交易
      await executeTransaction(
        tx,
        `${t("coinManager.smallValueCleanSuccess")}: ${totalCleanedCoins} objects`,
        'cleanSmallValue'
      );
      
      // 刷新币列表
      fetchAllCoins();
      setIsSmallValueModalOpen(false);
      
    } catch (error) {
      console.error("Error cleaning small value coins:", error);
      toast.error(t("coinManager.error.operationFailed") + ": " + (error instanceof Error ? error.message : t("coinManager.error.unknownError")));
    } finally {
      setLoadingState(prev => ({ ...prev, cleanSmallValue: false }));
    }
  };

  // 单个币种的小额清理
  const handleCleanSmallValueCoins = async (coinType: string) => {
    console.log(1111)
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }
    console.log(2222)
    
    // 如果价格数据还没加载，先加载价格
    let prices = coinPrices;
    if (Object.keys(prices).length === 0) {
      prices = await loadCoinPrices() || {};
    }
    console.log(3333)
    
    const summary = coinTypeSummaries.find(s => s.type === coinType);
    if (!summary) return;
    console.log(4444)
    
    const coinPrice = prices[coinType] || 0;
    if (coinPrice <= 0) {
      toast.error(t("coinManager.error.noPriceData"));
      return;
    }
    console.log(5555)
    
    // 筛选小额币
    const smallObjects = summary.objects.filter(coin =>
      isSmallValueCoin(coin, summary.decimals, coinPrice, threshold)
    );
    console.log(6666)
    
    if (smallObjects.length === 0) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.noSmallValueCoins"));
      return;
    }
    console.log(7777)
    
    // 打开模态框，预先填充当前选中的币种的小额币
    setSmallValueCoins([{
      coinType: summary.type,
      symbol: summary.symbol,
      objects: smallObjects
    }]);
    console.log(8888)
    
    // 默认全选
    setSelectedSmallValueCoins(new Set(smallObjects.map(coin => coin.id)));
    console.log(9999)
    
    // 打开模态框
    setIsSmallValueModalOpen(true);
    console.log(10000)
  };

  // Load coins when account changes or network changes
  useEffect(() => {
    if (currentAccount) {
      fetchAllCoins();
    } else {
      setCoinTypeSummaries([]);
    }
  }, [currentAccount, walletNetwork]);

  return (
    <Container maxW="container.xl" py={8}>
      <Stack direction="column" gap={6}>
        <Box>
          <Heading as="h1" mb={2}>
            {t("coinManager.title")}
          </Heading>
          <Text color="gray.600" mb={2}>
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
                    disabled={!hasMergeableCoins || loadingState.fetchCoins || loadingState.batchMerge || loadingState.batchCleanZero || loadingState.cleanSmallValue || loadingState.singleOperation}
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
                    disabled={!hasZeroBalanceCoins || loadingState.fetchCoins || loadingState.batchMerge || loadingState.batchCleanZero || loadingState.cleanSmallValue || loadingState.singleOperation}
                    onClick={handleBatchCleanZero}
                    title={!hasZeroBalanceCoins ? t("coinManager.error.noZeroCoins") : t("coinManager.batchClean")}
                    loading={loadingState.batchCleanZero}
                  >
                    {t("coinManager.batchClean")}
                  </Button>
                  
                  {/* 新增一键小额清理按钮 */}
                  <Button
                    size="sm"
                    colorPalette="orange"
                    variant="solid"
                    loadingText={t("coinManager.loading")}
                    disabled={loadingState.fetchCoins || loadingState.batchMerge || loadingState.batchCleanZero || loadingState.cleanSmallValue || loadingState.singleOperation}
                    onClick={handleOpenSmallValueModal}
                    loading={loadingState.cleanSmallValue}
                  >
                    {t("coinManager.cleanSmallValue")}
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
                  onCleanSmallValueCoins={handleCleanSmallValueCoins}
                  coinPrices={coinPrices}
                  valueThreshold={threshold}
                />
              )}
            </Box>
          </Stack>
        </Box>
      </Stack>
      
      {/* 小额清理模态框 */}
      <SmallValueModal
        isOpen={isSmallValueModalOpen}
        onClose={() => setIsSmallValueModalOpen(false)}
        smallValueCoins={smallValueCoins}
        selectedCoins={selectedSmallValueCoins}
        threshold={threshold}
        isLoading={loadingState.cleanSmallValue}
        loadingPrices={loadingPrices}
        coinPrices={coinPrices}
        onThresholdChange={handleThresholdChange}
        onApplyThreshold={handleApplyThreshold}
        onToggleCoinSelection={toggleSmallCoinSelection}
        onSelectAll={selectAllSmallCoins}
        onUnselectAll={unselectAllSmallCoins}
        onConfirmClean={handleConfirmCleanSmallValue}
      />
    </Container>
  );
};

export default CoinManager; 