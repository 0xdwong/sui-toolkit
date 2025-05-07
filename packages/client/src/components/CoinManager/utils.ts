import { SUI_TYPE_ARG } from "@mysten/sui/utils";

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