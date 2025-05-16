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
}

const CoinObjectRow: React.FC<CoinObjectRowProps> = ({ 
  coin, 
  isSelected, 
  onSelect, 
  onBurnSingle,
  price,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const { id, balance, decimals = 9 } = coin;
  const isZeroBalance = parseInt(balance, 10) === 0;
  
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
        <ObjectIdDisplay objectId={id} />
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