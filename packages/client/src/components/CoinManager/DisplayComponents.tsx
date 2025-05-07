import React from "react";
import CopyableText from "./CopyableText";
import { formatCoinType } from "./utils";

// 币种类型显示组件
export const CoinTypeDisplay: React.FC<{ coinType: string }> = ({ coinType }) => {
  return (
    <CopyableText 
      text={coinType} 
      displayText={formatCoinType(coinType)} 
      label="复制币种类型" 
    />
  );
};

// 对象ID显示组件
export const ObjectIdDisplay: React.FC<{ objectId: string }> = ({ objectId }) => {
  const displayText = `${objectId.slice(0, 4)}...${objectId.slice(-4)}`;
  
  return (
    <CopyableText 
      text={objectId} 
      displayText={displayText} 
      label="复制对象ID" 
    />
  );
}; 