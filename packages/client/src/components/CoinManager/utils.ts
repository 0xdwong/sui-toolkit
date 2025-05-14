import { SUI_TYPE_ARG } from "@mysten/sui/utils";
import { CoinObject, CoinTypeSummary } from "./types";
import BN from 'bn.js';
import { AggregatorClient } from '@cetusprotocol/aggregator-sdk';

// Helper to format coin type for display
export const formatCoinType = (coinType: string): string => {
  if (coinType === SUI_TYPE_ARG) return "SUI";

  // Handle structured coin types (0x...::module::NAME)
  const parts = coinType.split("::");
  if (parts.length >= 2) {
    const address = parts[0];
    const name = parts[parts.length - 1];

    // Format: 0xABC...XYZ::NAME
    if (address.startsWith("0x") && address.length > 8) {
      return `${address.substring(0, 4)}...${address.substring(address.length - 4)}::${name}`;
    }
  }

  // If not a structured coin type or SUI, truncate if too long
  if (coinType.length > 20) {
    return `${coinType.substring(0, 10)}...${coinType.substring(coinType.length - 10)}`;
  }

  return coinType;
};

// Helper to format balance for display
export const formatBalance = (balance: string, decimals: number = 9): string => {
  try {
    const balanceBigInt = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    
    if (balanceBigInt === BigInt(0)) return "0";
    
    // Calculate the integer and decimal parts
    const integerPart = (balanceBigInt / divisor).toString();
    const remainder = balanceBigInt % divisor;
    
    if (remainder === BigInt(0)) return integerPart;
    
    // Format the decimal part with proper padding
    let decimalPart = remainder.toString().padStart(decimals, '0');
    
    // Remove trailing zeros
    decimalPart = decimalPart.replace(/0+$/, '');
    
    if (decimalPart.length > 0) {
      return `${integerPart}.${decimalPart}`;
    }
    
    return integerPart;
  } catch (error) {
    console.error("Error formatting balance:", error);
    return "0";
  }
};

// 常用稳定币的币种类型和小数位
const STABLE_COINS: Record<string, { coinType: string, decimals: number }> = {
  "USDC": {
    coinType: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    decimals: 6
  },
  "USDT": {
    coinType: "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
    decimals: 6
  }
};

// 初始化聚合器客户端
const initAggregatorClient = (): AggregatorClient => {
  const client = new AggregatorClient({
    endpoint: 'https://api-sui.cetus.zone/router_v2/find_routes',
  });
  return client;
};

/**
 * 使用 Cetus Aggregator SDK 获取币价格
 * 直接参考 aggregator.js 中的 getPrice 函数实现
 */
const getPriceFromCetus = async (
  fromCoinType: string,
  fromCoinDecimal: number,
  toCoinType: string,
  toCoinDecimal: number
): Promise<string | null> => {
  // 参数验证
  if (fromCoinDecimal < 0 || toCoinDecimal < 0) {
    throw new Error('decimal must be greater than or equal to 0');
  }

  const client = initAggregatorClient();

  try {
    const amount = new BN(10).pow(new BN(9));

    const routers = await client.findRouters({
      from: fromCoinType,
      target: toCoinType,
      amount,
      byAmountIn: true, // true 表示固定输入金额，false 表示固定输出金额
    });

    if (!routers?.routes || routers.routes.length === 0) {
      console.log('No routes found');
      return null;
    }

    // 计算加权平均价格
    let totalAmountIn = new BN(0);
    let totalAmountOut = new BN(0);

    for (const route of routers.routes) {
      const { amountIn, amountOut } = route;
      totalAmountIn = totalAmountIn.add(new BN(amountIn));
      totalAmountOut = totalAmountOut.add(new BN(amountOut));
    }

    // 计算价格 - 总产出除以总输入
    const precisionMultiplier = new BN(10).pow(new BN(18)); // 10^18 用于更好的精度
    const fromCoinDecimalBN = new BN(10).pow(new BN(fromCoinDecimal));
    const toCoinDecimalBN = new BN(10).pow(new BN(toCoinDecimal));

    const avgPriceBN = totalAmountOut
      .mul(precisionMultiplier)
      .mul(fromCoinDecimalBN)
      .div(toCoinDecimalBN)
      .div(totalAmountIn);

    const avgPriceFloat = Number(avgPriceBN.toString()) / Number(precisionMultiplier.toString());
    const avgPriceStr = avgPriceFloat.toFixed(12);

    return avgPriceStr;
  } catch (error) {
    console.error('Error getting price:', error);
    return null;
  }
};

/**
 * 获取币价格
 * @param coinTypeSummaries 币种摘要数组，包含币种类型和小数位信息
 * @returns 价格映射对象 {coinType: priceInUSD}
 */
export const fetchCoinPrices = async (coinTypeSummaries: CoinTypeSummary[]): Promise<Record<string, number>> => {
  try {
    const prices: Record<string, number> = {};
    
    // 选择 USDC 作为价格参考币种
    const usdcInfo = STABLE_COINS["USDC"];
    
    // 如果没有 USDC 信息，则无法获取价格
    if (!usdcInfo) {
      console.warn("No USDC reference price available");
      return prices;
    }
    
    console.log('Fetching prices using Cetus Aggregator...');
    
    // 为每种币获取与 USDC 的兑换价格
    const fetchPromises = coinTypeSummaries.map(async (summary) => {
      const coinType = summary.type;
      try {
        // 对于 USDC 本身，价格就是 1 美元
        if (coinType === usdcInfo.coinType) {
          prices[coinType] = 1.0;
          return;
        }
        
        // 使用 CoinTypeSummary 中的 decimals 信息
        const coinDecimal = summary.decimals;
        
        // 获取该币种与 USDC 的兑换价格
        const priceStr = await getPriceFromCetus(
          coinType,         // fromCoinType
          coinDecimal,      // fromCoinDecimal
          usdcInfo.coinType,// toCoinType
          usdcInfo.decimals // toCoinDecimal
        );
        
        if (priceStr) {
          const price = parseFloat(priceStr);
          prices[coinType] = price;
          console.log(`Price for ${summary.symbol || formatCoinType(coinType)}: $${price}`);
        }
      } catch (err) {
        console.error(`Failed to get price for ${coinType}:`, err);
      }
    });
    
    await Promise.all(fetchPromises);
    
    return prices;
  } catch (error) {
    console.error('Error fetching coin prices:', error);
    return {};
  }
};

/**
 * 判断一个币是否为小额币
 * @param coin 币对象
 * @param decimals 精度
 * @param coinPrice 币价格
 * @param threshold 阈值（美元）
 * @returns boolean
 */
export const isSmallValueCoin = (
  coin: CoinObject, 
  decimals: number, 
  coinPrice: number, 
  threshold: number
): boolean => {
  if (coinPrice <= 0) return false;
  
  const balance = parseFloat(formatBalance(coin.balance, coin.decimals || decimals));
  const valueUsd = balance * coinPrice;
  
  return valueUsd > 0 && valueUsd < threshold;
}; 