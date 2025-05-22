import React from "react";
import { useTranslation } from "react-i18next";
import CopyableText from "./CopyableText";
import { formatCoinType } from "./utils";

// Coin type display component
export const CoinTypeDisplay: React.FC<{ coinType: string }> = ({ coinType }) => {
  const { t } = useTranslation();
  return (
    <CopyableText 
      text={coinType} 
      displayText={formatCoinType(coinType)} 
      label={t("coinManager.copy.coinType")} 
    />
  );
};

// Object ID display component
export const ObjectIdDisplay: React.FC<{ objectId: string }> = ({ objectId }) => {
  const { t } = useTranslation();
  const displayText = `${objectId.slice(0, 4)}...${objectId.slice(-4)}`;
  
  return (
    <CopyableText 
      text={objectId} 
      displayText={displayText} 
      label={t("coinManager.copy.objectId")} 
    />
  );
}; 