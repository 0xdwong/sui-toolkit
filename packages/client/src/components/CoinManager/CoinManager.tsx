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
  Badge,
  useClipboard,
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

// Interface for coin objects
interface CoinObject {
  id: string;
  balance: string;
  type: string;
  decimals?: number;
}

// Interface for coin type summary
interface CoinTypeSummary {
  type: string;
  totalBalance: string;
  objectCount: number;
  objects: CoinObject[];
  expanded: boolean;
  decimals: number;
}

// Helper to format coin type for display
const formatCoinType = (coinType: string): string => {
  if (coinType === SUI_TYPE_ARG) return "SUI";

  // Handle structured coin types (0x...::module::NAME)
  const parts = coinType.split("::");
  if (parts.length >= 2) {
    const address = parts[0];
    const name = parts[parts.length - 1];

    // Format: 0xABC...XYZ::NAME
    if (address.startsWith("0x") && address.length > 8) {
      return `${address.substring(0, 4)}...${address.substring(address.length - 4)}::${name}`;
    }
  }

  // If not a structured coin type or SUI, truncate if too long
  if (coinType.length > 20) {
    return `${coinType.substring(0, 10)}...${coinType.substring(coinType.length - 10)}`;
  }

  return coinType;
};

// Helper to format balance for display
const formatBalance = (balance: string, decimals: number = 9): string => {
  try {
    const balanceBigInt = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    
    if (balanceBigInt === BigInt(0)) return "0";
    
    // Calculate the integer and decimal parts
    const integerPart = (balanceBigInt / divisor).toString();
    const remainder = balanceBigInt % divisor;
    
    if (remainder === BigInt(0)) return integerPart;
    
    // Format the decimal part with proper padding
    let decimalPart = remainder.toString().padStart(decimals, '0');
    
    // Remove trailing zeros
    decimalPart = decimalPart.replace(/0+$/, '');
    
    if (decimalPart.length > 0) {
      return `${integerPart}.${decimalPart}`;
    }
    
    return integerPart;
  } catch (error) {
    console.error("Error formatting balance:", error);
    return "0";
  }
};

// CopyableText 组件 - 用于替换重复的复制逻辑
const CopyableText: React.FC<{
  text: string;
  displayText: string;
  label: string;
}> = ({ text, displayText, label }) => {
  const { onCopy, hasCopied } = useClipboard(text);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy();
  };

  return (
    <Flex alignItems="center">
      <Text fontFamily="monospace" fontSize="0.9em" mr={2}>
        {displayText}
      </Text>
      <Box
        as="button"
        aria-label={label}
        title={hasCopied ? "已复制!" : "复制完整内容"}
        onClick={handleCopy}
        p={1}
        borderRadius="md"
        color="gray.500"
        _hover={{ color: "blue.500", bg: "gray.100" }}
        fontSize="sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </Box>
    </Flex>
  );
};

// 更新 CoinTypeDisplay 组件使用通用的 CopyableText
const CoinTypeDisplay: React.FC<{ coinType: string }> = ({ coinType }) => {
  return (
    <CopyableText 
      text={coinType} 
      displayText={formatCoinType(coinType)} 
      label="复制币种类型" 
    />
  );
};

// 更新 ObjectIdDisplay 组件使用通用的 CopyableText
const ObjectIdDisplay: React.FC<{ objectId: string }> = ({ objectId }) => {
  const displayText = `${objectId.slice(0, 4)}...${objectId.slice(-4)}`;
  
  return (
    <CopyableText 
      text={objectId} 
      displayText={displayText} 
      label="复制对象ID" 
    />
  );
};

