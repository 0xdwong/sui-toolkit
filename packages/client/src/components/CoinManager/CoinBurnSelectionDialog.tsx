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

// 为Checkbox的onCheckedChange添加类型定义
interface CheckedChangeEvent {
  checked?: boolean;
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

  // Auto-select low value coins (< $0.1) or all coins if no price data is available
  useEffect(() => {
    if (isOpen && coins.length > 0) {
      // Default selection strategy
      let autoSelected: string[] = [];
      
      if (price) {
        // Select low value coins (value < $0.1)
        autoSelected = coins
          .filter(coin => {
            const value = Number(coin.balance) / Math.pow(10, decimals) * Number(price);
            return value < 0.1 && Number(coin.balance) > 0;
          })
          .map(coin => coin.id);
      } else {
        // If no price data, select all non-zero balance coins
        autoSelected = coins
          .filter(coin => Number(coin.balance) > 0)
          .map(coin => coin.id);
      }
      
      setSelectedCoinIds(autoSelected);
    }
  }, [isOpen, coins, price, decimals]);

  const handleConfirm = () => {
    onConfirm(selectedCoinIds);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all
      setSelectedCoinIds(coins.map(coin => coin.id));
    } else {
      // Deselect all
      setSelectedCoinIds([]);
    }
  };

  const toggleCoinSelection = (coinId: string, checked: boolean) => {
    setSelectedCoinIds(prev => {
      if (checked) {
        // Add to selection if not already included
        return prev.includes(coinId) ? prev : [...prev, coinId];
      } else {
        // Remove from selection
        return prev.filter(id => id !== coinId);
      }
    });
  };

  const totalValueSelected = price 
    ? selectedCoinIds.reduce((sum, id) => {
        const coin = coins.find(c => c.id === id);
        if (coin) {
          return sum + calculateValue(coin.balance, price, decimals);
        }
        return sum;
      }, 0)
    : null;

  return (
    <Dialog.Root open={isOpen} role="alertdialog" onOpenChange={(open: boolean) => !open && onClose()} initialFocusEl={cancelRef}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{t("coinManager.burnCoinsTitle", { symbol })}</Dialog.Title>
              <CloseButton 
                position="absolute" 
                right="4" 
                top="4" 
                size="sm" 
                onClick={onClose} 
              />
            </Dialog.Header>
            
            <Dialog.Body>
              <Text mb={4}>{t("coinManager.burnCoinsDescription")}</Text>
              
              <Flex justifyContent="space-between" alignItems="center" mb={3}>
                <Checkbox.Root 
                  checked={selectedCoinIds.length === coins.length && coins.length > 0}
                  indeterminate={selectedCoinIds.length > 0 && selectedCoinIds.length < coins.length}
                  onCheckedChange={(e: CheckedChangeEvent) => toggleSelectAll(!!e.checked)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>{t("coinManager.selectAll")}</Checkbox.Label>
                </Checkbox.Root>
                <Text fontSize="sm">
                  {t("coinManager.selected")}: {selectedCoinIds.length} / {coins.length}
                </Text>
              </Flex>
              
              <Box maxH="300px" overflowY="auto" borderWidth="1px" borderRadius="md">
                {/* 表头 */}
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

                <Flex direction="column" gap={0}>
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
                        borderBottomWidth={index < coins.length - 1 ? "1px" : 0}
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
                </Flex>
              </Box>
              
              {totalValueSelected !== null && (
                <Text mt={3} textAlign="right">
                  {t("coinManager.totalValueSelected")}: ${totalValueSelected.toFixed(4)}
                </Text>
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
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default CoinBurnSelectionDialog; 