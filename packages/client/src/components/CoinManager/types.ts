// Interface for coin objects
export interface CoinObject {
  id: string;
  balance: string;
  type: string;
  decimals?: number;
  iconUrl?: string | null;  // Add icon URL field
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
  value?: number | null;          // Total value in USD
  iconUrl?: string | null; // Coin icon URL
}

// Loading state interface
export interface LoadingState {
  fetchCoins: boolean;
  batchMerge: boolean;
  batchCleanZero: boolean;
  batchBurn: boolean;      // New state for batch burn operation
  singleOperation: boolean;
  fetchPrices: boolean;    // New state for price loading
  networkSync: boolean;    // Network synchronization state
} 