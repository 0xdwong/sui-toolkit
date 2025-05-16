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

// 扩展CoinObject接口以支持批量销毁模式的额外属性
interface ExtendedCoinObject extends CoinObject {
  symbol?: string;
  value?: number | null;
  price?: string | null;
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
  
  // 检查是否是批量销毁模式 (多种币种)
  const isBatchMode = coinType === "batch-burn";

  // 按照币种对代币进行分组
  const coinsByType = React.useMemo(() => {
    if (!isBatchMode) {
      return { [coinType]: { symbol, coins, decimals, price } };
    }
    
    console.log("批量模式 - 原始代币:", coins.length);
    console.log("SUI代币数量 (原始):", coins.filter(c => 
      (c.type === "0x2::sui::SUI" || (c.type || "").includes("sui::SUI"))).length);
    
    // 对于批量模式，按币种分组
    const byType: Record<string, { 
      symbol: string; 
      coins: ExtendedCoinObject[]; 
      decimals: number; 
      price: string | null 
    }> = {};
    
    // 确保所有代币都被包含，不进行任何过滤
    (coins as ExtendedCoinObject[]).forEach(coin => {
      // 确保coin对象有type属性
      const type = coin.type || "";
      
      // 统一SUI代币类型识别 - 添加额外检查
      const normalizedType = type.includes("sui::SUI") ? "0x2::sui::SUI" : type;
      
      if (!byType[normalizedType]) {
        // 获取币种信息
        const coinSymbol = coin.symbol || normalizedType.split("::").pop() || "Unknown";
        byType[normalizedType] = {
          symbol: coinSymbol,
          coins: [],
          decimals: coin.decimals || decimals,
          price: coin.price || null // 使用代币自身携带的价格信息
        };
      }
      
      // 确保每个代币对象都被添加到相应类型的数组中
      byType[normalizedType].coins.push({...coin});
    });
    
    // 输出调试信息
    console.log("原始代币数量:", coins.length);
    Object.entries(byType).forEach(([type, data]) => {
      console.log(`${type} 代币数量:`, data.coins.length);
      if (type === "0x2::sui::SUI") {
        data.coins.forEach((c, i) => console.log(`SUI代币 #${i+1} ID:`, c.id));
      }
    });
    
    // 对代币进行排序，确保SUI始终位于顶部
    const ordered: typeof byType = {};
    
    // 如果有SUI代币，确保它们首先被处理
    if (byType["0x2::sui::SUI"]) {
      // 添加深度拷贝，防止意外修改
      ordered["0x2::sui::SUI"] = {
        ...byType["0x2::sui::SUI"],
        coins: [...byType["0x2::sui::SUI"].coins]
      };
      delete byType["0x2::sui::SUI"];
      
      // 添加调试信息
      console.log("SUI代币组处理 - 代币数量:", ordered["0x2::sui::SUI"].coins.length);
    }
    
    // 添加剩余的代币类型
    Object.keys(byType).sort().forEach(key => {
      ordered[key] = {
        ...byType[key],
        coins: [...byType[key].coins]
      };
    });
    
    // 最终检查
    console.log("最终分组结果:");
    Object.entries(ordered).forEach(([type, data]) => {
      console.log(`${type}: ${data.coins.length} 个代币`);
    });
    console.log("总计:", Object.values(ordered).reduce((sum, data) => sum + data.coins.length, 0));
    
    return ordered;
  }, [coins, coinType, symbol, decimals, price, isBatchMode]);

  // Auto-select low value coins (< $0.1) or all coins if no price data is available
  useEffect(() => {
    if (isOpen && coins.length > 0) {
      // Default selection strategy
      let autoSelected: string[] = [];
      
      if (isBatchMode) {
        // 批量模式下也只选择低价值代币
        autoSelected = (coins as ExtendedCoinObject[])
          .filter(coin => {
            // 检查代币是否有价格
            const coinPrice = coin.price || null;
            // 如果有价格，检查价值是否小于0.1美元
            if (coinPrice) {
              const coinDecimals = coin.decimals || decimals;
              const value = Number(coin.balance) / Math.pow(10, coinDecimals) * Number(coinPrice);
              return value < 0.1 && Number(coin.balance) > 0;
            } else {
              // 无价格数据，选择所有代币，不再检查余额
              return true;
            }
          })
          .map(coin => coin.id);
        
        // 添加调试日志
        console.log("批量销毁模式 - 自动选择代币数:", autoSelected.length);
        console.log("批量销毁模式 - 原始代币数:", coins.length);
        console.log("SUI代币信息:", coins.filter(c => (c.type || "").includes("sui::SUI")).length);
      } else if (price) {
        // Select low value coins (value < $0.1)
        autoSelected = coins
          .filter(coin => {
            const value = Number(coin.balance) / Math.pow(10, decimals) * Number(price);
            return value < 0.1 && Number(coin.balance) > 0;
          })
          .map(coin => coin.id);
      } else {
        // If no price data, select all coins, no need to check balance
        autoSelected = coins.map(coin => coin.id);
      }
      
      setSelectedCoinIds(autoSelected);
    }
  }, [isOpen, coins, price, decimals, isBatchMode]);