const CoinManager: React.FC = () => {
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  // 统一的加载状态管理
  const [loadingState, setLoadingState] = useState({
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
      const coinsByType = new Map<string, CoinObject[]>();
      const coinMetadata = new Map<string, number>();

      // Fetch metadata for all coin types
      for (const coin of allCoins) {
        if (!coin.coinType) continue;
        
        if (!coinMetadata.has(coin.coinType)) {
          try {
            const metadata = await suiClient.getCoinMetadata({
              coinType: coin.coinType,
            });
            
            if (metadata) {
              coinMetadata.set(coin.coinType, metadata.decimals);
            } else {
              // Default to 9 decimals if metadata not found
              coinMetadata.set(coin.coinType, 9);
            }
          } catch (error) {
            console.error(`Error fetching metadata for ${coin.coinType}:`, error);
            // Default to 9 decimals on error
            coinMetadata.set(coin.coinType, 9);
          }
        }
      }

      allCoins.forEach(coin => {
        if (!coin.coinType) return;

        const decimals = coinMetadata.get(coin.coinType) || 9;
        
        const formattedCoin: CoinObject = {
          id: coin.coinObjectId,
          balance: coin.balance.toString(),
          type: coin.coinType,
          decimals: decimals,
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
        
        const decimals = coinMetadata.get(type) || 9;

        summaries.push({
          type,
          totalBalance,
          objectCount: coins.length,
          objects: coins,
          expanded: false,
          decimals: decimals
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

  // 通用事务执行函数 - 减少代码重复
  const executeTransaction = async (
    tx: Transaction, 
    successMessage: string, 
    operationType: 'batchMerge' | 'batchCleanZero' | 'singleOperation'
  ) => {
    try {
      setLoadingState(prev => ({ ...prev, [operationType]: true }));
      
      return new Promise((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              toast.success(successMessage);
              resolve({ success: true, result });
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

  // 优化批量合并函数
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
      
      // 为 Promise 返回值定义类型
      interface MergeResult {
        coinType: string;
        success: boolean;
        result?: any;
        error?: Error;
      }
      
      // 创建合并事务
      const mergePromises = mergeableCoinTypes.map(async (summary) => {
        const coinIds = summary.objects.map(coin => coin.id);
        const tx = new Transaction();
        const primaryCoin = coinIds[0];
        const otherCoins = coinIds.slice(1);
        tx.mergeCoins(primaryCoin, otherCoins);
        
        try {
          const result = await executeTransaction(
            tx, 
            `成功合并 ${formatCoinType(summary.type)} 币种`, 
            'batchMerge'
          );
          return {
            coinType: summary.type,
            success: true,
            result
          } as MergeResult;
        } catch (error) {
          return {
            coinType: summary.type,
            success: false,
            error: error instanceof Error ? error : new Error(String(error))
          } as MergeResult;
        }
      });
      
      const results = await Promise.all(mergePromises);
      
      // 统计结果
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      if (successCount > 0) {
        toast.success(t("coinManager.batchMergeSuccess") + `: 成功合并 ${successCount} 种币种${failureCount > 0 ? `，${failureCount} 种失败` : ''}`);
      }
      
      if (failureCount > 0 && successCount === 0) {
        toast.error(t("coinManager.error.batchMergeFailed") + ": 所有币种合并都失败了");
      }
      
      // 刷新币列表
      fetchAllCoins();
    } catch (error) {
      console.error("Error batch merging coins:", error);
      toast.error(t("coinManager.error.operationFailed") + ": " + (error instanceof Error ? error.message : t("coinManager.error.unknownError")));
    } finally {
      setLoadingState(prev => ({ ...prev, batchMerge: false }));
    }
  };

  // 优化批量清理零余额币函数
  const handleBatchCleanZero = async () => {
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }

    const coinTypesWithZeroBalance = coinTypeSummaries.filter(summary => 
      summary.objects.some(coin => parseInt(coin.balance, 10) === 0)
    );

    if (coinTypesWithZeroBalance.length === 0) {
      toast.error(t("coinManager.error.title") + ": 没有找到零余额币对象");
      return;
    }

    try {
      setLoadingState(prev => ({ ...prev, batchCleanZero: true }));
      
      interface CleanResult {
        coinType: string;
        coinCount?: number;
        success: boolean;
        result?: any;
        error?: Error;
      }
      
      const cleanPromises = coinTypesWithZeroBalance.map(async (summary) => {
        // 过滤零余额币
        const zeroBalanceCoins = summary.objects.filter(coin =>
          parseInt(coin.balance, 10) === 0
        );
        
        if (zeroBalanceCoins.length === 0) return null;
        
        const tx = new Transaction();
        
        if (summary.type === SUI_TYPE_ARG) {
          // SUI 币处理
          const zeroIds = zeroBalanceCoins.map(coin => coin.id);
          
          const nonZeroCoins = summary.objects.filter(coin =>
            parseInt(coin.balance, 10) > 0
          );
          
          if (nonZeroCoins.length === 0) {
            return {
              coinType: summary.type,
              success: false,
              error: new Error("需要至少一个有余额的 SUI 币作为 Gas")
            };
          }
          
          for (const zeroId of zeroIds) {
            tx.moveCall({
              target: "0x2::sui::destroy_zero_value_coin",
              arguments: [tx.object(zeroId)],
              typeArguments: [],
            });
          }
        } else {
          // 其他币种处理
          for (const zeroCoin of zeroBalanceCoins) {
            tx.moveCall({
              target: "0x2::coin::destroy_zero",
              arguments: [tx.object(zeroCoin.id)],
              typeArguments: [summary.type],
            });
          }
        }
        
        try {
          const result = await executeTransaction(
            tx,
            `成功清理 ${formatCoinType(summary.type)} 的零余额币`,
            'batchCleanZero'
          );
          return {
            coinType: summary.type,
            coinCount: zeroBalanceCoins.length,
            success: true,
            result
          } as CleanResult;
        } catch (error) {
          return {
            coinType: summary.type,
            success: false,
            error: error instanceof Error ? error : new Error(String(error))
          } as CleanResult;
        }
      });
      
      const results = await Promise.all(cleanPromises);
      const validResults = results.filter((r): r is CleanResult => r !== null);
      
      // 统计结果
      const successResults = validResults.filter(r => r.success);
      const successCount = successResults.length;
      const totalCleanedCoins = successResults.reduce((sum, r) => sum + (r.coinCount || 0), 0);
      const failureCount = validResults.length - successCount;
      
      if (successCount > 0) {
        toast.success(t("coinManager.batchCleanSuccess") + `: 成功清理 ${successCount} 种币种的零余额币，共 ${totalCleanedCoins} 个对象${failureCount > 0 ? `，${failureCount} 种失败` : ''}`);
      }
      
      if (failureCount > 0 && successCount === 0) {
        toast.error(t("coinManager.error.batchCleanFailed") + ": 所有币种清理都失败了");
      }
      
      // 刷新币列表
      fetchAllCoins();
      
    } catch (error) {
      console.error("Error batch cleaning zero-balance coins:", error);
      toast.error(t("coinManager.error.operationFailed") + ": " + (error instanceof Error ? error.message : t("coinManager.error.unknownError")));
    } finally {
      setLoadingState(prev => ({ ...prev, batchCleanZero: false }));
    }
  };

  // 优化单个币种的清零函数
  const handleCleanZeroCoins = async (coinType: string) => {
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }

    const summary = coinTypeSummaries.find(s => s.type === coinType);
    if (!summary) return;

    try {
      setLoadingState(prev => ({ ...prev, singleOperation: true }));

      // 过滤零余额币
      const zeroBalanceCoins = summary.objects.filter(coin =>
        parseInt(coin.balance, 10) === 0
      );

      if (zeroBalanceCoins.length === 0) {
        toast.error(t("coinManager.error.title") + ": 没有找到零余额币对象");
        setLoadingState(prev => ({ ...prev, singleOperation: false }));
        return;
      }

      // 创建事务
      const tx = new Transaction();

      if (coinType === SUI_TYPE_ARG) {
        // SUI 币处理
        const zeroIds = zeroBalanceCoins.map(coin => coin.id);
        const nonZeroCoins = summary.objects.filter(coin =>
          parseInt(coin.balance, 10) > 0
        );

        if (nonZeroCoins.length === 0) {
          toast.error(t("coinManager.error.operationFailed") + ": 需要至少一个有余额的 SUI 币作为 Gas");
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
        // 其他币种处理
        for (const zeroCoin of zeroBalanceCoins) {
          tx.moveCall({
            target: "0x2::coin::destroy_zero",
            arguments: [tx.object(zeroCoin.id)],
            typeArguments: [coinType],
          });
        }
      }

      // 执行事务
      await executeTransaction(
        tx,
        t("coinManager.cleanSuccess") + `: 已清理 ${zeroBalanceCoins.length} 个零余额币对象`,
        'singleOperation'
      );

      // 刷新币列表
      fetchAllCoins();
    } catch (error) {
      console.error("Error preparing clean transaction:", error);
    } finally {
      setLoadingState(prev => ({ ...prev, singleOperation: false }));
    }
  };

  // 优化单个币种合并函数
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
      // 自动选择该类型的所有币
      const coinIds = summary.objects.map(coin => coin.id);
      const newSelection = new Set(coinIds);
      setSelectedCoins(newSelection);

      // 创建新事务
      const tx = new Transaction();
      const primaryCoin = coinIds[0];
      const otherCoins = coinIds.slice(1);
      tx.mergeCoins(primaryCoin, otherCoins);

      // 执行事务
      await executeTransaction(
        tx,
        t("coinManager.mergeSuccess"),
        'singleOperation'
      );

      // 重置选择并刷新币列表
      setSelectedCoins(new Set());
      fetchAllCoins();
    } catch (error) {
      console.error("Error preparing merge transaction:", error);
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
                    colorScheme="blue"
                    loadingText="合并中..."
                    disabled={!hasMergeableCoins || loadingState.fetchCoins || loadingState.batchMerge || loadingState.batchCleanZero || loadingState.singleOperation}
                    onClick={handleBatchMerge}
                    title={!hasMergeableCoins ? "没有可合并的币种" : "合并所有可合并的币种"}
                    loading={loadingState.batchMerge}
                  >
                    一键合并
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    loadingText="清理中..."
                    disabled={!hasZeroBalanceCoins || loadingState.fetchCoins || loadingState.batchMerge || loadingState.batchCleanZero || loadingState.singleOperation}
                    onClick={handleBatchCleanZero}
                    title={!hasZeroBalanceCoins ? "没有零余额币对象" : "清理所有零余额币对象"}
                    loading={loadingState.batchCleanZero}
                  >
                    一键清零
                  </Button>
                </Flex>
              </Flex>

              {loadingState.fetchCoins ? (
                <Box textAlign="center" py={10}>
                  <Spinner size="xl" />
                  <Text mt={4}>{t("coinManager.loading")}</Text>
                </Box>
              ) : coinTypeSummaries.length === 0 ? (
                <Box p={4} bg="blue.50" color="blue.800" borderRadius="md">
                  <Text>{t("coinManager.noCoins")}</Text>
                </Box>
              ) : (
                <Box overflowX="auto">
                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "40px" }} />
                      <col style={{ width: "40%" }} />
                      <col style={{ width: "25%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "20%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ padding: "10px", textAlign: "left", width: "40px" }}>
                          {/* 展开/折叠列 */}
                        </th>
                        <th style={{ padding: "10px", textAlign: "left", width: "40%" }}>
                          {t("coinManager.name")}
                        </th>
                        <th style={{ padding: "10px", textAlign: "right", width: "25%" }}>
                          {t("coinManager.totalBalance")}
                        </th>
                        <th style={{ padding: "10px", textAlign: "left", width: "15%" }}>
                          {t("coinManager.objectCount")}
                        </th>
                        <th style={{ padding: "10px", textAlign: "left", width: "20%" }}>
                          {t("coinManager.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {coinTypeSummaries.map((summary) => (
                        <React.Fragment key={summary.type}>
                          <tr
                            style={{ backgroundColor: selectedCoinType === summary.type ? "rgba(66, 153, 225, 0.1)" : "white" }}
                          >
                            <td style={{ padding: "10px", textAlign: "center" }}>
                              <Box
                                as="button"
                                onClick={() => toggleCoinTypeExpansion(summary.type)}
                                p={1}
                                borderRadius="md"
                                color="gray.600"
                                _hover={{ color: "blue.500", bg: "gray.100" }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{
                                    transform: summary.expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                  }}
                                >
                                  <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                              </Box>
                            </td>
                            <td style={{ padding: "10px", fontFamily: "monospace", fontSize: "0.9em", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <Flex alignItems="center">
                                <CoinTypeDisplay coinType={summary.type} />
                              </Flex>
                            </td>
                            <td style={{ padding: "10px", textAlign: "right" }}>
                              {formatBalance(summary.totalBalance, summary.decimals)}
                            </td>
                            <td style={{ padding: "10px", textAlign: "center" }}>
                              <Badge colorScheme={summary.objectCount > 1 ? "orange" : "green"} fontSize="0.9em">
                                {summary.objectCount}
                              </Badge>
                            </td>
                            <td style={{ padding: "10px" }}>
                              <Flex gap={2}>
                                <Button
                                  size="sm"
                                  colorScheme="blue"
                                  variant="outline"
                                  disabled={loadingState.fetchCoins || loadingState.singleOperation || loadingState.batchMerge || loadingState.batchCleanZero || summary.objectCount < 2}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    autoMergeCoins(summary.type);
                                  }}
                                  loading={loadingState.singleOperation && selectedCoinType === summary.type}
                                >
                                  {t("coinManager.mergeCoin")}
                                </Button>
                                {summary.objects.some(coin => parseInt(coin.balance, 10) === 0) && (
                                  <Button
                                    size="sm"
                                    colorScheme="red"
                                    variant="outline"
                                    disabled={loadingState.fetchCoins || loadingState.singleOperation || loadingState.batchMerge || loadingState.batchCleanZero}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCleanZeroCoins(summary.type);
                                    }}
                                    loading={loadingState.singleOperation && selectedCoinType === summary.type}
                                  >
                                    {t("coinManager.cleanZeroCoins")}
                                  </Button>
                                )}
                              </Flex>
                            </td>
                          </tr>

                          {/* Expanded coin details */}
                          {summary.expanded && (
                            <tr>
                              <td colSpan={5} style={{ padding: 0 }}>
                                <Box p={4} bg="gray.50">
                                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                                    <colgroup>
                                      <col style={{ width: "40px" }} />
                                      <col style={{ width: "40%" }} />
                                      <col style={{ width: "25%" }} />
                                      <col style={{ width: "35%" }} />
                                    </colgroup>
                                    <thead>
                                      <tr>
                                        <th style={{ padding: "10px", width: "40px" }}></th>
                                        <th style={{ padding: "10px", textAlign: "left" }}>
                                          {t("coinManager.objectId")}
                                        </th>
                                        <th style={{ padding: "10px", textAlign: "right" }}>
                                          {t("coinManager.balance")}
                                        </th>
                                        <th></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {summary.objects.map((coin) => (
                                        <tr
                                          key={coin.id}
                                          onClick={() => toggleCoinSelection(coin.id)}
                                          style={{
                                            cursor: 'pointer',
                                            backgroundColor: selectedCoins.has(coin.id) ? "rgba(66, 153, 225, 0.1)" : ""
                                          }}
                                        >
                                          <td style={{ padding: "10px", width: "40px" }}></td>
                                          <td style={{ padding: "10px", fontFamily: "monospace", fontSize: "0.9em" }}>
                                            <ObjectIdDisplay objectId={coin.id} />
                                          </td>
                                          <td style={{ padding: "10px", textAlign: "right" }}>
                                            {parseInt(coin.balance, 10) === 0 ? (
                                              <Box as="span" px={2} py={1} bg="red.100" color="red.800" borderRadius="md" fontSize="0.8em">
                                                0
                                              </Box>
                                            ) : (
                                              formatBalance(coin.balance, summary.decimals)
                                            )}
                                          </td>
                                          <td></td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </Box>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
};

export default CoinManager; 