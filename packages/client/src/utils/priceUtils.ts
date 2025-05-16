import BN from 'bn.js';
import axios from 'axios';

/**
 * Get price between two coin types using direct API call
 * This is a fallback implementation when the SDK approach fails
 */
export async function getPriceDirectAPI(
    fromCoinType: string,
    fromCoinDecimal: number,
    toCoinType: string,
    toCoinDecimal: number
): Promise<string | null> {
    try {
        // Direct API call using axios instead of relying on the SDK's internal axios
        const endpoint = 'https://api-sui.cetus.zone/router_v2';
        const amount = new BN(10).pow(new BN(9));
        
        const url = `${endpoint}/find_routes?from=${fromCoinType}&target=${toCoinType}&amount=${amount.toString()}&by_amount_in=true`;

        const response = await axios.get(url);
        
        const routes = response.data?.data?.routes;
        
        if (!routes || routes.length === 0) {
            return null;
        }

        // Calculate weighted average price
        let totalAmountIn = new BN(0);
        let totalAmountOut = new BN(0);
        for (const route of routes) {
            const { amount_in, amount_out } = route;
            totalAmountIn = totalAmountIn.add(new BN(amount_in));
            totalAmountOut = totalAmountOut.add(new BN(amount_out));
        }

        // Calculate average price by dividing total output by total input
        const precisionMultiplier = new BN(10).pow(new BN(18)); // 10^18 for better precision
        const fromCoinDecimalBN = new BN(10).pow(new BN(fromCoinDecimal));
        const toCoinDecimalBN = new BN(10).pow(new BN(toCoinDecimal));

        const avgPriceBN = totalAmountOut
            .mul(precisionMultiplier)
            .mul(fromCoinDecimalBN)
            .div(toCoinDecimalBN)
            .div(totalAmountIn);

        const avgPriceStr = (Number(avgPriceBN) / Number(precisionMultiplier)).toFixed(12);

        return avgPriceStr;
    } catch (error) {
        console.error('Error getting price from direct API:', error);
        return null;
    }
}

/**
 * Convert coin value to USD based on the price
 * @param amount The amount of coin
 * @param price The price of coin in USD
 * @param decimals The decimals of coin
 * @returns The value in USD
 */
export function calculateValue(amount: string, price: string | null, decimals: number): number {
    if (!price) return 0;

    const amountNum = Number(amount) / Math.pow(10, decimals);
    const priceNum = Number(price);
    return amountNum * priceNum;
} 