  // 监听外部事件，用于强制更新选择状态
  useEffect(() => {
    const handleUpdateCoins = (event: Event) => {
      if (isOpen && isBatchMode && coins.length > 0) {
        // 检查是否是批量销毁模式下的默认选择ID列表
        const customEvent = event as CustomEvent;
        const defaultSelectedIds = customEvent.detail?.defaultSelectedIds as string[] | undefined;
        
        if (defaultSelectedIds && defaultSelectedIds.length > 0) {
          console.log(`接收到默认选择代币ID: ${defaultSelectedIds.length}个`);
          setSelectedCoinIds(defaultSelectedIds);
        } else {
          // 使用原始的默认选择逻辑
          const coinsToSelect = (coins as ExtendedCoinObject[])
            .filter(coin => {
              // 检查代币是否有价格
              const coinPrice = coin.price || null;
              // 如果有价格，检查价值是否小于0.1美元
              if (coinPrice) {
                const coinDecimals = coin.decimals || decimals;
                const value = Number(coin.balance) / Math.pow(10, coinDecimals) * Number(coinPrice);
                return value < 0.1 && Number(coin.balance) > 0;
              } else {
                // 无价格数据，选择所有代币，不再检查余额
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

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all
      if (isBatchMode) {
        // 在批量模式下，需要从分组中获取所有代币ID
        const allIds: string[] = [];
        Object.values(coinsByType).forEach(typeData => {
          typeData.coins.forEach(coin => {
            allIds.push(coin.id);
          });
        });
        setSelectedCoinIds(allIds);
      } else {
        // 单币种模式，直接使用coins
        setSelectedCoinIds(coins.map(coin => coin.id));
      }
    } else {
      // Deselect all
      setSelectedCoinIds([]);
    }
  };
  
  // 切换特定币种的全选状态
  const toggleCoinTypeSelection = (typeCoins: CoinObject[], checked: boolean) => {
    const typeIds = typeCoins.map(coin => coin.id);
    
    setSelectedCoinIds(prev => {
      if (checked) {
        // 添加该币种的所有币
        const currentSelected = new Set(prev);
        typeIds.forEach(id => currentSelected.add(id));
        return Array.from(currentSelected);
      } else {
        // 移除该币种的所有币
        return prev.filter(id => !typeIds.includes(id));
      }
    });
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

  const totalValueSelected = !isBatchMode && price 
    ? selectedCoinIds.reduce((sum, id) => {
        const coin = coins.find(c => c.id === id);
        if (coin) {
          return sum + calculateValue(coin.balance, price, decimals);
        }
        return sum;
      }, 0)
    : null;

  // 渲染批量模式下的币种组
  const renderCoinTypeGroup = (type: string, data: any) => {
    const { symbol, coins: typeCoins, decimals, price: typePrice } = data;
    
    // 确保typeCoins是数组，并且有正确的数量
    console.log(`渲染${type}代币组，数量:`, typeCoins.length);
    
    // 防止空数组导致渲染问题
    if (!Array.isArray(typeCoins) || typeCoins.length === 0) {
      return null;
    }
    
    const selectedInType = typeCoins.filter((coin: CoinObject) => selectedCoinIds.includes(coin.id));
    const allSelected = selectedInType.length === typeCoins.length && typeCoins.length > 0;
    const someSelected = selectedInType.length > 0 && selectedInType.length < typeCoins.length;
    
    return (
      <Box key={type} w="100%" borderWidth="1px" borderRadius="md" mb={3}>
        {/* 币种标题和选择 */}
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
                toggleCoinTypeSelection(typeCoins, !!e.checked)}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                <Text fontWeight="bold" ml={2}>{symbol} ({typeCoins.length}) {!typePrice && !isBatchMode && <Badge colorPalette="yellow" size="sm">{t("coinManager.noPrice")}</Badge>}</Text>
              </Checkbox.Label>
            </Checkbox.Root>
          </Flex>
          <Text fontSize="sm">
            {selectedInType.length} / {typeCoins.length} {t("coinManager.selected")}
          </Text>
        </Flex>
        
        {/* 表头 */}
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
        
        {/* 币列表 */}
        <Box>
          {typeCoins.map((coin: CoinObject, index: number) => {
            const isSelected = selectedCoinIds.includes(coin.id);
            // 计算代币价值
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

  // 简化版模式，避开组件嵌套问题
  const renderBatchBurnView = () => {
    // 计算所有分组中的代币总数
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
            checked={selectedCoinIds.length === totalCoinsCount && totalCoinsCount > 0}
            indeterminate={selectedCoinIds.length > 0 && selectedCoinIds.length < totalCoinsCount}
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
                  // 批量销毁视图
                  renderBatchBurnView()
                ) : (
                  // 原始的单币种模式
                  <>
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
                    
                    <Box maxH="500px" overflowY="auto">
                      <Box borderWidth="1px" borderRadius="md">
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