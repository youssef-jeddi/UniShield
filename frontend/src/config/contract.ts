import { ethers } from 'ethers';

export const POOL_MANAGER_ADDRESS = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543"; // Uniswap v4 PoolManager on Sepolia
export const POOL_MODIFY_ROUTER_ADDRESS = "0x0c478023803a644c94c4ce1c1e7b9a087e411b0a"; // PoolModifyLiquidityTest on Sepolia
export const CLEANPOOL_HOOK_ADDRESS = "0xe163dA4E5EAF77c9bBe5b5ebd808B0292C034880"; // UniShield Hook

// Token addresses for your pool (Sepolia)
export const TOKEN_A_ADDRESS = "0x7ca9D7C1932442029f53Db9acA0eb43C94279Be8"; // cETH
export const TOKEN_B_ADDRESS = "0xfff39C5BCEf87623De00630bD9DB7bf5Be981546"; // cUSD

// Pool parameters
export const POOL_FEE = 500; // 0.05%
export const TICK_SPACING = 10;

// ABIs
export const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
];

// PoolModifyLiquidityTest ABI - simpler router for hackathon demos
// See: https://github.com/Uniswap/v4-core/blob/main/test/PoolModifyLiquidityTest.sol
export const POOL_MODIFY_ROUTER_ABI = [
    "function modifyLiquidity(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) payable returns (int256 delta0, int256 delta1)",
];

// PoolManager ABI for reading pool state
export const POOL_MANAGER_ABI = [
    "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
];

// Helper to compute pool ID from pool key
export function computePoolId(currency0: string, currency1: string, fee: number, tickSpacing: number, hooks: string): string {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abiCoder.encode(
        ['address', 'address', 'uint24', 'int24', 'address'],
        [currency0, currency1, fee, tickSpacing, hooks]
    );
    return ethers.keccak256(encoded);
}

// Math helpers for Uniswap v4 liquidity calculations
const Q96 = BigInt(2) ** BigInt(96);

// Convert tick to sqrtPriceX96
// Using log/exp for precision with large negative ticks
export function tickToSqrtPriceX96(tick: number): bigint {
    // sqrtPriceX96 = sqrt(1.0001^tick) * 2^96 = 1.0001^(tick/2) * 2^96
    // Using log: ln(sqrtPriceX96) = (tick/2) * ln(1.0001) + 96 * ln(2)
    const LOG_1_0001 = Math.log(1.0001); // ≈ 0.00009999500033
    const LOG_2 = Math.log(2);

    const logSqrtPriceX96 = (tick / 2) * LOG_1_0001 + 96 * LOG_2;
    const sqrtPriceX96 = Math.exp(logSqrtPriceX96);

    const result = BigInt(Math.floor(sqrtPriceX96));
    console.log(`tickToSqrtPriceX96(${tick}): logResult=${logSqrtPriceX96.toFixed(4)}, sqrtPriceX96=${result}`);
    return result;
}

// Calculate liquidity from token amounts
// Based on Uniswap v3 math:
// L from amount0: L = amount0 * sqrtPriceX96 * sqrtRatioB / (Q96 * (sqrtRatioB - sqrtPriceX96))
// L from amount1: L = amount1 * Q96 / (sqrtPriceX96 - sqrtRatioA)
export function calculateLiquidityFromAmounts(
    sqrtPriceX96: bigint,
    tickLower: number,
    tickUpper: number,
    amount0: bigint,  // token0 amount (smaller token address)
    amount1: bigint   // token1 amount (larger token address)
): bigint {
    const sqrtRatioA = tickToSqrtPriceX96(tickLower);
    const sqrtRatioB = tickToSqrtPriceX96(tickUpper);

    console.log("calculateLiquidityFromAmounts:");
    console.log("  sqrtPriceX96:", sqrtPriceX96.toString());
    console.log("  sqrtRatioA:", sqrtRatioA.toString());
    console.log("  sqrtRatioB:", sqrtRatioB.toString());

    // If current price is below range, use only amount0
    if (sqrtPriceX96 <= sqrtRatioA) {
        console.log("  Price below range, using amount0 only");
        // L = amount0 * sqrtRatioA * sqrtRatioB / (Q96 * (sqrtRatioB - sqrtRatioA))
        const numerator = amount0 * sqrtRatioA * sqrtRatioB;
        const denominator = Q96 * (sqrtRatioB - sqrtRatioA);
        return numerator / denominator;
    }
    // If current price is above range, use only amount1
    else if (sqrtPriceX96 >= sqrtRatioB) {
        console.log("  Price above range, using amount1 only");
        // L = amount1 * Q96 / (sqrtRatioB - sqrtRatioA)
        return (amount1 * Q96) / (sqrtRatioB - sqrtRatioA);
    }
    // Current price is within range - use minimum of both calculations
    else {
        console.log("  Price in range, using min of both");
        // L from amount0: L = amount0 * sqrtPriceX96 * sqrtRatioB / (Q96 * (sqrtRatioB - sqrtPriceX96))
        const liquidity0 = (amount0 * sqrtPriceX96 * sqrtRatioB) / (Q96 * (sqrtRatioB - sqrtPriceX96));
        // L from amount1: L = amount1 * Q96 / (sqrtPriceX96 - sqrtRatioA)
        const liquidity1 = (amount1 * Q96) / (sqrtPriceX96 - sqrtRatioA);
        console.log("  liquidity0:", liquidity0.toString());
        console.log("  liquidity1:", liquidity1.toString());
        // Return the minimum to ensure we don't request more than provided
        return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
    }
}

