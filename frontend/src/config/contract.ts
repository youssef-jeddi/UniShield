export const POOL_MANAGER_ADDRESS = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543"; // Uniswap v4 PoolManager on your chain
export const POOL_MODIFY_ROUTER_ADDRESS = "0x..."; // Router contract address
export const CLEANPOOL_HOOK_ADDRESS = "0xE9DAc44aA9DEb78D02DB5C5E67984bAfFa560880"; // Your hook

// Token addresses for your pool
export const TOKEN_A_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"; // WETH
export const TOKEN_B_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // USDC

// Pool parameters
export const POOL_FEE = 3000; // 0.3%
export const TICK_SPACING = 60;

// ABIs
export const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
];

export const POOL_MODIFY_ROUTER_ABI = [
    "function modifyLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) returns (int256 delta0, int256 delta1)",
];