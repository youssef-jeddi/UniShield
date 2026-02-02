import { ethers } from 'ethers';

export const POOL_MANAGER_ADDRESS = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543"; // Uniswap v4 PoolManager on Sepolia
export const POOL_MODIFY_ROUTER_ADDRESS = "0x0c478023803a644c94c4ce1c1e7b9a087e411b0a"; // PoolModifyLiquidityTest on Sepolia
export const CLEANPOOL_HOOK_ADDRESS = "0x92f39374f0f30393Dc0e996b3B716b644f130880"; // UniShield Hook

// Token addresses for your pool (Sepolia)
export const TOKEN_A_ADDRESS = "0x70eb18e2D1C11368ac0F76379d51CEf26D219882"; // cUSD
export const TOKEN_B_ADDRESS = "0xb5F68459e5Fd08c68F5256D829538a929778b193"; // cETH

// Pool parameters
export const POOL_FEE = 3000; // 0.3%
export const TICK_SPACING = 60;

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
export function tickToSqrtPriceX96(tick: number): bigint {
    const sqrtRatio = Math.sqrt(1.0001 ** tick);
    return BigInt(Math.floor(sqrtRatio * Number(Q96)));
}

// Calculate liquidity from token amounts
// This is a simplified calculation assuming we're adding liquidity within range
export function calculateLiquidityFromAmounts(
    sqrtPriceX96: bigint,
    tickLower: number,
    tickUpper: number,
    amount0: bigint,  // USDC amount (smaller token address)
    amount1: bigint   // WETH amount (larger token address)
): bigint {
    const sqrtRatioA = tickToSqrtPriceX96(tickLower);
    const sqrtRatioB = tickToSqrtPriceX96(tickUpper);

    // If current price is below range, use only amount0
    if (sqrtPriceX96 <= sqrtRatioA) {
        // liquidity = amount0 * sqrtRatioA * sqrtRatioB / (sqrtRatioB - sqrtRatioA)
        const numerator = amount0 * sqrtRatioA * sqrtRatioB;
        const denominator = (sqrtRatioB - sqrtRatioA) * Q96;
        return numerator / denominator;
    }
    // If current price is above range, use only amount1
    else if (sqrtPriceX96 >= sqrtRatioB) {
        // liquidity = amount1 * Q96 / (sqrtRatioB - sqrtRatioA)
        return (amount1 * Q96) / (sqrtRatioB - sqrtRatioA);
    }
    // Current price is within range - use minimum of both calculations
    else {
        // liquidity0 = amount0 * sqrtPrice * sqrtRatioB / ((sqrtRatioB - sqrtPrice) * Q96)
        const liquidity0 = (amount0 * sqrtPriceX96 * sqrtRatioB) / ((sqrtRatioB - sqrtPriceX96) * Q96);
        // liquidity1 = amount1 * Q96 / (sqrtPrice - sqrtRatioA)
        const liquidity1 = (amount1 * Q96) / (sqrtPriceX96 - sqrtRatioA);
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