import React from "react";
import { Box } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { CoinObject } from "./types";
import CoinObjectRow from "./CoinObjectRow";

interface CoinObjectsTableProps {
  objects: CoinObject[];
  selectedCoins: Set<string>;
  onToggleCoinSelection: (coinId: string) => void;
  price?: string | null;
  decimals: number;
}

const CoinObjectsTable: React.FC<CoinObjectsTableProps> = ({
  objects,
  selectedCoins,
  onToggleCoinSelection,
  price,
  decimals
}) => {
  const { t } = useTranslation();

  return (
    <Box p={4} bg="gray.50">
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "40px" }} />
          <col style={{ width: "30%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ padding: "10px", width: "40px" }}></th>
            <th style={{ padding: "10px", textAlign: "left" }}>
              {t("coinManager.objectId")}
            </th>
            <th style={{ padding: "10px", textAlign: "right" }}>
              {t("coinManager.balance")}
            </th>
            <th style={{ padding: "10px", textAlign: "right" }}>
              {t("coinManager.value")}
            </th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {objects.map((coin) => (
            <CoinObjectRow
              key={coin.id}
              coin={coin}
              isSelected={selectedCoins.has(coin.id)}
              onSelect={onToggleCoinSelection}
              price={price}
            />
          ))}
        </tbody>
      </table>
    </Box>
  );
};

export default CoinObjectsTable; 