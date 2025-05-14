import React, { useMemo } from "react";
import { Badge, Button, Flex, Box, Text } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { CoinTypeSummary } from "./types";
import { CoinTypeDisplay } from "./DisplayComponents";
import { formatBalance, isSmallValueCoin } from "./utils";

interface CoinTypeSummaryRowProps {
  summary: CoinTypeSummary;
  isSelected: boolean;
  isLoading: boolean;
  onToggleExpand: (type: string) => void;
  onMerge: (type: string) => void;
  onCleanZero: (type: string) => void;
  onCleanSmallValue: (type: string) => void;
  coinPrices: Record<string, number>;
  valueThreshold: number;
}

const CoinTypeSummaryRow: React.FC<CoinTypeSummaryRowProps> = ({
  summary,
  isSelected,
  isLoading,
  onToggleExpand,
  onMerge,
  onCleanZero,
  onCleanSmallValue,
  coinPrices,
  valueThreshold
}) => {
  const { t } = useTranslation();
  const { type, totalBalance, objectCount, expanded, decimals, objects, symbol } = summary;
  
  const hasZeroBalanceCoins = objects.some(coin => parseInt(coin.balance, 10) === 0);
  
  const hasSmallValueCoins = useMemo(() => {
    const coinPrice = coinPrices[type] || 0;
    if (coinPrice <= 0) return false;
    
    return objects.some(coin => 
      isSmallValueCoin(coin, decimals, coinPrice, valueThreshold)
    );
  }, [objects, type, decimals, coinPrices, valueThreshold]);

  return (
    <tr style={{ backgroundColor: isSelected ? "rgba(66, 153, 225, 0.1)" : "white" }}>
      <td style={{ padding: "10px", textAlign: "center" }}>
        <Box
          as="button"
          onClick={() => onToggleExpand(type)}
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
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </Box>
      </td>
      <td style={{ padding: "10px", fontFamily: "monospace", fontSize: "0.9em", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis" }}>
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Text fontWeight="bold" fontSize="1em">{symbol || "Unknown"}</Text>
          <Flex alignItems="center">
            <CoinTypeDisplay coinType={type} />
          </Flex>
        </Flex>
      </td>
      <td style={{ padding: "10px", textAlign: "right" }}>
        {formatBalance(totalBalance, decimals)}
      </td>
      <td style={{ padding: "10px", textAlign: "center" }}>
        <Badge colorPalette={objectCount > 1 ? "blue" : "green"} fontSize="0.9em">
          {objectCount}
        </Badge>
      </td>
      <td style={{ padding: "10px" }}>
        <Flex gap={2} flexWrap="wrap">
          <Button
            size="sm"
            colorPalette="blue"
            variant="solid"
            disabled={isLoading || objectCount < 2}
            onClick={(e) => {
              e.stopPropagation();
              onMerge(type);
            }}
            loading={isLoading && isSelected}
          >
            {t("coinManager.mergeCoin")}
          </Button>
          
          {hasZeroBalanceCoins && (
            <Button
              size="sm"
              colorPalette="red"
              variant="solid"
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                onCleanZero(type);
              }}
              loading={isLoading && isSelected}
            >
              {t("coinManager.cleanZeroCoins")}
            </Button>
          )}
          
          {hasSmallValueCoins && (
            <Button
              size="sm"
              colorPalette="orange"
              variant="solid"
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                onCleanSmallValue(type);
              }}
              loading={isLoading && isSelected}
            >
              {t("coinManager.cleanSmallValue")}
            </Button>
          )}
        </Flex>
      </td>
    </tr>
  );
};

export default CoinTypeSummaryRow; 