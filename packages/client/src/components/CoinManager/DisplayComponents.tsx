import React from "react";
import { useTranslation } from "react-i18next";
import CopyableText from "./CopyableText";
import { formatCoinType } from "./utils";

// 币种类型显示组件
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

// 对象ID显示组件
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