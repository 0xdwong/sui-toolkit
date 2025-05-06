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
import { CoinStruct } from "@mysten/sui/client";

// Interface for coin objects
interface CoinObject {
  id: string;
  balance: string;
  type: string;
}

// Interface for coin type summary
interface CoinTypeSummary {
  type: string;
  totalBalance: string;
  objectCount: number;
  objects: CoinObject[];
  expanded: boolean;
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

const CoinManager: React.FC = () => {
  const { t } = useTranslation();
  const toast = useSimpleToast();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  // State variables
  const [selectedCoinType, setSelectedCoinType] = useState<string | null>(null);
  const [coinTypeSummaries, setCoinTypeSummaries] = useState<CoinTypeSummary[]>([]);
  const [selectedCoins, setSelectedCoins] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  
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
      setLoading(true);
      
      // Get all coins for the account
      const { data: allCoins } = await suiClient.getAllCoins({
        owner: currentAccount.address,
      });
      
      // Group coins by type
      const coinsByType = new Map<string, CoinObject[]>();
      
      allCoins.forEach(coin => {
        if (!coin.coinType) return;
        
        const formattedCoin: CoinObject = {
          id: coin.coinObjectId,
          balance: coin.balance.toString(),
          type: coin.coinType,
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
        
        summaries.push({
          type,
          totalBalance,
          objectCount: coins.length,
          objects: coins,
          expanded: false
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
      toast.error({
        title: t("coinManager.error.title"),
        description: t("coinManager.error.unknownError"),
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle merge coins action
  const handleMergeCoins = async (coinType: string) => {
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
    
    try {
      setLoading(true);
      
      // Create a new transaction
      const tx = new Transaction();
      
      // Get the selected coin IDs
      const coinIds = Array.from(selectedCoins);
      
      // For SUI coins use Pay module, for other coins use different approach
      if (coinType === SUI_TYPE_ARG) {
        // Get the primary coin (first one will be destination, others merged into it)
        const primaryCoin = coinIds[0];
        const otherCoins = coinIds.slice(1);
        
        // Merge all other coins into the primary coin
        tx.mergeCoins(primaryCoin, otherCoins);
      } else {
        // For non-SUI coins we use different approach
        // Create a vector of coins to merge
        tx.moveCall({
          target: "0x2::coin::join_vec",
          arguments: [
            tx.object(coinIds[0]), // Primary coin
            tx.makeMoveVec({
              elements: coinIds.slice(1).map(id => tx.object(id)),
              type: "object"
            })
          ],
          typeArguments: [coinType],
        });
      }
      
      // Execute transaction
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: () => {
            toast.success({
              title: t("coinManager.mergeSuccess"),
            });
            
            // Reset selection and refresh coin list
            setSelectedCoins(new Set());
            fetchAllCoins();
          },
          onError: (error) => {
            console.error("Error merging coins:", error);
            toast.error({
              title: t("coinManager.error.operationFailed"),
              description: error instanceof Error ? error.message : t("coinManager.error.unknownError"),
            });
          },
        }
      );
    } catch (error) {
      console.error("Error preparing merge transaction:", error);
      toast.error({
        title: t("coinManager.error.operationFailed"),
        description: error instanceof Error ? error.message : t("coinManager.error.unknownError"),
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle clean zero balance coins action
  const handleCleanZeroCoins = async (coinType: string) => {
    if (!currentAccount) {
      toast.error({
        title: t("coinManager.error.title"),
        description: t("coinManager.error.connectWallet"),
      });
      return;
    }
    
    const summary = coinTypeSummaries.find(s => s.type === coinType);
    if (!summary) return;
    
    try {
      setLoading(true);
      
      // Filter zero balance coins
      const zeroBalanceCoins = summary.objects.filter(coin => 
        parseInt(coin.balance, 10) === 0
      );
      
      if (zeroBalanceCoins.length === 0) {
        toast.warning({
          title: t("coinManager.error.title"),
          description: "没有找到零余额币对象",
        });
        setLoading(false);
        return;
      }
      
      // Create transaction
      const tx = new Transaction();
      
      // For each zero balance coin, destroy it
      if (coinType === SUI_TYPE_ARG) {
        // For SUI coins
        const zeroIds = zeroBalanceCoins.map(coin => coin.id);
        
        // We need a non-zero balance coin as the gas coin
        const nonZeroCoins = summary.objects.filter(coin => 
          parseInt(coin.balance, 10) > 0
        );
        
        if (nonZeroCoins.length === 0) {
          toast.error({
            title: t("coinManager.error.operationFailed"),
            description: "需要至少一个有余额的 SUI 币作为 Gas",
          });
          setLoading(false);
          return;
        }
        
        // Use destroyZeroBalanceCoin on each zero balance coin
        for (const zeroId of zeroIds) {
          tx.moveCall({
            target: "0x2::sui::destroy_zero_value_coin",
            arguments: [tx.object(zeroId)],
            typeArguments: [],
          });
        }
      } else {
        // For other coin types
        for (const zeroCoin of zeroBalanceCoins) {
          tx.moveCall({
            target: "0x2::coin::destroy_zero",
            arguments: [tx.object(zeroCoin.id)],
            typeArguments: [coinType],
          });
        }
      }
      
      // Execute transaction
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: () => {
            toast.success({
              title: t("coinManager.cleanSuccess"),
              description: `已清理 ${zeroBalanceCoins.length} 个零余额币对象`,
            });
            
            // Refresh coin list
            fetchAllCoins();
          },
          onError: (error) => {
            console.error("Error cleaning zero-balance coins:", error);
            toast.error({
              title: t("coinManager.error.operationFailed"),
              description: error instanceof Error ? error.message : t("coinManager.error.unknownError"),
            });
          },
        }
      );
    } catch (error) {
      console.error("Error preparing clean transaction:", error);
      toast.error({
        title: t("coinManager.error.operationFailed"),
        description: error instanceof Error ? error.message : t("coinManager.error.unknownError"),
      });
    } finally {
      setLoading(false);
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
              <Text fontWeight="medium" mb={2}>{t("coinManager.coinList")}</Text>
              {loading ? (
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
                              {formatBalance(summary.totalBalance)}
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
                                  colorScheme="red" 
                                  variant="outline"
                                  disabled={loading}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCleanZeroCoins(summary.type);
                                  }}
                                >
                                  {t("coinManager.cleanZeroCoins")}
                                </Button>
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
                                              formatBalance(coin.balance)
                                            )}
                                          </td>
                                          <td></td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  
                                  <Flex justifyContent="flex-end" mt={4}>
                                    <Button 
                                      colorScheme="blue" 
                                      disabled={selectedCoins.size < 2 || loading}
                                      onClick={() => handleMergeCoins(summary.type)}
                                    >
                                      {t("coinManager.mergeCoin")}
                                    </Button>
                                  </Flex>
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

// CoinType display component with copy button
const CoinTypeDisplay: React.FC<{ coinType: string }> = ({ coinType }) => {
  const { onCopy, hasCopied } = useClipboard(coinType);
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof onCopy === 'function') {
      onCopy();
    } else {
      // 降级方案：如果 onCopy 不是函数，使用 navigator.clipboard API
      try {
        navigator.clipboard.writeText(coinType);
        alert("已复制到剪贴板");
      } catch (err) {
        console.error("复制失败:", err);
      }
    }
  };
  
  return (
    <Flex alignItems="center">
      <Text fontFamily="monospace" fontSize="0.9em" mr={2}>
        {formatCoinType(coinType)}
      </Text>
      <Box 
        as="button"
        aria-label="复制币种类型"
        title={hasCopied ? "已复制!" : "复制完整类型"}
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

// ObjectId display component with copy button
const ObjectIdDisplay: React.FC<{ objectId: string }> = ({ objectId }) => {
  const { onCopy, hasCopied } = useClipboard(objectId);
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof onCopy === 'function') {
      onCopy();
    } else {
      // 降级方案：如果 onCopy 不是函数，使用 navigator.clipboard API
      try {
        navigator.clipboard.writeText(objectId);
        alert("已复制到剪贴板");
      } catch (err) {
        console.error("复制失败:", err);
      }
    }
  };
  
  return (
    <Flex alignItems="center">
      <Text fontFamily="monospace" fontSize="0.9em" mr={2}>
        {objectId.slice(0, 4)}...{objectId.slice(-4)}
      </Text>
      <Box 
        as="button"
        aria-label="复制对象ID"
        title={hasCopied ? "已复制!" : "复制完整ID"}
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

export default CoinManager; 