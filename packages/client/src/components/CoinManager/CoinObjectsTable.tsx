import React from "react";
import { Box } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { CoinObject } from "./types";
import CoinObjectRow from "./CoinObjectRow";

interface CoinObjectsTableProps {
  objects: CoinObject[];
  selectedCoins: Set<string>;
  onToggleCoinSelection: (coinId: string) => void;
  onBurnSingle?: (coinId: string) => void;
  price?: string | null;
  decimals: number;
  isLoading?: boolean;
}

const CoinObjectsTable: React.FC<CoinObjectsTableProps> = ({
  objects,
  selectedCoins,
  onToggleCoinSelection,
  onBurnSingle,
  price,
  decimals,
  isLoading = false
}) => {
  const { t } = useTranslation();

  return (
    <Box p={0} bg="gray.50">
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", padding: "4px" }}>
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
            <th style={{ padding: "10px", width: "40px", fontWeight: "normal" }}></th>
            <th style={{ padding: "10px", textAlign: "left", fontWeight: "normal" }}>
              {t("coinManager.objectId")}
            </th>
            <th style={{ padding: "10px", textAlign: "right", fontWeight: "normal" }}>
              {t("coinManager.balance")}
            </th>
            <th style={{ padding: "10px", textAlign: "right", fontWeight: "normal" }}>
              {t("coinManager.value")}
            </th>
            <th style={{ padding: "10px", textAlign: "center", fontWeight: "normal" }}></th>
            <th style={{ padding: "10px", textAlign: "center", width: "20%", fontWeight: "normal" }}>
              {t("coinManager.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {objects.map((coin) => (
            <CoinObjectRow
              key={coin.id}
              coin={coin}
              isSelected={selectedCoins.has(coin.id)}
              onSelect={onToggleCoinSelection}
              onBurnSingle={onBurnSingle}
              price={price}
              isLoading={isLoading}
            />
          ))}
        </tbody>
      </table>
    </Box>
  );
};

export default CoinObjectsTable; 