// Helper to get sorted token addresses (Uniswap v4 requires currency0 < currency1)
export function getSortedTokens(): { currency0: string; currency1: string } {
    const tokenA = TOKEN_A_ADDRESS.toLowerCase();
    const tokenB = TOKEN_B_ADDRESS.toLowerCase();
    if (tokenA < tokenB) {
        return { currency0: TOKEN_A_ADDRESS, currency1: TOKEN_B_ADDRESS };
    } else {
        return { currency0: TOKEN_B_ADDRESS, currency1: TOKEN_A_ADDRESS };
    }
}

// Calculate required amount1 given amount0 for a position in range
// Based on Uniswap v3 math:
// x = L * Q96 * (sqrtRatioB - sqrtPriceX96) / (sqrtPriceX96 * sqrtRatioB)
// y = L * (sqrtPriceX96 - sqrtRatioA) / Q96
// Therefore: y = x * sqrtPriceX96 * sqrtRatioB * (sqrtPriceX96 - sqrtRatioA) / (Q96^2 * (sqrtRatioB - sqrtPriceX96))
export function calculateAmount1FromAmount0(
    sqrtPriceX96: bigint,
    tickLower: number,
    tickUpper: number,
    amount0: bigint
): bigint {
    const sqrtRatioA = tickToSqrtPriceX96(tickLower);
    const sqrtRatioB = tickToSqrtPriceX96(tickUpper);

    console.log("calculateAmount1FromAmount0:");
    console.log("  sqrtPriceX96:", sqrtPriceX96.toString());
    console.log("  sqrtRatioA (tickLower):", sqrtRatioA.toString());
    console.log("  sqrtRatioB (tickUpper):", sqrtRatioB.toString());
    console.log("  Price in range?", sqrtPriceX96 > sqrtRatioA && sqrtPriceX96 < sqrtRatioB);

    // If price is below range, only token0 is needed
    if (sqrtPriceX96 <= sqrtRatioA) {
        console.log("  Price is BELOW range, returning 0");
        return BigInt(0);
    }
    // If price is above range, only token1 is needed (can't calculate from amount0)
    if (sqrtPriceX96 >= sqrtRatioB) {
        console.log("  Price is ABOVE range, returning 0");
        return BigInt(0);
    }

    // Price is in range - calculate amount1 from amount0
    // amount1 = amount0 * sqrtPriceX96 * sqrtRatioB * (sqrtPriceX96 - sqrtRatioA) / (Q96^2 * (sqrtRatioB - sqrtPriceX96))
    const numerator = amount0 * sqrtPriceX96 * sqrtRatioB * (sqrtPriceX96 - sqrtRatioA);
    const denominator = Q96 * Q96 * (sqrtRatioB - sqrtPriceX96);

    const result = numerator / denominator;
    console.log("  Calculated amount1:", result.toString());
    return result;
}

// Calculate required amount0 given amount1 for a position in range
// Based on Uniswap v3 math:
// x = L * Q96 * (sqrtRatioB - sqrtPriceX96) / (sqrtPriceX96 * sqrtRatioB)
// y = L * (sqrtPriceX96 - sqrtRatioA) / Q96
// Therefore: x = y * Q96^2 * (sqrtRatioB - sqrtPriceX96) / ((sqrtPriceX96 - sqrtRatioA) * sqrtPriceX96 * sqrtRatioB)
export function calculateAmount0FromAmount1(
    sqrtPriceX96: bigint,
    tickLower: number,
    tickUpper: number,
    amount1: bigint
): bigint {
    const sqrtRatioA = tickToSqrtPriceX96(tickLower);
    const sqrtRatioB = tickToSqrtPriceX96(tickUpper);

    console.log("calculateAmount0FromAmount1:");
    console.log("  sqrtPriceX96:", sqrtPriceX96.toString());
    console.log("  sqrtRatioA (tickLower):", sqrtRatioA.toString());
    console.log("  sqrtRatioB (tickUpper):", sqrtRatioB.toString());
    console.log("  Price in range?", sqrtPriceX96 > sqrtRatioA && sqrtPriceX96 < sqrtRatioB);

    // If price is below range, only token0 is needed (can't calculate from amount1)
    if (sqrtPriceX96 <= sqrtRatioA) {
        console.log("  Price is BELOW range, returning 0");
        return BigInt(0);
    }
    // If price is above range, only token1 is needed
    if (sqrtPriceX96 >= sqrtRatioB) {
        console.log("  Price is ABOVE range, returning 0");
        return BigInt(0);
    }

    // Price is in range - calculate amount0 from amount1
    // amount0 = amount1 * Q96^2 * (sqrtRatioB - sqrtPriceX96) / ((sqrtPriceX96 - sqrtRatioA) * sqrtPriceX96 * sqrtRatioB)
    const numerator = amount1 * Q96 * Q96 * (sqrtRatioB - sqrtPriceX96);
    const denominator = (sqrtPriceX96 - sqrtRatioA) * sqrtPriceX96 * sqrtRatioB;

    const result = numerator / denominator;
    console.log("  Calculated amount0:", result.toString());
    return result;
}