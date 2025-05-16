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
  onBurnCoin: (type: string) => void;
  onBurnSingleCoin?: (coinId: string) => void;
  onShowBurnDialog?: (type: string) => void;
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
  onBurnCoin,
  onBurnSingleCoin,
  onShowBurnDialog
}) => {
  const { t } = useTranslation();

  return (
    <Box overflowX="auto">
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
            <th style={{ padding: "10px", textAlign: "center", width: "40px", fontWeight: "normal" }}>
              {/* 展开/折叠列 */}
            </th>
            <th style={{ padding: "10px", textAlign: "left", width: "30%", fontWeight: "normal" }}>
              {t("coinManager.name")}
            </th>
            <th style={{ padding: "10px", textAlign: "right", width: "20%", fontWeight: "normal" }}>
              {t("coinManager.totalBalance")}
            </th>
            <th style={{ padding: "10px", textAlign: "right", width: "15%", fontWeight: "normal" }}>
              {t("coinManager.value")}
            </th>
            <th style={{ padding: "10px", textAlign: "center", width: "15%", fontWeight: "normal" }}>
              {t("coinManager.objectCount")}
            </th>
            <th style={{ padding: "10px", textAlign: "center", width: "20%", fontWeight: "normal" }}>
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
                onBurn={onShowBurnDialog || onBurnCoin}
              />

              {/* Expanded coin details */}
              {summary.expanded && (
                <tr>
                  <td colSpan={6} style={{ padding: 0, border: "none" }}>
                    <CoinObjectsTable
                      objects={summary.objects}
                      selectedCoins={selectedCoins}
                      onToggleCoinSelection={onToggleCoinSelection}
                      onBurnSingle={onBurnSingleCoin}
                      price={summary.price}
                      decimals={summary.decimals}
                      isLoading={isLoading}
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