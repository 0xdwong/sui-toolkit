import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Dialog,
  Portal,
  Checkbox,
  Flex,
  Box,
  Text,
  Badge,
  CloseButton,
  VStack,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { CoinObject } from "./types";
import { formatBalance, formatCoinId } from "./utils";

interface CoinOperationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedCoinIds: string[]) => void;
  coins: CoinObject[];
  coinType: string;
  symbol: string;
  decimals: number;
  isLoading: boolean;
  operationType: "merge" | "clean"; // Add operation type to determine dialog behavior
  iconUrl?: string | null;
}

// For Checkbox.onCheckedChange type definition
interface CheckedChangeEvent {
  checked?: boolean;
}

// Extended CoinObject interface to support additional properties for batch mode
interface ExtendedCoinObject extends CoinObject {
  symbol?: string;
  iconUrl?: string | null;
  price?: string | null;  // Add price field
  value?: number | null;  // Add value field
  decimals?: number;      // Add decimals field
}

// Coin type group data structure for batch mode
interface CoinTypeGroupData {
  symbol: string; 
  coins: ExtendedCoinObject[]; 
  decimals: number;
  iconUrl?: string | null;
}

const CoinOperationDialog: React.FC<CoinOperationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  coins,
  coinType,
  symbol,
  decimals,
  isLoading,
  operationType,
  iconUrl
}) => {
  const { t } = useTranslation();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [selectedCoinIds, setSelectedCoinIds] = useState<string[]>([]);
  
  // Check if it's batch mode (multiple coin types)
  const isBatchMode = coinType === "batch-operation";

  // Helper function to calculate total available coins based on operation type
  const calculateTotalCoins = useCallback((coins: CoinObject[], type: string): string[] => {
    if (operationType === "merge") {
      // For merge operation, handle SUI coins specially
      if (type === "0x2::sui::SUI") {
        // For SUI, we need at least 3 coins to merge - including zero balance coins
        if (coins.length >= 3) {
          // Only return other coins, excluding the highest balance one (which will be used for gas)
          // Sort coins by balance (descending) to identify the highest balance coin
          const sortedCoins = [...coins].sort((a, b) => 
            Number(BigInt(b.balance) - BigInt(a.balance))
          );
          
          // Return all coins except the highest balance one
          return sortedCoins.slice(1).map(c => c.id);
        } else {
          return [];
        }
      }
      // For other coins, need at least 2 coins to merge
      if (coins.length >= 2) {
        return coins.map(c => c.id);
      } else {
        return [];
      }
    } else if (operationType === "clean") {
      // For clean operation, only select zero balance coins
      const zeroCoins = coins.filter(c => Number(c.balance) === 0);
      return zeroCoins.map(c => c.id);
    }
    return [];
  }, [operationType]);

  // Find the highest balance SUI coin ID (to be used as gas and disabled from selection)
  const getHighestBalanceSuiCoinId = useCallback((coins: CoinObject[], type: string): string | null => {
    if (type === "0x2::sui::SUI" && coins.length > 0) {
      const sortedCoins = [...coins].sort((a, b) => 
        Number(BigInt(b.balance) - BigInt(a.balance))
      );
      return sortedCoins[0].id;
    }
    return null;
  }, []);

  // Group coins by type
  const coinsByType = React.useMemo(() => {
    if (!isBatchMode) {
      // For clean operation, only show coins with zero balance
      const filteredCoins = operationType === "clean" 
        ? coins.filter(coin => parseInt(coin.balance, 10) === 0)
        : coins;
      return { [coinType]: { symbol, coins: filteredCoins, decimals, iconUrl } };
    }
    
    // For batch mode, group by coin type
    const byType: Record<string, CoinTypeGroupData> = {};
    
    // Process each coin and group by type
    (coins as ExtendedCoinObject[]).forEach((coin: ExtendedCoinObject) => {
      // Ensure type field exists
      const type = coin.type || "";
      
      // Standardize SUI token type identification
      let normalizedType = type;
      // Exact match for 0x2::sui::SUI or contains sui::SUI
      if (type === "0x2::sui::SUI" || type.includes("sui::SUI")) {
        normalizedType = "0x2::sui::SUI";
      }
      
      if (!byType[normalizedType]) {
        // Get coin type info
        const coinSymbol = coin.symbol || normalizedType.split("::").pop() || "Unknown";
        
        // Special handling for SUI tokens
        const iconUrl = normalizedType === "0x2::sui::SUI" 
          ? "https://images.chaintoolkit.xyz/sui-logo.svg" 
          : coin.iconUrl || null;
        
        byType[normalizedType] = {
          symbol: coinSymbol,
          coins: [],
          decimals: coin.decimals || decimals,
          iconUrl: iconUrl
        };
      }
      
      // Add each coin object to the corresponding type array
      byType[normalizedType].coins.push({...coin});
    });
    
    // Modify this part: For merge operation, don't filter out coin types that don't meet criteria
    // Only filter in clean operation
    if (operationType === "clean") {
      // For clean operation, remove types without zero balance coins
      Object.keys(byType).forEach(type => {
        const zeroBalanceCoins = byType[type].coins.filter(c => parseInt(c.balance, 10) === 0);
        if (zeroBalanceCoins.length === 0) {
          delete byType[type];
        } else {
          // Only keep zero balance coins
          byType[type].coins = zeroBalanceCoins;
        }
      });
    } else if (operationType === "merge") {
      // For merge operation, only check if there are enough coins to merge, but don't filter the coin list
      // This ensures all SUI objects are displayed
      Object.keys(byType).forEach(type => {
        // For SUI, need at least 3 coins to merge
        // For other coin types, need at least 2 coins to merge
        const minCoins = type === "0x2::sui::SUI" ? 3 : 2;
        if (byType[type].coins.length < minCoins) {
          delete byType[type];
        }
      });
    }
    
    // Sort coins, ensure SUI is always at the top
    const ordered: typeof byType = {};
    
    // If there are SUI tokens, ensure they are processed first
    if (byType["0x2::sui::SUI"]) {
      ordered["0x2::sui::SUI"] = {
        ...byType["0x2::sui::SUI"],
        coins: [...byType["0x2::sui::SUI"].coins]
      };
      delete byType["0x2::sui::SUI"];
    }
    
    // Add remaining coin types
    Object.keys(byType).sort().forEach(key => {
      ordered[key] = {
        ...byType[key],
        coins: [...byType[key].coins]
      };
    });
    
    return ordered;
  }, [coins, coinType, symbol, decimals, isBatchMode, iconUrl, operationType]);

  // Auto-select coins based on operation type
  useEffect(() => {
    if (isOpen && coins.length > 0) {
      if (operationType === "clean") {
        // 清理操作：选择所有零余额币
        const zeroBalanceCoins = coins.filter(coin => parseInt(coin.balance, 10) === 0);
        setSelectedCoinIds(zeroBalanceCoins.map(coin => coin.id));
      } else if (operationType === "merge") {
        if (isBatchMode) {
          // 批量合并模式
          const allIds: string[] = [];
          
          Object.entries(coinsByType).forEach(([type, data]) => {
            if (type === "0x2::sui::SUI") {
              // 对于 SUI 类型，排除余额最高的对象
              if (data.coins.length >= 3) {
                // 按余额排序
                const sortedCoins = [...data.coins].sort((a, b) => 
                  Number(BigInt(b.balance) - BigInt(a.balance))
                );
                
                // 排除最高余额的 SUI，选择其余所有 SUI
                const selectableSuiIds = sortedCoins.slice(1).map(c => c.id);
                selectableSuiIds.forEach(id => allIds.push(id));
              }
            } else {
              // 对于非 SUI 类型，选择所有币
              if (data.coins.length >= 2) {
                data.coins.forEach((coin: CoinObject) => allIds.push(coin.id));
              }
            }
          });
          
          console.log(`Auto-selected ${allIds.length} coins for batch merge`);
          setSelectedCoinIds(allIds);
        } else {
          // 单类型合并模式
          if (coinType === "0x2::sui::SUI") {
            // 对于 SUI 类型，排除余额最高的对象
            if (coins.length >= 3) {
              // 按余额排序
              const sortedCoins = [...coins].sort((a, b) => 
                Number(BigInt(b.balance) - BigInt(a.balance))
              );
              
              // 排除最高余额的 SUI，选择其余所有 SUI
              const selectableSuiIds = sortedCoins.slice(1).map(c => c.id);
              setSelectedCoinIds(selectableSuiIds);
            } else {
              setSelectedCoinIds([]);
            }
          } else {
            // 对于非 SUI 类型，选择所有币
            if (coins.length >= 2) {
              setSelectedCoinIds(coins.map(c => c.id));
            } else {
              setSelectedCoinIds([]);
            }
          }
        }
      }
    } else {
      setSelectedCoinIds([]);
    }
  }, [isOpen, coins, operationType, isBatchMode, coinsByType, coinType]);

  const handleConfirm = () => {
    // For SUI merging, ensure we're not including the highest balance SUI in the selected list
    if (operationType === "merge") {
      // Filter out highest balance SUI coins for each SUI type in batch mode
      const filteredSelectedCoinIds = selectedCoinIds.filter(id => {
        // Check if this is a SUI coin
        for (const [type, data] of Object.entries(coinsByType)) {
          if (type === "0x2::sui::SUI") {
            // Skip if this is the highest balance SUI coin
            if (id === highestBalanceSuiIds[type]) {
              return false;
            }
          }
        }
        return true;
      });
      
      onConfirm(filteredSelectedCoinIds);
    } else {
      onConfirm(selectedCoinIds);
    }
  };

  // Helper function to check if a coin is burnable (zero balance or low value)
  const isBurnableCoin = useCallback((coin: ExtendedCoinObject, type: string): boolean => {
    // Always include zero balance coins
    if (Number(coin.balance) === 0) {
      return true;
    }

    // For SUI coins, ensure we keep at least 1 non-zero balance coin
    if (type === "0x2::sui::SUI") {
      const suiCoins = coinsByType[type]?.coins || [];
      const nonZeroSuiCoins = suiCoins
        .filter((c: ExtendedCoinObject) => Number(c.balance) > 0)
        .sort((a, b) => Number(BigInt(b.balance) - BigInt(a.balance))); // Sort by balance desc

      // Keep the highest balance coin
      const isHighestBalance = nonZeroSuiCoins[0]?.id === coin.id;
      if (isHighestBalance) {
        return false;
      }

      // For other SUI coins with price, check value
      if (coin.price) {
        const value = Number(coin.balance) / Math.pow(10, coin.decimals || decimals) * Number(coin.price);
        const isLowValue = value < 0.1;
        return isLowValue;
      }
    }

    // Check for low value if price is available
    if (coin.price) {
      const value = Number(coin.balance) / Math.pow(10, coin.decimals || decimals) * Number(coin.price);
      const isLowValue = value < 0.1;
      return isLowValue;
    }

    // If no price data available and non-zero balance, include the coin
    return true;
  }, [coinsByType, decimals]);

  // Calculate total selectable coins
  const getTotalSelectableCoins = useCallback(() => {
    if (isBatchMode) {
      let total = 0;
      Object.entries(coinsByType).forEach(([type, data]) => {
        const validIds = calculateTotalCoins(data.coins, type);
        total += validIds.length;
      });
      return total;
    }
    return calculateTotalCoins(coins, coinType).length;
  }, [isBatchMode, coinsByType, coins, coinType, calculateTotalCoins]);

  // Calculate checkbox state
  const totalSelectable = getTotalSelectableCoins();
  const isAllSelected = selectedCoinIds.length > 0 && selectedCoinIds.length === totalSelectable;
  const isIndeterminate = selectedCoinIds.length > 0 && selectedCoinIds.length < totalSelectable;
  
  // Toggle selection of all coins
  const toggleSelectAll = (checked: boolean) => {
    try {
      if (checked) {
        const allIds: string[] = [];
        
        if (isBatchMode) {
          Object.entries(coinsByType).forEach(([type, data]) => {
            const validIds = calculateTotalCoins(data.coins, type);
            validIds.forEach(id => allIds.push(id));
          });
        } else {
          const validIds = calculateTotalCoins(coins, coinType);
          validIds.forEach(id => allIds.push(id));
        }
        
        setSelectedCoinIds(allIds);
      } else {
        setSelectedCoinIds([]);
      }
    } catch (error) {
      console.error("Error in toggleSelectAll:", error);
      setSelectedCoinIds([]);
    }
  };
  
  // Toggle selection of all coins of a specific type
  const toggleCoinTypeSelection = (typeCoins: CoinObject[], type: string, checked: boolean) => {
    try {
      const validIds = calculateTotalCoins(typeCoins, type);
      
      setSelectedCoinIds(prev => {
        if (checked) {
          const currentSelected = new Set(prev);
          validIds.forEach(id => currentSelected.add(id));
          return Array.from(currentSelected);
        } else {
          return prev.filter(id => !validIds.includes(id));
        }
      });
    } catch (error) {
      console.error("Error in toggleCoinTypeSelection:", error);
    }
  };

  // Identify the highest balance SUI coin ID for each coin type
  const highestBalanceSuiIds = React.useMemo(() => {
    const result: Record<string, string | null> = {};
    Object.entries(coinsByType).forEach(([type, data]) => {
      if (type === "0x2::sui::SUI") {
        result[type] = getHighestBalanceSuiCoinId(data.coins, type);
      }
    });
    return result;
  }, [coinsByType, getHighestBalanceSuiCoinId]);

  const toggleCoinSelection = (coinId: string, type: string, checked: boolean) => {
    try {
      // Don't allow selection of the highest balance SUI coin
      if (type === "0x2::sui::SUI" && coinId === highestBalanceSuiIds[type]) {
        return;
      }
      
      setSelectedCoinIds(prev => {
        const newSelection = new Set(prev);
        
        if (checked) {
          // Verify if this coin can be selected
          const typeCoins = coinsByType[type]?.coins || [];
          const validIds = calculateTotalCoins(typeCoins, type);
          
          if (validIds.includes(coinId)) {
            newSelection.add(coinId);
          } else {
            return prev;
          }
        } else {
          newSelection.delete(coinId);
        }
        
        return Array.from(newSelection);
      });
    } catch (error) {
      console.error("Error in toggleCoinSelection:", error);
    }
  };

  // Render a coin type group for batch mode
  const renderCoinTypeGroup = (type: string, data: CoinTypeGroupData) => {
    const { symbol, coins: typeCoins, decimals } = data;
    
    // 修改这部分：在合并模式下，显示所有币，而不是经过过滤的可用币
    const availableCoins = operationType === "clean" 
      ? typeCoins.filter(c => parseInt(c.balance, 10) === 0)
      : typeCoins; // 合并模式显示所有币
    
    const selectedInType = selectedCoinIds.filter(id => 
      availableCoins.some(c => c.id === id)
    );
    
    if (availableCoins.length === 0) return null;
    
    const isTypeSelected = selectedInType.length === availableCoins.length && availableCoins.length > 0;
    const isTypeIndeterminate = selectedInType.length > 0 && selectedInType.length < availableCoins.length;
    
    const iconUrl = data.iconUrl || null;
    
    return (
      <Box key={type} w="100%" borderWidth="1px" borderRadius="md" mb={3}>
        <Flex 
          p={3} 
          bg="gray.100" 
          justifyContent="space-between" 
          alignItems="center"
          borderTopRadius="md"
        >
          <Flex alignItems="center">
            <Checkbox.Root 
              checked={isTypeSelected}
              indeterminate={isTypeIndeterminate}
              onCheckedChange={(e: CheckedChangeEvent) => 
                toggleCoinTypeSelection(typeCoins, type, !!e.checked)}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                <Flex alignItems="center" ml={2}>
                  {iconUrl ? (
                    <Box position="relative" boxSize="20px" mr={2}>
                      <img 
                        src={iconUrl} 
                        alt={symbol}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <Box 
                        position="absolute" 
                        top="0" 
                        left="0" 
                        boxSize="20px" 
                        borderRadius="full" 
                        bg="gray.200" 
                        zIndex="-1"
                      />
                    </Box>
                  ) : (
                    <Box boxSize="20px" bg="gray.200" borderRadius="full" mr={2} />
                  )}
                  <Text fontWeight="bold">{symbol} ({availableCoins.length})</Text>
                </Flex>
              </Checkbox.Label>
            </Checkbox.Root>
          </Flex>
          <Text fontSize="sm">
            {selectedInType.length} / {availableCoins.length} {t("coinManager.selected")}
          </Text>
        </Flex>
        
        <Flex 
          p={2} 
          px={3}
          justifyContent="space-between" 
          alignItems="center" 
          bg="gray.50" 
          fontWeight="medium"
        >
          <Box flex="0 0 24px"></Box>
          <Text flex="1 1 auto" pl={2} fontSize="sm">{t("coinManager.coinObject")}</Text>
          <Text flex="0 0 100px" textAlign="right" fontSize="sm">{t("coinManager.amount")}</Text>
        </Flex>
        
        <Box>
          {availableCoins.map((coin: CoinObject, index: number) => {
            const isSelected = selectedCoinIds.includes(coin.id);
            const isZeroBalance = parseInt(coin.balance, 10) === 0;
            // Check if this is the highest balance SUI coin (which should be disabled)
            const isHighestBalanceSui = type === "0x2::sui::SUI" && coin.id === highestBalanceSuiIds[type];
            
            return (
              <Flex 
                key={coin.id} 
                p={2}
                px={3}
                justifyContent="space-between" 
                alignItems="center"
                bg={isSelected ? "blue.50" : isHighestBalanceSui ? "yellow.50" : undefined}
                _hover={{ bg: isHighestBalanceSui ? "yellow.50" : "gray.50" }}
                borderTopWidth={index > 0 ? "1px" : 0}
                borderColor="gray.200"
              >
                <Checkbox.Root 
                  checked={isSelected}
                  disabled={isHighestBalanceSui}
                  onCheckedChange={(e: CheckedChangeEvent) => 
                    toggleCoinSelection(coin.id, type, !!e.checked)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
                
                <Text 
                  fontFamily="mono" 
                  fontSize="xs" 
                  flex="1 1 auto" 
                  pl={2} 
                  title={coin.id}
                  color={isHighestBalanceSui ? "orange.500" : undefined}
                >
                  {formatCoinId(coin.id)}
                  {isHighestBalanceSui && (
                    <Badge ml={2} colorPalette="orange" size="sm">
                      {t("coinManager.gasReserved")}
                    </Badge>
                  )}
                </Text>
                
                <Text textAlign="right" flex="0 0 100px" fontSize="sm">
                  {formatBalance(coin.balance, decimals)}
                  {isZeroBalance && (
                    <Badge ml={2} colorPalette="red" size="sm">
                      {t("coinManager.zero")}
                    </Badge>
                  )}
                </Text>
              </Flex>
            );
          })}
        </Box>
      </Box>
    );
  };

  return (
    <Dialog.Root open={isOpen} role="alertdialog" onOpenChange={(open: boolean) => !open && onClose()} initialFocusEl={cancelRef}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Box maxW={isBatchMode ? "750px" : "600px"} w="100%">
              <Dialog.Header>
                <Dialog.Title>
                  {operationType === "merge" 
                    ? t("coinManager.mergeCoinsTitle", { symbol }) 
                    : t("coinManager.cleanCoinsTitle", { symbol })}
                </Dialog.Title>
                <CloseButton 
                  position="absolute" 
                  right="4" 
                  top="4" 
                  size="sm" 
                  onClick={onClose} 
                />
              </Dialog.Header>
              
              <Dialog.Body>
                <Text mb={4}>
                  {operationType === "merge" 
                    ? t("coinManager.mergeCoinsTitle", { symbol }) 
                    : t("coinManager.cleanCoinsDescription")}
                </Text>
                
                {/* Add special note for SUI merge */}
                {operationType === "merge" && (coinType === "0x2::sui::SUI" || coinType === "batch-operation") && (
                  <Box p={3} bg="blue.50" color="blue.800" borderRadius="md" mb={4}>
                    <Text fontSize="sm">
                      {t("coinManager.suiMergeNote")}
                    </Text>
                  </Box>
                )}
                
                <Flex justifyContent="space-between" alignItems="center" mb={3}>
                  <Checkbox.Root 
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onCheckedChange={(e: CheckedChangeEvent) => toggleSelectAll(!!e.checked)}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>{t("coinManager.selectAll")}</Checkbox.Label>
                  </Checkbox.Root>
                  <Text fontSize="sm">
                    {t("coinManager.selected")}: {selectedCoinIds.length} / {totalSelectable}
                  </Text>
                </Flex>
                
                <Box maxH="500px" overflowY="auto">
                  {isBatchMode ? (
                    Object.entries(coinsByType).map(([type, data]) => 
                      renderCoinTypeGroup(type, data)
                    )
                  ) : (
                    <Box borderWidth="1px" borderRadius="md">
                      <Flex 
                        p={3} 
                        justifyContent="space-between" 
                        alignItems="center" 
                        bg="gray.50" 
                        borderBottomWidth="1px"
                        fontWeight="medium"
                      >
                        <Box flex="0 0 24px"></Box>
                        <Text flex="1 1 auto" pl={2}>{t("coinManager.coinObject")}</Text>
                        <Text flex="0 0 100px" textAlign="right">{t("coinManager.amount")}</Text>
                      </Flex>

                      <VStack align="stretch" divideY="1px">
                        {(operationType === "clean" 
                          ? coins.filter(coin => parseInt(coin.balance, 10) === 0)
                          : coins
                        ).map((coin, index) => {
                          const isSelected = selectedCoinIds.includes(coin.id);
                          const isZeroBalance = parseInt(coin.balance, 10) === 0;
                          // Check if this is the highest balance SUI coin (which should be disabled)
                          const isHighestBalanceSui = coinType === "0x2::sui::SUI" && coin.id === getHighestBalanceSuiCoinId(coins, coinType);
                          
                          return (
                            <Flex 
                              key={coin.id} 
                              p={3} 
                              justifyContent="space-between" 
                              alignItems="center"
                              bg={isSelected ? "blue.50" : isHighestBalanceSui ? "yellow.50" : undefined}
                              _hover={{ bg: isHighestBalanceSui ? "yellow.50" : "gray.50" }}
                            >
                              <Checkbox.Root 
                                checked={isSelected}
                                disabled={isHighestBalanceSui}
                                onCheckedChange={(e: CheckedChangeEvent) => toggleCoinSelection(coin.id, coinType, !!e.checked)}
                              >
                                <Checkbox.HiddenInput />
                                <Checkbox.Control />
                              </Checkbox.Root>
                              
                              <Text 
                                fontFamily="mono" 
                                fontSize="sm" 
                                flex="1 1 auto" 
                                pl={2} 
                                title={coin.id}
                                color={isHighestBalanceSui ? "orange.500" : undefined}
                              >
                                {formatCoinId(coin.id)}
                                {isHighestBalanceSui && (
                                  <Badge ml={2} colorPalette="orange" size="sm">
                                    {t("coinManager.gasReserved")}
                                  </Badge>
                                )}
                              </Text>
                              
                              <Text textAlign="right" flex="0 0 100px">
                                {formatBalance(coin.balance, decimals)}
                                {isZeroBalance && (
                                  <Badge ml={2} colorPalette="red" size="sm">
                                    {t("coinManager.zero")}
                                  </Badge>
                                )}
                              </Text>
                            </Flex>
                          );
                        })}
                      </VStack>
                    </Box>
                  )}
                </Box>
              </Dialog.Body>
              
              <Dialog.Footer>
                <Button ref={cancelRef} onClick={onClose} disabled={isLoading}>
                  {t("common.cancel")}
                </Button>
                <Button 
                  colorPalette={operationType === "merge" ? "blue" : "red"}
                  onClick={handleConfirm} 
                  ml={3}
                  loading={isLoading}
                  loadingText={t("coinManager.loading")}
                  disabled={selectedCoinIds.length === 0}
                >
                  {operationType === "merge" 
                    ? t("coinManager.mergeCoins")
                    : t("coinManager.cleanCoins")}
                </Button>
              </Dialog.Footer>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default CoinOperationDialog; 