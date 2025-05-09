/**
 * Utility functions for generating blockchain explorer URLs
 */

/**
 * Generate a URL for viewing an address in Suivision explorer
 * @param address The address to view
 * @param network The network (mainnet, testnet, devnet, etc.)
 * @returns The complete URL to view the address in Suivision
 */
export const getSuivisionUrl = (address: string, network: string = "mainnet") => {
    return `https://${network}.suivision.xyz/account/${address}`;
};

/**
 * Generate a URL for viewing a transaction in Suivision explorer
 * @param digest The transaction digest
 * @param network The network (mainnet, testnet, devnet, etc.)
 * @returns The complete URL to view the transaction in Suivision
 */
export const getSuivisionTxUrl = (digest: string, network: string = "mainnet") => {
    return `https://${network}.suivision.xyz/txblock/${digest}`;
};

/**
 * Generate a URL for viewing an address in Suiscan explorer
 * @param address The address to view
 * @param network The network (mainnet, testnet, devnet, etc.)
 * @returns The complete URL to view the address in Suiscan
 */
export const getSuiscanUrl = (address: string, network: string = "mainnet") => {
    return `https://suiscan.xyz/${network}/account/${address}`;
};

/**
 * Generate a URL for viewing a transaction in Suiscan explorer
 * @param digest The transaction digest
 * @param network The network (mainnet, testnet, devnet, etc.)
 * @returns The complete URL to view the transaction in Suiscan
 */
export const getSuiscanTxUrl = (digest: string, network: string = "mainnet") => {
    return `https://suiscan.xyz/${network}/tx/${digest}`;
};

/**
 * Generate a URL for viewing an address in Sui explorer
 * @param address The address to view
 * @param network The network (mainnet, testnet, devnet, etc.)
 * @returns The complete URL to view the address in Sui explorer
 */
export const getSuiExplorerUrl = (address: string, network: string = "mainnet") => {
    return `https://explorer.sui.io/address/${address}?network=${network}`;
};

/**
 * Generate a URL for viewing a transaction in Sui explorer
 * @param digest The transaction digest
 * @param network The network (mainnet, testnet, devnet, etc.)
 * @returns The complete URL to view the transaction in Sui explorer
 */
export const getSuiExplorerTxUrl = (digest: string, network: string = "mainnet") => {
    return `https://explorer.sui.io/txblock/${digest}?network=${network}`;
};

/**
 * Generate a URL for viewing an address in the default explorer (Suivision)
 * @param address The address to view
 * @param network The network (mainnet, testnet, devnet, etc.)
 * @returns The complete URL to view the address in the default explorer
 */
export const getExplorerUrl = (address: string, network: string = "mainnet") => {
    return getSuivisionUrl(address, network);
};

/**
 * Generate a URL for viewing a transaction in the default explorer (Suivision)
 * @param digest The transaction digest
 * @param network The network (mainnet, testnet, devnet, etc.)
 * @returns The complete URL to view the transaction in the default explorer
 */
export const getExplorerTxUrl = (digest: string, network: string = "mainnet") => {
    return getSuivisionTxUrl(digest, network);
}; 