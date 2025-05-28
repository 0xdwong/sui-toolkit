import React, { useState, useEffect } from "react";
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
    
    // Filter zero balance coins first (if it's a clean operation)
    const filteredCoins = operationType === "clean" 
      ? (coins as ExtendedCoinObject[]).filter(coin => parseInt(coin.balance, 10) === 0)
      : coins as ExtendedCoinObject[];

    // Process each coin and group by type
    filteredCoins.forEach((coin: ExtendedCoinObject) => {
      const type = coin.type || "";
      
      if (!byType[type]) {
        byType[type] = {
          symbol: coin.symbol || type.split("::").pop() || "Unknown",
          coins: [],
          decimals: coin.decimals || decimals,
          iconUrl: coin.iconUrl
        };
      }
      
      byType[type].coins.push({...coin});
    });

    // Filter out coin types that don't need merging or have no zero balance coins
    if (operationType === "merge") {
      Object.keys(byType).forEach(type => {
        const typeData = byType[type];
        // For SUI, need more than 2 coins; for others, need more than 1 coin
        const minCoins = type === "0x2::sui::SUI" ? 3 : 2;
        if (typeData.coins.length < minCoins) {
          delete byType[type];
        }
      });
    } else if (operationType === "clean") {
      // For clean operation, remove types without zero balance coins
      Object.keys(byType).forEach(type => {
        if (byType[type].coins.length === 0) {
          delete byType[type];
        }
      });
    }
    
    // Sort coins
    const ordered: typeof byType = {};
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
        // For clean operation, select all zero balance coins
        const zeroBalanceCoins = coins.filter(coin => parseInt(coin.balance, 10) === 0);
        setSelectedCoinIds(zeroBalanceCoins.map(coin => coin.id));
      } else if (operationType === "merge") {
        // For merge operation, select all coins
        setSelectedCoinIds(coins.map(coin => coin.id));
      }
    }
  }, [isOpen, coins, operationType]);

  const handleConfirm = () => {
    onConfirm(selectedCoinIds);
  };

  // Toggle selection of all coins
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all coins based on operation type
      const allIds: string[] = [];
      if (isBatchMode) {
        Object.values(coinsByType).forEach(typeData => {
          typeData.coins.forEach((coin: CoinObject) => {
            if (operationType === "clean") {
              // For clean, only select zero balance coins
              if (parseInt(coin.balance, 10) === 0) {
                allIds.push(coin.id);
              }
            } else {
              // For merge, select all coins
              allIds.push(coin.id);
            }
          });
        });
      } else {
        coins.forEach(coin => {
          if (operationType === "clean") {
            // For clean, only select zero balance coins
            if (parseInt(coin.balance, 10) === 0) {
              allIds.push(coin.id);
            }
          } else {
            // For merge, select all coins
            allIds.push(coin.id);
          }
        });
      }
      setSelectedCoinIds(allIds);
    } else {
      // Deselect all coins
      setSelectedCoinIds([]);
    }
  };
  
  // Toggle selection of all coins of a specific type
  const toggleCoinTypeSelection = (typeCoins: CoinObject[], checked: boolean) => {
    const typeIds = typeCoins.map(coin => coin.id);
    
    setSelectedCoinIds(prev => {
      if (checked) {
        const currentSelected = new Set(prev);
        if (operationType === "merge") {
          // For merge, exclude the first coin
          typeIds.slice(1).forEach(id => currentSelected.add(id));
        } else {
          // For clean, only select zero balance coins
          typeCoins.forEach(coin => {
            if (parseInt(coin.balance, 10) === 0) {
              currentSelected.add(coin.id);
            }
          });
        }
        return Array.from(currentSelected);
      } else {
        return prev.filter(id => !typeIds.includes(id));
      }
    });
  };

  const toggleCoinSelection = (coinId: string, checked: boolean) => {
    setSelectedCoinIds(prev => {
      if (checked) {
        return prev.includes(coinId) ? prev : [...prev, coinId];
      } else {
        return prev.filter(id => id !== coinId);
      }
    });
  };

  // Render coin type group in batch mode
  const renderCoinTypeGroup = (type: string, data: CoinTypeGroupData) => {
    const { symbol, coins: typeCoins, decimals, iconUrl } = data;
    
    // Filter coins based on operation type
    const filteredCoins = operationType === "clean"
      ? typeCoins.filter(coin => parseInt(coin.balance, 10) === 0)
      : typeCoins;
    
    if (!Array.isArray(filteredCoins) || filteredCoins.length === 0) {
      return null;
    }
    
    const selectedInType = filteredCoins.filter((coin: CoinObject) => selectedCoinIds.includes(coin.id));
    const allSelected = selectedInType.length === filteredCoins.length && filteredCoins.length > 0;
    const someSelected = selectedInType.length > 0 && selectedInType.length < filteredCoins.length;
    
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
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={(e: CheckedChangeEvent) => 
                toggleCoinTypeSelection(filteredCoins, !!e.checked)}
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
                  <Text fontWeight="bold">{symbol} ({filteredCoins.length})</Text>
                </Flex>
              </Checkbox.Label>
            </Checkbox.Root>
          </Flex>
          <Text fontSize="sm">
            {selectedInType.length} / {filteredCoins.length} {t("coinManager.selected")}
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
          {filteredCoins.map((coin: CoinObject, index: number) => {
            const isSelected = selectedCoinIds.includes(coin.id);
            const isZeroBalance = parseInt(coin.balance, 10) === 0;
            
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
                    toggleCoinSelection(coin.id, !!e.checked)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
                
                <Text fontFamily="mono" fontSize="xs" flex="1 1 auto" pl={2} title={coin.id}>
                  {formatCoinId(coin.id)}
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
                
                <Flex justifyContent="space-between" alignItems="center" mb={3}>
                  <Checkbox.Root 
                    checked={selectedCoinIds.length === (operationType === "clean" 
                      ? coins.filter(coin => parseInt(coin.balance, 10) === 0).length 
                      : coins.length) && coins.length > 0}
                    indeterminate={selectedCoinIds.length > 0 && selectedCoinIds.length < (operationType === "clean" 
                      ? coins.filter(coin => parseInt(coin.balance, 10) === 0).length 
                      : coins.length)}
                    onCheckedChange={(e: CheckedChangeEvent) => toggleSelectAll(!!e.checked)}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>{t("coinManager.selectAll")}</Checkbox.Label>
                  </Checkbox.Root>
                  <Text fontSize="sm">
                    {t("coinManager.selected")}: {selectedCoinIds.length} / {operationType === "clean" 
                      ? coins.filter(coin => parseInt(coin.balance, 10) === 0).length 
                      : coins.length}
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
                                onCheckedChange={(e: CheckedChangeEvent) => toggleCoinSelection(coin.id, !!e.checked)}
                              >
                                <Checkbox.HiddenInput />
                                <Checkbox.Control />
                              </Checkbox.Root>
                              
                              <Text fontFamily="mono" fontSize="sm" flex="1 1 auto" pl={2} title={coin.id}>
                                {formatCoinId(coin.id)}
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