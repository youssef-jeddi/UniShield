export const POOL_MANAGER_ADDRESS = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543"; // Uniswap v4 PoolManager on Sepolia
export const POOL_MODIFY_ROUTER_ADDRESS = "0x0c478023803a644c94c4ce1c1e7b9a087e411b0a"; // PoolModifyLiquidityTest on Sepolia
export const CLEANPOOL_HOOK_ADDRESS = "0x681A5c96cba57d067eDB4EE08F40fb2913920880"; // UniShield Hook

// Token addresses for your pool (Sepolia)
export const TOKEN_A_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // USDC
export const TOKEN_B_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"; // WETH

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