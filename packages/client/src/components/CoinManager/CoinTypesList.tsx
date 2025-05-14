import React from "react";
import { Box } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { CoinTypeSummary } from "./types";
import CoinTypeSummaryRow from "./CoinTypeSummaryRow";
import CoinObjectsTable from "./CoinObjectsTable";

interface CoinTypesListProps {
  coinTypeSummaries: CoinTypeSummary[];
  selectedCoinType: string | null;
  selectedCoins: Set<string>;
  isLoading: boolean;
  onToggleCoinTypeExpansion: (type: string) => void;
  onToggleCoinSelection: (coinId: string) => void;
  onMergeCoin: (type: string) => void;
  onCleanZeroCoins: (type: string) => void;
  onCleanSmallValueCoins: (type: string) => void;
  coinPrices: Record<string, number>;
  valueThreshold: number;
}

const CoinTypesList: React.FC<CoinTypesListProps> = ({
  coinTypeSummaries,
  selectedCoinType,
  selectedCoins,
  isLoading,
  onToggleCoinTypeExpansion,
  onToggleCoinSelection,
  onMergeCoin,
  onCleanZeroCoins,
  onCleanSmallValueCoins,
  coinPrices,
  valueThreshold
}) => {
  const { t } = useTranslation();

  return (
    <Box overflowX="auto">
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "40px" }} />
          <col style={{ width: "40%" }} />
          <col style={{ width: "25%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ padding: "10px", textAlign: "left", width: "40px" }}>
              {/* 展开/折叠列 */}
            </th>
            <th style={{ padding: "10px", textAlign: "left", width: "40%" }}>
              {t("coinManager.name")}
            </th>
            <th style={{ padding: "10px", textAlign: "right", width: "25%" }}>
              {t("coinManager.totalBalance")}
            </th>
            <th style={{ padding: "10px", textAlign: "left", width: "15%" }}>
              {t("coinManager.objectCount")}
            </th>
            <th style={{ padding: "10px", textAlign: "left", width: "20%" }}>
              {t("coinManager.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {coinTypeSummaries.map((summary) => (
            <React.Fragment key={summary.type}>
              <CoinTypeSummaryRow
                summary={summary}
                isSelected={selectedCoinType === summary.type}
                isLoading={isLoading}
                onToggleExpand={onToggleCoinTypeExpansion}
                onMerge={onMergeCoin}
                onCleanZero={onCleanZeroCoins}
                onCleanSmallValue={onCleanSmallValueCoins}
                coinPrices={coinPrices}
                valueThreshold={valueThreshold}
              />

              {/* Expanded coin details */}
              {summary.expanded && (
                <tr>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <CoinObjectsTable
                      objects={summary.objects}
                      selectedCoins={selectedCoins}
                      onToggleCoinSelection={onToggleCoinSelection}
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </Box>
  );
};

export default CoinTypesList; 