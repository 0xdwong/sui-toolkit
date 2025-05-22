import React from "react";
import { Box, Button, Flex } from "@chakra-ui/react";
import { CoinObject } from "./types";
import { ObjectIdDisplay } from "./DisplayComponents";
import { formatBalance } from "./utils";
import { calculateValue } from "../../utils/priceUtils";
import { useTranslation } from "react-i18next";

interface CoinObjectRowProps {
  coin: CoinObject;
  isSelected: boolean;
  onSelect: (coinId: string) => void;
  onBurnSingle?: (coinId: string) => void;
  price?: string | null;
  isLoading?: boolean;
  symbol?: string;
  iconUrl?: string | null;
}

const CoinObjectRow: React.FC<CoinObjectRowProps> = ({ 
  coin, 
  isSelected, 
  onSelect, 
  onBurnSingle,
  price,
  isLoading = false,
  symbol,
  iconUrl
}) => {
  const { t } = useTranslation();
  const { id, balance, decimals = 9 } = coin;
  const isZeroBalance = parseInt(balance, 10) === 0;
  
  // 使用代币自身的图标URL，如果提供的话
  const coinIconUrl = coin.iconUrl || iconUrl;
  
  // Calculate coin value if price is available
  const value = price ? calculateValue(balance, price, decimals) : 0;

  const handleRowClick = (e: React.MouseEvent) => {
    // Only select if not clicking on the burn button
    if ((e.target as HTMLElement).closest('button') === null) {
      onSelect(id);
    }
  };

  return (
    <tr
      onClick={handleRowClick}
      style={{
        cursor: 'pointer',
        backgroundColor: isSelected ? "rgba(66, 153, 225, 0.1)" : ""
      }}
    >
      <td style={{ padding: "10px", textAlign: "center", width: "40px" }}></td>
      <td style={{ padding: "10px", fontFamily: "monospace", fontSize: "0.9em" }}>
        <Flex alignItems="center" gap={2}>
          {coinIconUrl ? (
            <Box position="relative" boxSize="16px">
              <img 
                src={coinIconUrl} 
                alt={symbol || ""}
                style={{
                  width: '16px',
                  height: '16px',
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
                boxSize="16px" 
                borderRadius="full" 
                bg="gray.200" 
                zIndex="-1"
              />
            </Box>
          ) : (
            <Box boxSize="16px" bg="gray.200" borderRadius="full" display="inline-block" />
          )}
          <ObjectIdDisplay objectId={id} />
        </Flex>
      </td>
      <td style={{ padding: "10px", textAlign: "right" }}>
        {isZeroBalance ? (
          <Box as="span" px={2} py={1} bg="purple.100" color="purple.800" borderRadius="md" fontSize="0.8em">
            0
          </Box>
        ) : (
          formatBalance(balance, decimals)
        )}
      </td>
      <td style={{ padding: "10px", textAlign: "right" }}>
        {price ? (
          isZeroBalance ? 
            "0" : 
            `$${value.toFixed(4)}`
        ) : (
          "-"
        )}
      </td>
      <td style={{ padding: "10px", textAlign: "center" }}></td>
      <td style={{ padding: "10px", textAlign: "center" }}>
        {onBurnSingle && (
          <Flex justify="center" gap={2}>
            <Button
              size="sm"
              colorPalette="orange"
              variant="solid"
              onClick={(e) => {
                e.stopPropagation();
                onBurnSingle(id);
              }}
              loading={isLoading}
              loadingText={t("coinManager.loading")}
              title={t("coinManager.burnSingle")}
            >
              {t("coinManager.burn")}
            </Button>
          </Flex>
        )}
      </td>
    </tr>
  );
};

export default CoinObjectRow; 