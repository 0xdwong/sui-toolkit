import React, { useMemo } from "react";
import {
  Box,
  Button,
  Checkbox,
  Center,
  Dialog,
  Flex,
  Spinner,
  Stack,
  Stat,
  Text,
  Field,
  Slider,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { CoinObject } from "./types";
import { ObjectIdDisplay } from "./DisplayComponents";
import { formatBalance, formatCoinType } from "./utils";

interface SmallValueCoin {
  coinType: string;
  symbol: string;
  objects: CoinObject[];
}

interface SmallValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  smallValueCoins: SmallValueCoin[];
  selectedCoins: Set<string>;
  threshold: number;
  isLoading: boolean;
  loadingPrices: boolean;
  coinPrices: Record<string, number>;
  onThresholdChange: (value: number) => void;
  onApplyThreshold: () => void;
  onToggleCoinSelection: (coinId: string) => void;
  onSelectAll: () => void;
  onUnselectAll: () => void;
  onConfirmClean: () => void;
}

const SmallValueModal: React.FC<SmallValueModalProps> = ({
  isOpen,
  onClose,
  smallValueCoins,
  selectedCoins,
  threshold,
  isLoading,
  loadingPrices,
  coinPrices,
  onThresholdChange,
  onApplyThreshold,
  onToggleCoinSelection,
  onSelectAll,
  onUnselectAll,
  onConfirmClean
}) => {
  const { t } = useTranslation();
  
  // 计算是否全选
  const allCoinsIds = useMemo(() => {
    return smallValueCoins.flatMap(coinGroup => 
      coinGroup.objects.map(coin => coin.id)
    );
  }, [smallValueCoins]);
  
  const isAllSelected = useMemo(() => 
    allCoinsIds.length > 0 && selectedCoins.size === allCoinsIds.length,
  [allCoinsIds, selectedCoins]);
  
  // 计算选中币的总价值
  const calculateSelectedTotalValue = useMemo(() => {
    let total = 0;
    
    smallValueCoins.forEach(({ coinType, objects }) => {
      const coinPrice = coinPrices[coinType] || 0;
      
      objects.forEach(coin => {
        if (selectedCoins.has(coin.id)) {
          const balance = parseFloat(formatBalance(coin.balance, coin.decimals));
          total += balance * coinPrice;
        }
      });
    });
    
    return total.toFixed(2);
  }, [smallValueCoins, selectedCoins, coinPrices]);
  
  return (
    <Dialog.Root isOpen={isOpen} onClose={onClose} size="xl">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>{t("coinManager.smallValueCoins")}</Dialog.Header>
          <Dialog.CloseTrigger />
          <Dialog.Body>
            <Stack gap={4} align="stretch">
              {/* 阈值设置区域 */}
              <Box>
                <Field.Root>
                  <Field.Label>{t("coinManager.valueThreshold")}: ${threshold.toFixed(2)}</Field.Label>
                </Field.Root>
                <Flex align="center">
                  <Slider.Root 
                    value={[threshold]} 
                    min={0.1} 
                    max={10} 
                    step={0.1} 
                    onChange={(val: number[]) => onThresholdChange(val[0])}
                    flex="1"
                    mr={4}
                  >
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range />
                      </Slider.Track>
                      <Slider.Thumbs />
                    </Slider.Control>
                  </Slider.Root>
                  
                  <Button size="sm" onClick={onApplyThreshold}>
                    {t("coinManager.apply")}
                  </Button>
                </Flex>
              </Box>
              
              {/* 加载状态 */}
              {loadingPrices && (
                <Center py={8}>
                  <Spinner size="md" />
                  <Text ml={2}>{t("coinManager.loadingPrices")}</Text>
                </Center>
              )}
              
              {/* 全选/取消全选 */}
              {!loadingPrices && smallValueCoins.length > 0 && (
                <Flex justify="space-between">
                  <Text fontWeight="medium">{t("coinManager.selectCoins")}</Text>
                  <Button 
                    size="xs" 
                    onClick={isAllSelected ? onUnselectAll : onSelectAll}
                    variant="outline"
                  >
                    {isAllSelected ? t("coinManager.unselectAll") : t("coinManager.selectAll")}
                  </Button>
                </Flex>
              )}
              
              {/* 小额币列表 */}
              {!loadingPrices && smallValueCoins.length > 0 ? (
                <Box maxH="400px" overflowY="auto">
                  {smallValueCoins.map(({ coinType, symbol, objects }) => (
                    <Box key={coinType} mb={3} p={2} borderWidth="1px" borderRadius="md">
                      <Flex justify="space-between" mb={2}>
                        <Text fontWeight="bold">{symbol || formatCoinType(coinType)}</Text>
                        <Text>
                          {t("coinManager.price")}: ${coinPrices[coinType]?.toFixed(4) || "N/A"}
                        </Text>
                      </Flex>
                      <Box>
                        {objects.map(coin => {
                          const balance = formatBalance(coin.balance, coin.decimals);
                          const valueUsd = parseFloat(balance) * (coinPrices[coinType] || 0);
                          
                          return (
                            <Checkbox.Root 
                              key={coin.id}
                              checked={selectedCoins.has(coin.id)}
                              onCheckedChange={() => onToggleCoinSelection(coin.id)}
                              mb={1}
                            >
                              <Checkbox.Control />
                              <Checkbox.Label>
                                <Flex justify="space-between" width="100%" pr={2}>
                                  <Text fontSize="sm">
                                    <ObjectIdDisplay objectId={coin.id} />
                                  </Text>
                                  <Text fontSize="sm">
                                    {balance} ≈ ${valueUsd.toFixed(2)}
                                  </Text>
                                </Flex>
                              </Checkbox.Label>
                              <Checkbox.HiddenInput />
                            </Checkbox.Root>
                          );
                        })}
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                !loadingPrices && <Text>{t("coinManager.noSmallValueCoins")}</Text>
              )}
              
              {/* 总价值 */}
              {selectedCoins.size > 0 && (
                <Stat.Root>
                  <Stat.Label>{t("coinManager.totalValue")}</Stat.Label>
                  <Stat.ValueText>${calculateSelectedTotalValue}</Stat.ValueText>
                  <Stat.HelpText>{selectedCoins.size} {t("coinManager.objectsSelected")}</Stat.HelpText>
                </Stat.Root>
              )}
            </Stack>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="ghost" mr={3} onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button 
              colorScheme="blue" 
              disabled={selectedCoins.size === 0 || loadingPrices}
              loading={isLoading}
              onClick={onConfirmClean}
            >
              {t("coinManager.confirmClean")}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};

export default SmallValueModal; 