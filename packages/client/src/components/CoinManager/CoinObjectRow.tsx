import React from "react";
import { Box } from "@chakra-ui/react";
import { CoinObject } from "./types";
import { ObjectIdDisplay } from "./DisplayComponents";
import { formatBalance } from "./utils";
import { calculateValue } from "../../utils/priceUtils";

interface CoinObjectRowProps {
  coin: CoinObject;
  isSelected: boolean;
  onSelect: (coinId: string) => void;
  price?: string | null;
}

const CoinObjectRow: React.FC<CoinObjectRowProps> = ({ coin, isSelected, onSelect, price }) => {
  const { id, balance, decimals = 9 } = coin;
  const isZeroBalance = parseInt(balance, 10) === 0;
  
  // Calculate coin value if price is available
  const value = price ? calculateValue(balance, price, decimals) : 0;

  return (
    <tr
      onClick={() => onSelect(id)}
      style={{
        cursor: 'pointer',
        backgroundColor: isSelected ? "rgba(66, 153, 225, 0.1)" : ""
      }}
    >
      <td style={{ padding: "10px", width: "40px" }}></td>
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
      <td></td>
      <td></td>
    </tr>
  );
};

export default CoinObjectRow; 