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
import { calculateValue } from "../../utils/priceUtils";

interface CoinBurnSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedCoinIds: string[]) => void;
  coins: CoinObject[];
  coinType: string;
  symbol: string;
  price?: string | null | undefined;
  decimals: number;
  isLoading: boolean;
}

// For Checkbox.onCheckedChange type definition
interface CheckedChangeEvent {
  checked?: boolean;
}

// Extended CoinObject interface to support additional properties for batch burn mode
interface ExtendedCoinObject extends CoinObject {
  symbol?: string;
  value?: number | null;
  price?: string | null;
  iconUrl?: string | null;  // Add icon URL field
}

// Coin type group data structure for batch mode
interface CoinTypeGroupData {
  symbol: string; 
  coins: ExtendedCoinObject[]; 
  decimals: number; 
  price: string | null;
  iconUrl?: string | null;  // Add icon URL field
}

const CoinBurnSelectionDialog: React.FC<CoinBurnSelectionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  coins,
  coinType,
  symbol,
  price,
  decimals,
  isLoading
}) => {
  const { t } = useTranslation();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [selectedCoinIds, setSelectedCoinIds] = useState<string[]>([]);
  
  // Check if it's batch burn mode (multiple coin types)
  const isBatchMode = coinType === "batch-burn";

  // Group coins by type
  const coinsByType = React.useMemo(() => {
    if (!isBatchMode) {
      return { [coinType]: { symbol, coins, decimals, price, iconUrl: coins[0]?.iconUrl || null } };
    }
    
    console.log("Batch mode - Original coins:", coins.length);
    console.log("SUI coins count (original):", coins.filter(c => 
      (c.type === "0x2::sui::SUI" || (c.type || "").includes("sui::SUI"))).length);
    
    // For batch mode, group by coin type
    const byType: Record<string, CoinTypeGroupData> = {};
    
    // Ensure all coins are included without filtering
    (coins as ExtendedCoinObject[]).forEach((coin: ExtendedCoinObject) => {
      // Ensure coin object has type property
      const type = coin.type || "";
      
      // Unified SUI coin type recognition - add extra check
      const normalizedType = type.includes("sui::SUI") ? "0x2::sui::SUI" : type;
      
      if (!byType[normalizedType]) {
        // Get coin type info
        const coinSymbol = coin.symbol || normalizedType.split("::").pop() || "Unknown";
        
        // Special handling for SUI coin icon
        const iconUrl = normalizedType === "0x2::sui::SUI" 
          ? "https://images.chaintoolkit.xyz/sui-logo.svg" 
          : coin.iconUrl || null;
        
        byType[normalizedType] = {
          symbol: coinSymbol,
          coins: [],
          decimals: coin.decimals || decimals,
          price: coin.price || null, // Use the price information carried by the coin itself
          iconUrl: iconUrl // Use special SUI icon or the coin's own icon URL
        };
      }
      
      // Ensure each coin object is added to the corresponding type array
      byType[normalizedType].coins.push({...coin});
    });
    
    // Output debug information
    console.log("Original coin count:", coins.length);
    Object.entries(byType).forEach(([type, data]) => {
      console.log(`${type} coin count:`, data.coins.length);
      if (type === "0x2::sui::SUI") {
        data.coins.forEach((c, i) => console.log(`SUI coin #${i+1} ID:`, c.id));
      }
    });
    
    // Sort coins, ensure SUI is always at the top
    const ordered: typeof byType = {};
    
    // If there are SUI coins, make sure they are processed first
    if (byType["0x2::sui::SUI"]) {
      // Add deep copy to prevent accidental modification
      ordered["0x2::sui::SUI"] = {
        ...byType["0x2::sui::SUI"],
        coins: [...byType["0x2::sui::SUI"].coins]
      };
      delete byType["0x2::sui::SUI"];
      
      // Add debug info
      console.log("SUI coin group processing - Coin count:", ordered["0x2::sui::SUI"].coins.length);
    }
    
    // Add remaining coin types
    Object.keys(byType).sort().forEach(key => {
      ordered[key] = {
        ...byType[key],
        coins: [...byType[key].coins]
      };
    });
    
    // Final check
    console.log("Final grouping result:");
    Object.entries(ordered).forEach(([type, data]) => {
      console.log(`${type}: ${data.coins.length} coins`);
    });
    console.log("Total:", Object.values(ordered).reduce((sum, data) => sum + data.coins.length, 0));
    
    return ordered;
  }, [coins, coinType, symbol, decimals, price, isBatchMode]);

  // Auto-select low value coins (< $0.1) or all coins if no price data is available
  useEffect(() => {
    if (isOpen && coins.length > 0) {
      // Default selection strategy
      let autoSelected: string[] = [];
      
      if (isBatchMode) {
        // In batch mode, also only select low value coins and zero balance coins
        autoSelected = (coins as ExtendedCoinObject[])
          .filter(coin => {
            // Include zero balance coins
            if (Number(coin.balance) === 0) return true;
            
            // Check if the coin has price data
            const coinPrice = coin.price || null;
            // If it has price, check if value is less than $0.1
            if (coinPrice) {
              const coinDecimals = coin.decimals || decimals;
              const value = Number(coin.balance) / Math.pow(10, coinDecimals) * Number(coinPrice);
              return value < 0.1;
            } else {
              // No price data, select all coins
              return true;
            }
          })
          .map(coin => coin.id);
        
        // Add debug logs
        console.log("Batch burn mode - Automatically selected coins:", autoSelected.length);
        console.log("Batch burn mode - Original coins count:", coins.length);
        console.log("SUI coins info:", coins.filter(c => (c.type || "").includes("sui::SUI")).length);
      } else if (price) {
        // Select low value coins (value < $0.1) and zero balance coins
        autoSelected = coins
          .filter(coin => {
            // Include zero balance coins
            if (Number(coin.balance) === 0) return true;
            
            const value = Number(coin.balance) / Math.pow(10, decimals) * Number(price);
            return value < 0.1;
          })
          .map(coin => coin.id);
      } else {
        // If no price data, select all coins including zero balance ones
        autoSelected = coins.map(coin => coin.id);
      }
      
      setSelectedCoinIds(autoSelected);
    }
  }, [isOpen, coins, price, decimals, isBatchMode]);

  // Listen for external events to force update selection state
  useEffect(() => {
    const handleUpdateCoins = (event: Event) => {
      if (isOpen && isBatchMode && coins.length > 0) {
        // Check if it's default selection ID list in batch burn mode
        const customEvent = event as CustomEvent;
        const defaultSelectedIds = customEvent.detail?.defaultSelectedIds as string[] | undefined;
        
        if (defaultSelectedIds && defaultSelectedIds.length > 0) {
          console.log(`Received default selected coin IDs: ${defaultSelectedIds.length}`);
          setSelectedCoinIds(defaultSelectedIds);
        } else {
          // Use original default selection logic
          const coinsToSelect = (coins as ExtendedCoinObject[])
            .filter(coin => {
              // Check if coin has price
              const coinPrice = coin.price || null;
              // If it has price, check if value is less than $0.1
              if (coinPrice) {
                const coinDecimals = coin.decimals || decimals;
                const value = Number(coin.balance) / Math.pow(10, coinDecimals) * Number(coinPrice);
                return value < 0.1 && Number(coin.balance) > 0;
              } else {
                // No price data, select all coins, no longer check balance
                return true;
              }
            })
            .map(coin => coin.id);
            
          setSelectedCoinIds(coinsToSelect);
        }
      }
    };
    
    document.addEventListener('updateCoins', handleUpdateCoins);
    return () => {
      document.removeEventListener('updateCoins', handleUpdateCoins);
    };
  }, [isOpen, isBatchMode, coins, decimals]);

  const handleConfirm = () => {
    onConfirm(selectedCoinIds);
  };

  // Helper to calculate total available coins for burn
  const calculateBurnableCoins = useCallback((coins: CoinObject[], type: string): string[] => {
    // For SUI, we need to keep at least 3 coins
    if (type === "0x2::sui::SUI") {
      const nonZeroCoins = coins.filter(c => Number(c.balance) > 0);
      return nonZeroCoins.length > 3 ? nonZeroCoins.slice(0, nonZeroCoins.length - 3).map(c => c.id) : [];
    }
    // For other coins, all non-zero balance coins can be burned
    return coins.filter(c => Number(c.balance) > 0).map(c => c.id);
  }, []);

  // Helper function to check if a coin is burnable (zero balance or low value)
  const isBurnableCoin = useCallback((coin: ExtendedCoinObject, type: string): boolean => {
    // Always include zero balance coins first
    if (Number(coin.balance) === 0) {
      console.log(`Coin ${coin.id} is burnable (zero balance)`);
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
        console.log(`Cannot burn SUI coin ${coin.id} (highest balance, must keep)`);
        return false;
      }

      // For other SUI coins, check value if price available
      if (coin.price) {
        const value = Number(coin.balance) / Math.pow(10, coin.decimals || decimals) * Number(coin.price);
        const isLowValue = value < 0.1;
        console.log(`SUI coin ${coin.id} value: $${value}, isLowValue: ${isLowValue}`);
        return isLowValue;
      }

      // If no price data available for SUI, allow burning
      console.log(`SUI coin ${coin.id} is burnable (no price data)`);
      return true;
    }

    // For non-SUI coins with price data, check value
    if (coin.price) {
      const value = Number(coin.balance) / Math.pow(10, coin.decimals || decimals) * Number(coin.price);
      const isLowValue = value < 0.1;
      console.log(`Coin ${coin.id} value: $${value}, isLowValue: ${isLowValue}`);
      return isLowValue;
    }

    // If no price data available and non-zero balance, include the coin
    console.log(`Coin ${coin.id} is burnable (no price data)`);
    return true;
  }, [coinsByType, decimals]);

  // Calculate total selectable coins
  const getTotalSelectableCoins = useCallback(() => {
    if (isBatchMode) {
      let totalBurnable = 0;
      Object.entries(coinsByType).forEach(([type, data]) => {
        data.coins.forEach((coin: ExtendedCoinObject) => {
          if (isBurnableCoin(coin, type)) {
            totalBurnable++;
          }
        });
      });
      return totalBurnable;
    } else {
      // For single coin type mode
      let totalSelectable = 0;
      coins.forEach(coin => {
        // Include zero balance coins
        if (Number(coin.balance) === 0) {
          totalSelectable++;
          return;
        }

        // Check value if price is available
        if (price) {
          const value = Number(coin.balance) / Math.pow(10, decimals) * Number(price);
          if (value < 0.1) {
            totalSelectable++;
          }
        } else {
          // If no price data available, include all coins
          totalSelectable++;
        }
      });
      return totalSelectable;
    }
  }, [isBatchMode, coinsByType, coins, price, decimals, isBurnableCoin]);

  // Add debug logs for checkbox state
  const totalSelectable = getTotalSelectableCoins();
  const isAllSelected = selectedCoinIds.length > 0 && selectedCoinIds.length === totalSelectable;
  const isIndeterminate = selectedCoinIds.length > 0 && selectedCoinIds.length < totalSelectable;
  
  console.log("Checkbox state:", {
    selectedCount: selectedCoinIds.length,
    totalSelectable,
    isAllSelected,
    isIndeterminate
  });

  // Toggle selection of all coins
  const toggleSelectAll = (checked: boolean) => {
    try {
      if (checked) {
        const allIds: string[] = [];
        
        if (isBatchMode) {
          // For batch mode, select all burnable coins
          Object.entries(coinsByType).forEach(([type, data]) => {
            data.coins.forEach((coin: ExtendedCoinObject) => {
              // Check if coin is burnable based on our criteria
              if (isBurnableCoin(coin, type)) {
                allIds.push(coin.id);
                console.log(`Selected coin ${coin.id} for burning`);
              } else {
                console.log(`Skipped coin ${coin.id} - not burnable`);
              }
            });
          });
          console.log(`Total coins selected for burning: ${allIds.length}`);
        } else {
          // For single coin type, select all burnable coins
          coins.forEach(coin => {
            // Include zero balance coins
            if (Number(coin.balance) === 0) {
              allIds.push(coin.id);
              console.log(`Selected zero balance coin ${coin.id}`);
              return;
            }

            // Check value if price is available
            if (price) {
              const value = Number(coin.balance) / Math.pow(10, decimals) * Number(price);
              if (value < 0.1) {
                allIds.push(coin.id);
                console.log(`Selected low value coin ${coin.id}, value: $${value}`);
                return;
              }
            } else {
              // If no price data available, include all coins
              allIds.push(coin.id);
              console.log(`Selected coin ${coin.id} (no price data)`);
            }
          });
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
      const validIds = calculateBurnableCoins(typeCoins, type);
      
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

  // Toggle single coin selection with type safety
  const toggleCoinSelection = (coinId: string, type: string, checked: boolean) => {
    try {
      setSelectedCoinIds(prev => {
        const newSelection = new Set(prev);
        
        if (checked) {
          // Find the coin we're trying to select
          const coin = Object.values(coinsByType)
            .flatMap(group => group.coins)
            .find(c => c.id === coinId);

          if (!coin) {
            console.warn(`Coin ${coinId} not found`);
            return prev;
          }

          // Check if this is a burnable coin
          if (isBurnableCoin(coin, type)) {
            newSelection.add(coinId);
            console.log(`Added coin ${coinId} to selection`);
          } else {
            console.warn(`Coin ${coinId} is not burnable`);
            return prev;
          }
        } else {
          newSelection.delete(coinId);
          console.log(`Removed coin ${coinId} from selection`);
        }
        
        return Array.from(newSelection);
      });
    } catch (error) {
      console.error("Error in toggleCoinSelection:", error);
    }
  };

  const totalValueSelected = !isBatchMode && price 
    ? selectedCoinIds.reduce((sum, id) => {
        const coin = coins.find(c => c.id === id);
        if (coin) {
          return sum + calculateValue(coin.balance, price, decimals);
        }
        return sum;
      }, 0)
    : null;

  // Render coin type group in batch mode
  const renderCoinTypeGroup = (type: string, data: CoinTypeGroupData) => {
    const { symbol, coins: typeCoins, decimals, price: typePrice, iconUrl } = data;
    
    // Ensure typeCoins is an array and has correct count
    console.log(`Rendering ${type} coin group, count:`, typeCoins.length);
    
    // Prevent empty array causing render issues
    if (!Array.isArray(typeCoins) || typeCoins.length === 0) {
      return null;
    }
    
    const selectedInType = typeCoins.filter((coin: CoinObject) => selectedCoinIds.includes(coin.id));
    const allSelected = selectedInType.length === typeCoins.length && typeCoins.length > 0;
    const someSelected = selectedInType.length > 0 && selectedInType.length < typeCoins.length;
    
    return (
      <Box key={type} w="100%" borderWidth="1px" borderRadius="md" mb={3}>
        {/* Coin type title and selection */}
        <Flex 
          p={3} 
          bg="gray.100" 
          justifyContent="space-between" 
          alignItems="center"
          borderTopRadius="md"
        >
          <Flex alignItems="center">
            <Checkbox.Root 
              checked={allSelected}
              indeterminate={someSelected}
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
                          // Hide the image on error and show background color
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {/* This will show when image fails to load */}
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
                  <Text fontWeight="bold">{symbol} ({typeCoins.length}) {!typePrice && !isBatchMode && <Badge colorPalette="yellow" size="sm">{t("coinManager.noPrice")}</Badge>}</Text>
                </Flex>
              </Checkbox.Label>
            </Checkbox.Root>
          </Flex>
          <Text fontSize="sm">
            {selectedInType.length} / {typeCoins.length} {t("coinManager.selected")}
          </Text>
        </Flex>
        
        {/* Table header */}
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
          <Text flex="0 0 100px" textAlign="right" fontSize="sm">{t("coinManager.value")}</Text>
        </Flex>
        
        {/* Coin list */}
        <Box>
          {typeCoins.map((coin: CoinObject, index: number) => {
            const isSelected = selectedCoinIds.includes(coin.id);
            // Calculate coin value
            let coinValue = null;
            if (typePrice) {
              coinValue = calculateValue(coin.balance, typePrice, decimals);
            }
            const isLowValue = coinValue !== null && coinValue < 0.1 && Number(coin.balance) > 0;
            
            return (
              <Flex 
                key={coin.id} 
                p={2}
                px={3}
                justifyContent="space-between" 
                alignItems="center"
                bg={isSelected ? "blue.50" : undefined}
                _hover={{ bg: "gray.50" }}
                borderTopWidth={index > 0 ? "1px" : 0}
                borderColor="gray.200"
              >
                <Checkbox.Root 
                  checked={isSelected}
                  onCheckedChange={(e: CheckedChangeEvent) => 
                    toggleCoinSelection(coin.id, type, !!e.checked)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
                
                <Text fontFamily="mono" fontSize="xs" flex="1 1 auto" pl={2} title={coin.id}>
                  {formatCoinId(coin.id)}
                </Text>
                
                <Text textAlign="right" flex="0 0 100px" fontSize="sm">
                  {formatBalance(coin.balance, decimals)}
                </Text>
                
                <Flex direction="column" alignItems="flex-end" flex="0 0 100px">
                  {coinValue !== null ? (
                    <>
                      <Text fontSize="sm">${coinValue.toFixed(4)}</Text>
                      {isLowValue && <Badge colorPalette="orange" size="sm">{t("coinManager.lowValue")}</Badge>}
                    </>
                  ) : (
                    <Text fontSize="sm">-</Text>
                  )}
                </Flex>
              </Flex>
            );
          })}
        </Box>
      </Box>
    );
  };

  // Simplified mode, avoiding component nesting issues
  const renderBatchBurnView = () => {
    // Calculate total coin count in all groups
    const totalCoinsCount = Object.values(coinsByType).reduce((sum, typeData) => {
      return sum + typeData.coins.length;
    }, 0);
    
    return (
      <Box>
        <Text mb={4}>
          {t("coinManager.batchBurnCoinsDescription")}
        </Text>
        
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
            {t("coinManager.selected")}: {selectedCoinIds.length} / {totalCoinsCount}
          </Text>
        </Flex>
        
        <Box maxH="500px" overflowY="auto">
          {Object.entries(coinsByType).map(([type, data]) => 
            renderCoinTypeGroup(type, data)
          )}
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
                  {isBatchMode 
                    ? t("coinManager.batchBurnCoinsTitle") 
                    : t("coinManager.burnCoinsTitle", { symbol })}
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
                {isBatchMode ? (
                  // Batch burn view
                  renderBatchBurnView()
                ) : (
                  // Original single coin type mode
                  <>
                    <Text mb={4}>{t("coinManager.burnCoinsDescription")}</Text>
                
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
                      <Box borderWidth="1px" borderRadius="md">
                        {/* Table header */}
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
                          <Text flex="0 0 100px" textAlign="right">{t("coinManager.value")}</Text>
                        </Flex>

                        <VStack align="stretch" divideY="1px">
                          {coins.map((coin, index) => {
                            const isSelected = selectedCoinIds.includes(coin.id);
                            const value = price ? calculateValue(coin.balance, price, decimals) : null;
                            const isLowValue = value !== null && value < 0.1 && Number(coin.balance) > 0;
                            
                            return (
                              <Flex 
                                key={coin.id} 
                                p={3} 
                                justifyContent="space-between" 
                                alignItems="center"
                                bg={isSelected ? "blue.50" : undefined}
                                _hover={{ bg: "gray.50" }}
                              >
                                <Checkbox.Root 
                                  checked={isSelected}
                                  onCheckedChange={(e: CheckedChangeEvent) => toggleCoinSelection(coin.id, coinType, !!e.checked)}
                                >
                                  <Checkbox.HiddenInput />
                                  <Checkbox.Control />
                                </Checkbox.Root>
                                
                                <Text fontFamily="mono" fontSize="sm" flex="1 1 auto" pl={2} title={coin.id}>
                                  {formatCoinId(coin.id)}
                                </Text>
                                
                                <Text textAlign="right" flex="0 0 100px">
                                  {formatBalance(coin.balance, decimals)}
                                </Text>
                                
                                <Flex direction="column" alignItems="flex-end" flex="0 0 100px">
                                  {value !== null ? (
                                    <>
                                      <Text>${value.toFixed(4)}</Text>
                                      {isLowValue && <Badge colorPalette="orange" size="sm">{t("coinManager.lowValue")}</Badge>}
                                    </>
                                  ) : (
                                    <Text>-</Text>
                                  )}
                                </Flex>
                              </Flex>
                            );
                          })}
                        </VStack>
                      </Box>
                    </Box>
                    
                    {totalValueSelected !== null && (
                      <Text mt={3} textAlign="right">
                        {t("coinManager.totalValueSelected")}: ${totalValueSelected.toFixed(4)}
                      </Text>
                    )}
                  </>
                )}
              </Dialog.Body>
              
              <Dialog.Footer>
                <Button ref={cancelRef} onClick={onClose} disabled={isLoading}>
                  {t("common.cancel")}
                </Button>
                <Button 
                  colorPalette="red" 
                  onClick={handleConfirm} 
                  ml={3}
                  loading={isLoading}
                  loadingText={t("coinManager.loading")}
                  disabled={selectedCoinIds.length === 0}
                >
                  {t("coinManager.burnCoins")}
                </Button>
              </Dialog.Footer>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default CoinBurnSelectionDialog; 