// Interface for coin objects
export interface CoinObject {
  id: string;
  balance: string;
  type: string;
  decimals?: number;
}

// Interface for coin type summary
export interface CoinTypeSummary {
  type: string;
  symbol: string;
  totalBalance: string;
  objectCount: number;
  objects: CoinObject[];
  expanded: boolean;
  decimals: number;
  price?: string | null;   // Price in USD
  value?: number;          // Total value in USD
}

// Loading state interface
export interface LoadingState {
  fetchCoins: boolean;
  batchMerge: boolean;
  batchCleanZero: boolean;
  singleOperation: boolean;
  fetchPrices: boolean;    // New state for price loading
} 