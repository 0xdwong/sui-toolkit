import React from "react";
import { Badge, Button, Flex, Box, Text } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { CoinTypeSummary } from "./types";
import { CoinTypeDisplay } from "./DisplayComponents";
import { formatBalance } from "./utils";

interface CoinTypeSummaryRowProps {
  summary: CoinTypeSummary;
  isSelected: boolean;
  isLoading: boolean;
  onToggleExpand: (type: string) => void;
  onMerge: (type: string) => void;
  onCleanZero: (type: string) => void;
  onBurn: (type: string) => void;
}

const CoinTypeSummaryRow: React.FC<CoinTypeSummaryRowProps> = ({
  summary,
  isSelected,
  isLoading,
  onToggleExpand,
  onMerge,
  onCleanZero,
  onBurn
}) => {
  const { t } = useTranslation();
  const { type, totalBalance, objectCount, expanded, decimals, objects, symbol, price, value, iconUrl } = summary;
  
  const hasZeroBalanceCoins = objects.some(coin => parseInt(coin.balance, 10) === 0);
  
  // Format the value display with USD format
  const formattedValue = value !== undefined && value !== null 
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
    : '-';

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
          <Flex alignItems="center" gap={2}>
            {iconUrl ? (
              <Box position="relative" boxSize="24px">
                <img 
                  src={iconUrl} 
                  alt={symbol || ""}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    // Hide the image on error
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {/* This will show when image fails to load */}
                <Box 
                  position="absolute" 
                  top="0" 
                  left="0" 
                  boxSize="24px" 
                  borderRadius="full" 
                  bg="gray.200" 
                  zIndex="-1"
                />
              </Box>
            ) : (
              <Box boxSize="24px" bg="gray.200" borderRadius="full" />
            )}
            <Text fontWeight="bold" fontSize="1em">{symbol || "Unknown"}</Text>
          </Flex>
          <Flex alignItems="center">
            <CoinTypeDisplay coinType={type} />
          </Flex>
        </Flex>
      </td>
      <td style={{ padding: "10px", textAlign: "right" }}>
        {formatBalance(totalBalance, decimals)}
      </td>
      <td style={{ padding: "10px", textAlign: "right" }}>
        <Text>{formattedValue}</Text>
        {price && (
          <Text fontSize="xs" color="gray.500">
            (${Number(price).toFixed(6)})
          </Text>
        )}
      </td>
      <td style={{ padding: "10px", textAlign: "center" }}>
        <Badge colorPalette={objectCount > 1 ? "blue" : "green"} fontSize="0.9em">
          {objectCount}
        </Badge>
      </td>
      <td style={{ padding: "10px", textAlign: "center" }}>
        <Flex justify="center" gap={2}>
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
          <Button
            size="sm"
            colorPalette="orange"
            variant="solid"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onBurn(type);
            }}
            loading={isLoading && isSelected}
          >
            {t("coinManager.burn")}
          </Button>
        </Flex>
      </td>
    </tr>
  );
};

export default CoinTypeSummaryRow; 