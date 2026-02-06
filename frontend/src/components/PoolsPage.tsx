import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import {
    POOL_MANAGER_ADDRESS,
    POOL_MODIFY_ROUTER_ADDRESS,
    CLEANPOOL_HOOK_ADDRESS,
    POOL_FEE,
    TICK_SPACING,
    ERC20_ABI,
    POOL_MODIFY_ROUTER_ABI,
    POOL_MANAGER_ABI,
    getSortedTokens,
    computePoolId,
    calculateLiquidityFromAmounts,
    calculateAmount0FromAmount1,
    calculateAmount1FromAmount0,
} from '../config/contract';
import { SEPOLIA_CHAIN_ID } from '../config/privyConfig';
import { normalizeChainId } from '../utils/normalizeChainId';

// Hook ABI for KYC check
const HOOK_ABI = [
    "function isKYCValid(address user) view returns (bool)",
    "function kycExpiry(address user) view returns (uint256)",
];

interface Pool {
    name: string;
    tokens: [string, string];
    tokenAddresses: [string, string];
    tvl: string;
    tvlUsd: number;
    fee: string;
    tickSpacing: number;
    hookAddress: string;
    kycRequired: boolean;
    liquidity: {
        token0: string;
        token1: string;
        token0Symbol: string;
        token1Symbol: string;
    };
}

interface PoolData {
    pools: Pool[];
    loading: boolean;
    error: string | null;
    totalTvl: number;
}

interface UserBalances {
    token0: string;
    token1: string;
    token0Symbol: string;
    token1Symbol: string;
    loading: boolean;
}

interface PoolsPageProps {
    address?: string;
    isConnected: boolean;
    wallet?: any;
    onNavigateToKYC: () => void;
}

const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';

const PoolsPage: React.FC<PoolsPageProps> = ({ address, isConnected, wallet, onNavigateToKYC }) => {
    const [poolData, setPoolData] = useState<PoolData>({
        pools: [],
        loading: true,
        error: null,
        totalTvl: 0,
    });

    // Deposit view state
    const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
    const [isKYCValid, setIsKYCValid] = useState<boolean>(false);
    const [kycExpiry, setKycExpiry] = useState<Date | null>(null);
    const [kycChecking, setKycChecking] = useState<boolean>(false);
    const [userBalances, setUserBalances] = useState<UserBalances>({
        token0: '0',
        token1: '0',
        token0Symbol: '',
        token1Symbol: '',
        loading: false,
    });
    const [depositAmounts, setDepositAmounts] = useState({
        token0Amount: '',
        token1Amount: '',
    });
    const [depositStatus, setDepositStatus] = useState<'idle' | 'approving' | 'depositing' | 'success' | 'error'>('idle');
    const [depositError, setDepositError] = useState<string>('');

    // Withdraw state
    const [actionMode, setActionMode] = useState<'deposit' | 'withdraw'>('deposit');
    const [withdrawAmounts, setWithdrawAmounts] = useState({
        token0Amount: '',
        token1Amount: '',
    });
    const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'withdrawing' | 'success' | 'error'>('idle');
    const [withdrawError, setWithdrawError] = useState<string>('');

    // Pool price state for auto-calculation
    const [poolPrice, setPoolPrice] = useState<{
        sqrtPriceX96: bigint | null;
        decimals0: number;
        decimals1: number;
        symbol0: string;
        symbol1: string;
    }>({
        sqrtPriceX96: null,
        decimals0: 18,
        decimals1: 18,
        symbol0: '',
        symbol1: '',
    });

    // Tick range for liquidity position
    // For correct price (2500 cUSD per cETH), tick ≈ 78244
    // Range covers approximately $1000 to $5000 ETH
    // Ticks must be divisible by TICK_SPACING (10)
    const TICK_LOWER = 69070; // ~$1000 ETH
    const TICK_UPPER = 85180; // ~$5000 ETH

    useEffect(() => {
        fetchPoolData();
    }, []);

    // Check KYC status and fetch pool price when a pool is selected
    useEffect(() => {
        if (selectedPool && address) {
            checkKYCStatus();
            fetchUserBalances();
            fetchPoolPrice();
        }
    }, [selectedPool, address]);

    const checkKYCStatus = async () => {
        if (!address) return;

        setKycChecking(true);
        try {
            const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
            const hook = new ethers.Contract(CLEANPOOL_HOOK_ADDRESS, HOOK_ABI, provider);

            const isValid = await hook.isKYCValid(address);
            setIsKYCValid(isValid);

            if (isValid) {
                const expiry = await hook.kycExpiry(address);
                setKycExpiry(new Date(Number(expiry) * 1000));
            }
        } catch (error) {
            console.error('Error checking KYC status:', error);
            setIsKYCValid(false);
        }
        setKycChecking(false);
    };

    const fetchUserBalances = async () => {
        if (!address || !selectedPool) return;

        setUserBalances(prev => ({ ...prev, loading: true }));
        try {
            const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
            const { currency0, currency1 } = getSortedTokens();

            const token0Contract = new ethers.Contract(currency0, ERC20_ABI, provider);
            const token1Contract = new ethers.Contract(currency1, ERC20_ABI, provider);

            const [balance0, balance1, symbol0, symbol1, decimals0, decimals1] = await Promise.all([
                token0Contract.balanceOf(address),
                token1Contract.balanceOf(address),
                token0Contract.symbol(),
                token1Contract.symbol(),
                token0Contract.decimals(),
                token1Contract.decimals(),
            ]);

            setUserBalances({
                token0: ethers.formatUnits(balance0, decimals0),
                token1: ethers.formatUnits(balance1, decimals1),
                token0Symbol: symbol0,
                token1Symbol: symbol1,
                loading: false,
            });
        } catch (error) {
            console.error('Error fetching balances:', error);
            setUserBalances(prev => ({ ...prev, loading: false }));
        }
    };

    // Default sqrtPriceX96 for 1 ETH = $2500
    // cETH is currency0, cUSD is currency1, price = 2500
    // sqrtPriceX96 = sqrt(2500) * 2^96 = 50 * 2^96
    const DEFAULT_SQRT_PRICE_X96 = BigInt("3961408125713216879677197516800");

    const fetchPoolPrice = async () => {
        try {
            const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
            const { currency0, currency1 } = getSortedTokens();

            const token0Contract = new ethers.Contract(currency0, ERC20_ABI, provider);
            const token1Contract = new ethers.Contract(currency1, ERC20_ABI, provider);
            const poolManager = new ethers.Contract(POOL_MANAGER_ADDRESS, POOL_MANAGER_ABI, provider);

            const poolId = computePoolId(currency0, currency1, POOL_FEE, TICK_SPACING, CLEANPOOL_HOOK_ADDRESS);

            // Fetch token info first
            const [decimals0, decimals1, symbol0, symbol1] = await Promise.all([
                token0Contract.decimals(),
                token1Contract.decimals(),
                token0Contract.symbol(),
                token1Contract.symbol(),
            ]);

            // Try to fetch pool state
            let sqrtPriceX96: bigint;
            try {
                const slot0 = await poolManager.getSlot0(poolId);
                sqrtPriceX96 = BigInt(slot0.sqrtPriceX96.toString());
                console.log("Pool price fetched - sqrtPriceX96:", sqrtPriceX96.toString());
                console.log("Current tick:", slot0.tick.toString());
            } catch (e) {
                console.log("Pool not found or getSlot0 failed, using default $2500 ETH price");
                sqrtPriceX96 = DEFAULT_SQRT_PRICE_X96;
            }

            setPoolPrice({
                sqrtPriceX96,
                decimals0: Number(decimals0),
                decimals1: Number(decimals1),
                symbol0,
                symbol1,
            });
        } catch (error) {
            console.error('Error fetching pool price:', error);
            // Set default $2500 ETH price if fetch fails completely
            setPoolPrice(prev => ({
                ...prev,
                sqrtPriceX96: DEFAULT_SQRT_PRICE_X96,
            }));
        }
    };

    // Auto-calculate paired amount when token0 amount changes
    const handleToken0AmountChange = (value: string, isDeposit: boolean) => {
        if (isDeposit) {
            setDepositAmounts(prev => ({ ...prev, token0Amount: value }));
        } else {
            setWithdrawAmounts(prev => ({ ...prev, token0Amount: value }));
        }

        if (!value || !poolPrice.sqrtPriceX96) {
            if (isDeposit) {
                setDepositAmounts(prev => ({ ...prev, token1Amount: '' }));
            } else {
                setWithdrawAmounts(prev => ({ ...prev, token1Amount: '' }));
            }
            return;
        }

        try {
            const amount0 = parseFloat(value);
            if (isNaN(amount0) || amount0 <= 0) return;

            console.log("handleToken0AmountChange - symbol0:", poolPrice.symbol0);
            console.log("handleToken0AmountChange - sqrtPriceX96:", poolPrice.sqrtPriceX96.toString());
            console.log("handleToken0AmountChange - TICK_LOWER:", TICK_LOWER, "TICK_UPPER:", TICK_UPPER);

            // User entered token0 amount, calculate token1 amount
            const amount0Wei = ethers.parseUnits(amount0.toString(), poolPrice.decimals0);
            console.log("Token0 wei:", amount0Wei.toString());

            const calculatedAmount = calculateAmount1FromAmount0(
                poolPrice.sqrtPriceX96,
                TICK_LOWER,
                TICK_UPPER,
                amount0Wei
            );
            console.log("Calculated token1 amount (wei):", calculatedAmount.toString());

            const amount1Formatted = ethers.formatUnits(calculatedAmount, poolPrice.decimals1);
            console.log("Token1 formatted:", amount1Formatted);

            if (isDeposit) {
                setDepositAmounts(prev => ({ ...prev, token1Amount: parseFloat(amount1Formatted).toFixed(2) }));
            } else {
                setWithdrawAmounts(prev => ({ ...prev, token1Amount: parseFloat(amount1Formatted).toFixed(2) }));
            }
        } catch (error) {
            console.error('Error calculating paired amount:', error);
        }
    };

    // Auto-calculate paired amount when token1 amount changes
    const handleToken1AmountChange = (value: string, isDeposit: boolean) => {
        if (isDeposit) {
            setDepositAmounts(prev => ({ ...prev, token1Amount: value }));
        } else {
            setWithdrawAmounts(prev => ({ ...prev, token1Amount: value }));
        }

        if (!value || !poolPrice.sqrtPriceX96) {
            if (isDeposit) {
                setDepositAmounts(prev => ({ ...prev, token0Amount: '' }));
            } else {
                setWithdrawAmounts(prev => ({ ...prev, token0Amount: '' }));
            }
            return;
        }

        try {
            const amount1 = parseFloat(value);
            if (isNaN(amount1) || amount1 <= 0) return;

            console.log("handleToken1AmountChange - symbol1:", poolPrice.symbol1);
            console.log("handleToken1AmountChange - sqrtPriceX96:", poolPrice.sqrtPriceX96.toString());

            // User entered token1 amount, calculate token0 amount
            const amount1Wei = ethers.parseUnits(amount1.toString(), poolPrice.decimals1);
            console.log("Token1 wei:", amount1Wei.toString());

            const calculatedAmount = calculateAmount0FromAmount1(
                poolPrice.sqrtPriceX96,
                TICK_LOWER,
                TICK_UPPER,
                amount1Wei
            );
            console.log("Calculated token0 amount (wei):", calculatedAmount.toString());

            const amount0Formatted = ethers.formatUnits(calculatedAmount, poolPrice.decimals0);
            console.log("Token0 formatted:", amount0Formatted);

            if (isDeposit) {
                setDepositAmounts(prev => ({ ...prev, token0Amount: parseFloat(amount0Formatted).toFixed(6) }));
            } else {
                setWithdrawAmounts(prev => ({ ...prev, token0Amount: parseFloat(amount0Formatted).toFixed(6) }));
            }
        } catch (error) {
            console.error('Error calculating paired amount:', error);
        }
    };

    const ensureSepoliaNetwork = async (): Promise<boolean> => {
        if (!wallet) return false;
        const currentChainId = normalizeChainId(wallet.chainId);
        if (currentChainId !== SEPOLIA_CHAIN_ID) {
            try {
                await wallet.switchChain(SEPOLIA_CHAIN_ID);
                return true;
            } catch (error) {
                console.error('Failed to switch to Sepolia:', error);
                return false;
            }
        }
        return true;
    };

    const handleDeposit = async () => {
        if (!wallet || !selectedPool || !address) return;

        const token0Amount = parseFloat(depositAmounts.token0Amount);
        const token1Amount = parseFloat(depositAmounts.token1Amount);

        if (isNaN(token0Amount) || isNaN(token1Amount) || token0Amount <= 0 || token1Amount <= 0) {
            setDepositError('Please enter valid deposit amounts');
            return;
        }

        const onSepolia = await ensureSepoliaNetwork();
        if (!onSepolia) {
            setDepositError('Please switch to Sepolia network to deposit');
            return;
        }

        setDepositStatus('approving');
        setDepositError('');

        try {
            const provider = await wallet.getEthereumProvider();
            const ethersProvider = new ethers.BrowserProvider(provider);
            const signer = await ethersProvider.getSigner();

            const { currency0, currency1 } = getSortedTokens();

            const token0Contract = new ethers.Contract(currency0, ERC20_ABI, signer);
            const token1Contract = new ethers.Contract(currency1, ERC20_ABI, signer);

            const [decimals0, decimals1, symbol0, symbol1] = await Promise.all([
                token0Contract.decimals(),
                token1Contract.decimals(),
                token0Contract.symbol(),
                token1Contract.symbol(),
            ]);

            console.log("Token0 (currency0):", symbol0, "decimals:", decimals0);
            console.log("Token1 (currency1):", symbol1, "decimals:", decimals1);

            // token0Amount corresponds to currency0, token1Amount corresponds to currency1
            const amount0Wei = ethers.parseUnits(token0Amount.toString(), decimals0);
            const amount1Wei = ethers.parseUnits(token1Amount.toString(), decimals1);

            console.log("Amount0 (wei):", amount0Wei.toString());
            console.log("Amount1 (wei):", amount1Wei.toString());

            const maxApproval = ethers.MaxUint256;

            // Approve tokens to both router and pool manager
            console.log("Approving tokens...");
            const approveTx0Router = await token0Contract.approve(POOL_MODIFY_ROUTER_ADDRESS, maxApproval);
            await approveTx0Router.wait();

            const approveTx0PM = await token0Contract.approve(POOL_MANAGER_ADDRESS, maxApproval);
            await approveTx0PM.wait();

            const approveTx1Router = await token1Contract.approve(POOL_MODIFY_ROUTER_ADDRESS, maxApproval);
            await approveTx1Router.wait();

            const approveTx1PM = await token1Contract.approve(POOL_MANAGER_ADDRESS, maxApproval);
            await approveTx1PM.wait();

            setDepositStatus('depositing');

            // Get current pool state to calculate proper liquidity
            const poolManager = new ethers.Contract(POOL_MANAGER_ADDRESS, POOL_MANAGER_ABI, ethersProvider);
            const poolId = computePoolId(currency0, currency1, POOL_FEE, TICK_SPACING, CLEANPOOL_HOOK_ADDRESS);
            console.log("Pool ID:", poolId);

            let sqrtPriceX96: bigint;
            try {
                const slot0 = await poolManager.getSlot0(poolId);
                sqrtPriceX96 = BigInt(slot0.sqrtPriceX96.toString());
                console.log("Current sqrtPriceX96:", sqrtPriceX96.toString());
                console.log("Current tick:", slot0.tick.toString());
            } catch (e) {
                // Pool might not exist yet or getSlot0 fails - use a default price (1:1 ratio = 2^96)
                console.log("Could not get pool state, using default price");
                sqrtPriceX96 = BigInt(2) ** BigInt(96); // 1:1 price ratio
            }

            // Calculate liquidity from amounts
            const liquidityDelta = calculateLiquidityFromAmounts(
                sqrtPriceX96,
                TICK_LOWER,
                TICK_UPPER,
                amount0Wei,
                amount1Wei
            );

            console.log("Calculated liquidityDelta:", liquidityDelta.toString());

            // Ensure we have a reasonable liquidity amount
            if (liquidityDelta <= BigInt(0)) {
                throw new Error("Calculated liquidity is zero or negative. Try different amounts.");
            }

            // Create pool key and modify params
            const poolKey = {
                currency0: currency0,
                currency1: currency1,
                fee: POOL_FEE,
                tickSpacing: TICK_SPACING,
                hooks: CLEANPOOL_HOOK_ADDRESS,
            };

            const modifyParams = {
                tickLower: TICK_LOWER,
                tickUpper: TICK_UPPER,
                liquidityDelta: liquidityDelta,
                salt: ethers.zeroPadBytes(ethers.toUtf8Bytes("UniShield"), 32),
            };

            console.log("Pool Key:", poolKey);
            console.log("Modify Params:", {
                ...modifyParams,
                liquidityDelta: modifyParams.liquidityDelta.toString()
            });

            const router = new ethers.Contract(POOL_MODIFY_ROUTER_ADDRESS, POOL_MODIFY_ROUTER_ABI, signer);

            const tx = await router.modifyLiquidity(poolKey, modifyParams, "0x", { gasLimit: 1000000 });
            console.log("Transaction sent:", tx.hash);

            const receipt = await tx.wait();
            console.log("Transaction confirmed:", receipt.hash);

            setDepositStatus('success');

            // Refresh balances and pool data after a short delay to ensure blockchain state is updated
            setTimeout(() => {
                fetchUserBalances();
                fetchPoolData();
            }, 2000);

        } catch (error: any) {
            console.error('Deposit error:', error);
            setDepositError(error.message || 'Deposit failed');
            setDepositStatus('error');
        }
    };

    // Withdraw all liquidity from the pool
    const handleWithdrawAll = async () => {
        if (!wallet || !selectedPool || !address) return;

        const onSepolia = await ensureSepoliaNetwork();
        if (!onSepolia) {
            setWithdrawError('Please switch to Sepolia network to withdraw');
            return;
        }

        setWithdrawStatus('withdrawing');
        setWithdrawError('');

        try {
            const provider = await wallet.getEthereumProvider();
            const ethersProvider = new ethers.BrowserProvider(provider);
            const signer = await ethersProvider.getSigner();

            const { currency0, currency1 } = getSortedTokens();

            // Get pool state
            const poolManager = new ethers.Contract(POOL_MANAGER_ADDRESS, POOL_MANAGER_ABI, ethersProvider);
            const poolId = computePoolId(currency0, currency1, POOL_FEE, TICK_SPACING, CLEANPOOL_HOOK_ADDRESS);

            const slot0 = await poolManager.getSlot0(poolId);
            const sqrtPriceX96 = BigInt(slot0.sqrtPriceX96.toString());
            console.log("WithdrawAll - sqrtPriceX96:", sqrtPriceX96.toString());

            // Get token contracts to read pool balances
            const token0Contract = new ethers.Contract(currency0, ERC20_ABI, ethersProvider);
            const token1Contract = new ethers.Contract(currency1, ERC20_ABI, ethersProvider);

            const [balance0, balance1] = await Promise.all([
                token0Contract.balanceOf(POOL_MANAGER_ADDRESS),
                token1Contract.balanceOf(POOL_MANAGER_ADDRESS),
            ]);

            console.log("Pool balance0:", balance0.toString());
            console.log("Pool balance1:", balance1.toString());

            // Calculate max liquidity from pool balances
            const maxLiquidity = calculateLiquidityFromAmounts(
                sqrtPriceX96,
                TICK_LOWER,
                TICK_UPPER,
                BigInt(balance0.toString()),
                BigInt(balance1.toString())
            );

            console.log("Calculated max liquidity:", maxLiquidity.toString());

            // Use negative liquidity delta for withdrawal
            const negativeLiquidityDelta = -maxLiquidity;

            const poolKey = {
                currency0: currency0,
                currency1: currency1,
                fee: POOL_FEE,
                tickSpacing: TICK_SPACING,
                hooks: CLEANPOOL_HOOK_ADDRESS,
            };

            const modifyParams = {
                tickLower: TICK_LOWER,
                tickUpper: TICK_UPPER,
                liquidityDelta: negativeLiquidityDelta,
                salt: ethers.zeroPadBytes(ethers.toUtf8Bytes("UniShield"), 32),
            };

            console.log("WithdrawAll Modify Params:", {
                ...modifyParams,
                liquidityDelta: modifyParams.liquidityDelta.toString()
            });

            const router = new ethers.Contract(POOL_MODIFY_ROUTER_ADDRESS, POOL_MODIFY_ROUTER_ABI, signer);

            const tx = await router.modifyLiquidity(poolKey, modifyParams, "0x", { gasLimit: 1000000 });
            console.log("WithdrawAll Transaction sent:", tx.hash);

            const receipt = await tx.wait();
            console.log("WithdrawAll Transaction confirmed:", receipt.hash);

            setWithdrawStatus('success');

            setTimeout(() => {
                fetchUserBalances();
                fetchPoolData();
            }, 2000);

        } catch (error: any) {
            console.error('WithdrawAll error:', error);
            setWithdrawError(error.message || 'Withdrawal failed');
            setWithdrawStatus('error');
        }
    };

    const handleWithdraw = async () => {
        if (!wallet || !selectedPool || !address) return;

        const token0Amount = parseFloat(withdrawAmounts.token0Amount);
        const token1Amount = parseFloat(withdrawAmounts.token1Amount);

        if (isNaN(token0Amount) || isNaN(token1Amount) || token0Amount <= 0 || token1Amount <= 0) {
            setWithdrawError('Please enter valid withdrawal amounts');
            return;
        }

        const onSepolia = await ensureSepoliaNetwork();
        if (!onSepolia) {
            setWithdrawError('Please switch to Sepolia network to withdraw');
            return;
        }

        setWithdrawStatus('withdrawing');
        setWithdrawError('');

        try {
            const provider = await wallet.getEthereumProvider();
            const ethersProvider = new ethers.BrowserProvider(provider);
            const signer = await ethersProvider.getSigner();

            const { currency0, currency1 } = getSortedTokens();

            const token0Contract = new ethers.Contract(currency0, ERC20_ABI, signer);
            const token1Contract = new ethers.Contract(currency1, ERC20_ABI, signer);

            const [decimals0, decimals1, symbol0, symbol1] = await Promise.all([
                token0Contract.decimals(),
                token1Contract.decimals(),
                token0Contract.symbol(),
                token1Contract.symbol(),
            ]);

            console.log("Withdrawing - Token0 (currency0):", symbol0, "decimals:", decimals0);
            console.log("Withdrawing - Token1 (currency1):", symbol1, "decimals:", decimals1);

            // token0Amount corresponds to currency0, token1Amount corresponds to currency1
            const amount0Wei = ethers.parseUnits(token0Amount.toString(), decimals0);
            const amount1Wei = ethers.parseUnits(token1Amount.toString(), decimals1);

            console.log("Withdraw Amount0 (wei):", amount0Wei.toString());
            console.log("Withdraw Amount1 (wei):", amount1Wei.toString());

            // Get current pool state to calculate proper liquidity
            const poolManager = new ethers.Contract(POOL_MANAGER_ADDRESS, POOL_MANAGER_ABI, ethersProvider);
            const poolId = computePoolId(currency0, currency1, POOL_FEE, TICK_SPACING, CLEANPOOL_HOOK_ADDRESS);
            console.log("Pool ID:", poolId);

            let sqrtPriceX96: bigint;
            try {
                const slot0 = await poolManager.getSlot0(poolId);
                sqrtPriceX96 = BigInt(slot0.sqrtPriceX96.toString());
                console.log("Current sqrtPriceX96:", sqrtPriceX96.toString());
                console.log("Current tick:", slot0.tick.toString());
            } catch (e) {
                console.log("Could not get pool state, using default price");
                sqrtPriceX96 = BigInt(2) ** BigInt(96);
            }

            // Calculate liquidity from amounts (same formula, but we'll negate it)
            const liquidityDelta = calculateLiquidityFromAmounts(
                sqrtPriceX96,
                TICK_LOWER,
                TICK_UPPER,
                amount0Wei,
                amount1Wei
            );

            // NEGATIVE liquidity delta for withdrawal
            const negativeLiquidityDelta = -liquidityDelta;

            console.log("Calculated negative liquidityDelta for withdrawal:", negativeLiquidityDelta.toString());

            if (liquidityDelta <= BigInt(0)) {
                throw new Error("Calculated liquidity is zero or negative. Try different amounts.");
            }

            // Create pool key and modify params
            const poolKey = {
                currency0: currency0,
                currency1: currency1,
                fee: POOL_FEE,
                tickSpacing: TICK_SPACING,
                hooks: CLEANPOOL_HOOK_ADDRESS,
            };

            const modifyParams = {
                tickLower: TICK_LOWER,
                tickUpper: TICK_UPPER,
                liquidityDelta: negativeLiquidityDelta, // Negative for withdrawal
                salt: ethers.zeroPadBytes(ethers.toUtf8Bytes("UniShield"), 32),
            };

            console.log("Withdraw Pool Key:", poolKey);
            console.log("Withdraw Modify Params:", {
                ...modifyParams,
                liquidityDelta: modifyParams.liquidityDelta.toString()
            });

            const router = new ethers.Contract(POOL_MODIFY_ROUTER_ADDRESS, POOL_MODIFY_ROUTER_ABI, signer);

            const tx = await router.modifyLiquidity(poolKey, modifyParams, "0x", { gasLimit: 1000000 });
            console.log("Withdraw Transaction sent:", tx.hash);

            const receipt = await tx.wait();
            console.log("Withdraw Transaction confirmed:", receipt.hash);

            setWithdrawStatus('success');

            // Refresh balances and pool data
            setTimeout(() => {
                fetchUserBalances();
                fetchPoolData();
            }, 2000);

        } catch (error: any) {
            console.error('Withdraw error:', error);
            setWithdrawError(error.message || 'Withdrawal failed');
            setWithdrawStatus('error');
        }
    };

    const closeDepositView = () => {
        setSelectedPool(null);
        setDepositAmounts({ token0Amount: '', token1Amount: '' });
        setDepositStatus('idle');
        setDepositError('');
        setWithdrawAmounts({ token0Amount: '', token1Amount: '' });
        setWithdrawStatus('idle');
        setWithdrawError('');
        setActionMode('deposit');
    };

    const fetchPoolData = async () => {
        try {
            const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
            const { currency0, currency1 } = getSortedTokens();

            // Create token contracts
            const token0Contract = new ethers.Contract(currency0, ERC20_ABI, provider);
            const token1Contract = new ethers.Contract(currency1, ERC20_ABI, provider);

            // Fetch token info and balances in pool manager
            const [
                token0Balance,
                token1Balance,
                token0Symbol,
                token1Symbol,
                token0Decimals,
                token1Decimals,
            ] = await Promise.all([
                token0Contract.balanceOf(POOL_MANAGER_ADDRESS),
                token1Contract.balanceOf(POOL_MANAGER_ADDRESS),
                token0Contract.symbol(),
                token1Contract.symbol(),
                token0Contract.decimals(),
                token1Contract.decimals(),
            ]);

            // Format balances
            const token0Formatted = ethers.formatUnits(token0Balance, token0Decimals);
            const token1Formatted = ethers.formatUnits(token1Balance, token1Decimals);

            // Estimate TVL (simplified - using approximate prices for testnet)
            // USDC ≈ $1, WETH ≈ $2500 (rough estimate for display)
            const isToken0USDC = token0Symbol === 'USDC';
            const usdcBalance = isToken0USDC ? parseFloat(token0Formatted) : parseFloat(token1Formatted);
            const wethBalance = isToken0USDC ? parseFloat(token1Formatted) : parseFloat(token0Formatted);
            const estimatedTvl = usdcBalance + (wethBalance * 2500);

            const pool: Pool = {
                name: `${token1Symbol} / ${token0Symbol}`,
                tokens: [token1Symbol, token0Symbol] as [string, string],
                tokenAddresses: [currency1, currency0] as [string, string],
                tvl: estimatedTvl > 0 ? `$${estimatedTvl.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'No liquidity',
                tvlUsd: estimatedTvl,
                fee: `${POOL_FEE / 10000}%`,
                tickSpacing: TICK_SPACING,
                hookAddress: CLEANPOOL_HOOK_ADDRESS,
                kycRequired: true, // Our hook requires KYC
                liquidity: {
                    token0: parseFloat(token0Formatted).toLocaleString(undefined, { maximumFractionDigits: 6 }),
                    token1: parseFloat(token1Formatted).toLocaleString(undefined, { maximumFractionDigits: 6 }),
                    token0Symbol,
                    token1Symbol,
                },
            };

            setPoolData({
                pools: [pool],
                loading: false,
                error: null,
                totalTvl: estimatedTvl,
            });
        } catch (err) {
            console.error('Error fetching pool data:', err);
            setPoolData({
                pools: [],
                loading: false,
                error: 'Failed to fetch pool data. Please try again.',
                totalTvl: 0,
            });
        }
    };
    const truncateAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    if (poolData.loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#11d483] mx-auto mb-4"></div>
                    <p className="text-[#92c9b2]">Loading pool data from Sepolia...</p>
                </div>
            </div>
        );
    }

    if (poolData.error) {
        return (
            <div className="card p-8 text-center">
                <p className="text-red-400 mb-4">{poolData.error}</p>
                <button onClick={fetchPoolData} className="btn-primary py-2 px-4">
                    Retry
                </button>
            </div>
        );
    }

    // Deposit View Modal
    if (selectedPool) {
        return (
            <div className="space-y-6">
                {/* Back Button */}
                <button
                    onClick={closeDepositView}
                    className="flex items-center gap-2 text-[#92c9b2] hover:text-white transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Pools
                </button>

                {/* Header */}
                <div>
                    <h1 className="text-white text-3xl font-black">Manage Liquidity - {selectedPool.name}</h1>
                    <p className="text-[#92c9b2] text-sm mt-1">Add or remove liquidity from this KYC-protected pool</p>
                </div>

                {/* KYC Check Loading */}
                {kycChecking ? (
                    <div className="card p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#11d483] mx-auto mb-4"></div>
                        <p className="text-[#92c9b2]">Checking KYC status...</p>
                    </div>
                ) : !isConnected ? (
                    /* Not Connected */
                    <div className="card p-12 text-center">
                        <div className="w-16 h-16 bg-[#234839] rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-[#92c9b2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-3">Wallet Not Connected</h2>
                        <p className="text-[#92c9b2] mb-6">Please connect your wallet to deposit liquidity.</p>
                    </div>
                ) : !isKYCValid ? (
                    /* Not KYC Verified */
                    <div className="card p-12 text-center">
                        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-3">KYC Verification Required</h2>
                        <p className="text-[#92c9b2] mb-6">
                            This pool requires KYC verification before you can deposit liquidity.
                            Complete your identity verification to access institutional-grade DeFi.
                        </p>
                        <button
                            onClick={() => {
                                closeDepositView();
                                onNavigateToKYC();
                            }}
                            className="btn-primary py-3 px-8"
                        >
                            <svg className="w-5 h-5 mr-2 inline" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                            </svg>
                            Complete KYC Verification
                        </button>
                        <p className="text-[#92c9b2] text-xs mt-4">
                            Your data is encrypted and processed securely via iExec TEE
                        </p>
                    </div>
                ) : (
                    /* KYC Valid - Show Deposit/Withdraw Form */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 card p-6">
                            {/* KYC Status Header */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-[#11d483]/20 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[#11d483]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L18 9l-9 9z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-white text-lg font-bold">KYC Verified</h3>
                                    <p className="text-[#92c9b2] text-xs">
                                        Valid until {kycExpiry?.toLocaleDateString() || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Deposit/Withdraw Tabs */}
                            <div className="flex gap-2 mb-6 p-1 bg-[#10221a] rounded-lg">
                                <button
                                    onClick={() => setActionMode('deposit')}
                                    className={`flex-1 py-2.5 px-4 rounded-md font-bold text-sm transition-all ${actionMode === 'deposit'
                                        ? 'bg-[#11d483] text-black'
                                        : 'text-[#92c9b2] hover:text-white'
                                        }`}
                                >
                                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Deposit
                                </button>
                                <button
                                    onClick={() => setActionMode('withdraw')}
                                    className={`flex-1 py-2.5 px-4 rounded-md font-bold text-sm transition-all ${actionMode === 'withdraw'
                                        ? 'bg-[#11d483] text-black'
                                        : 'text-[#92c9b2] hover:text-white'
                                        }`}
                                >
                                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                    Withdraw
                                </button>
                            </div>

                            {/* Success Messages */}
                            {depositStatus === 'success' && actionMode === 'deposit' ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-[#11d483]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-[#11d483]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Deposit Successful!</h3>
                                    <p className="text-[#92c9b2] mb-6">Your liquidity has been added to the pool.</p>
                                    <button onClick={closeDepositView} className="btn-secondary py-2 px-6">
                                        Back to Pools
                                    </button>
                                </div>
                            ) : withdrawStatus === 'success' && actionMode === 'withdraw' ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-[#11d483]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-[#11d483]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Withdrawal Successful!</h3>
                                    <p className="text-[#92c9b2] mb-6">Your liquidity has been removed from the pool.</p>
                                    <button onClick={closeDepositView} className="btn-secondary py-2 px-6">
                                        Back to Pools
                                    </button>
                                </div>
                            ) : actionMode === 'deposit' ? (
                                /* Deposit Form */
                                <div className="space-y-4">
                                    {/* USDC Input - uses token1 */}
                                    <div className="p-4 rounded-lg bg-[#10221a]/50 border border-[#234839]">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-[#92c9b2]">Deposit Amount</span>
                                            <span className="text-xs text-[#92c9b2]">
                                                Balance: {userBalances.loading ? '...' : parseFloat(userBalances.token1).toFixed(2)} {userBalances.token1Symbol}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                value={depositAmounts.token1Amount}
                                                onChange={(e) => handleToken1AmountChange(e.target.value, true)}
                                                className="bg-transparent border-none text-2xl font-bold text-white focus:ring-0 w-full p-0 focus:outline-none"
                                                disabled={depositStatus !== 'idle'}
                                            />
                                            <div className="flex items-center gap-2 bg-[#234839] rounded-lg px-3 py-2">
                                                <div className="w-6 h-6 rounded-full bg-[#2775ca] flex items-center justify-center text-[8px] font-bold">
                                                    USD
                                                </div>
                                                <span className="font-bold text-sm">USDC</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleToken1AmountChange(userBalances.token1, true)}
                                            className="text-[#11d483] text-xs mt-2 hover:underline"
                                            disabled={depositStatus !== 'idle'}
                                        >
                                            Max
                                        </button>
                                    </div>

                                    {/* WETH Input - uses token0 */}
                                    <div className="p-4 rounded-lg bg-[#10221a]/50 border border-[#234839]">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-[#92c9b2]">Deposit Amount (auto-calculated)</span>
                                            <span className="text-xs text-[#92c9b2]">
                                                Balance: {userBalances.loading ? '...' : parseFloat(userBalances.token0).toFixed(6)} {userBalances.token0Symbol}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                placeholder="0.00"
                                                value={depositAmounts.token0Amount}
                                                onChange={(e) => handleToken0AmountChange(e.target.value, true)}
                                                className="bg-transparent border-none text-2xl font-bold text-white focus:ring-0 w-full p-0 focus:outline-none"
                                                disabled={depositStatus !== 'idle'}
                                            />
                                            <div className="flex items-center gap-2 bg-[#234839] rounded-lg px-3 py-2">
                                                <div className="w-6 h-6 rounded-full bg-[#627eea] flex items-center justify-center text-[8px] font-bold">
                                                    ETH
                                                </div>
                                                <span className="font-bold text-sm">WETH</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleToken0AmountChange(userBalances.token0, true)}
                                            className="text-[#11d483] text-xs mt-2 hover:underline"
                                            disabled={depositStatus !== 'idle'}
                                        >
                                            Max
                                        </button>
                                    </div>

                                    {/* Error Message */}
                                    {depositError && (
                                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                            {depositError}
                                        </div>
                                    )}

                                    {/* Deposit Button */}
                                    <button
                                        onClick={handleDeposit}
                                        disabled={depositStatus !== 'idle' || !depositAmounts.token0Amount || !depositAmounts.token1Amount}
                                        className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
                                    >
                                        {depositStatus === 'approving' ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                Approving Tokens...
                                            </>
                                        ) : depositStatus === 'depositing' ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                Adding Liquidity...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                                Add Liquidity
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                /* Withdraw Form */
                                <div className="space-y-4">
                                    {/* Info Banner */}
                                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
                                        <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                        </svg>
                                        Enter the approximate token amounts you want to withdraw. The actual amounts may vary slightly based on pool state.
                                    </div>

                                    {/* USDC Input - uses token1 */}
                                    <div className="p-4 rounded-lg bg-[#10221a]/50 border border-[#234839]">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-[#92c9b2]">Withdraw Amount</span>
                                            <span className="text-xs text-[#92c9b2]">
                                                Pool: {selectedPool.liquidity.token1} {selectedPool.liquidity.token1Symbol}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                value={withdrawAmounts.token1Amount}
                                                onChange={(e) => handleToken1AmountChange(e.target.value, false)}
                                                className="bg-transparent border-none text-2xl font-bold text-white focus:ring-0 w-full p-0 focus:outline-none"
                                                disabled={withdrawStatus !== 'idle'}
                                            />
                                            <div className="flex items-center gap-2 bg-[#234839] rounded-lg px-3 py-2">
                                                <div className="w-6 h-6 rounded-full bg-[#2775ca] flex items-center justify-center text-[8px] font-bold">
                                                    USD
                                                </div>
                                                <span className="font-bold text-sm">USDC</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* WETH Input - uses token0 */}
                                    <div className="p-4 rounded-lg bg-[#10221a]/50 border border-[#234839]">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-[#92c9b2]">Withdraw Amount (auto-calculated)</span>
                                            <span className="text-xs text-[#92c9b2]">
                                                Pool: {selectedPool.liquidity.token0} {selectedPool.liquidity.token0Symbol}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                placeholder="0.00"
                                                value={withdrawAmounts.token0Amount}
                                                onChange={(e) => handleToken0AmountChange(e.target.value, false)}
                                                className="bg-transparent border-none text-2xl font-bold text-white focus:ring-0 w-full p-0 focus:outline-none"
                                                disabled={withdrawStatus !== 'idle'}
                                            />
                                            <div className="flex items-center gap-2 bg-[#234839] rounded-lg px-3 py-2">
                                                <div className="w-6 h-6 rounded-full bg-[#627eea] flex items-center justify-center text-[8px] font-bold">
                                                    ETH
                                                </div>
                                                <span className="font-bold text-sm">WETH</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Error Message */}
                                    {withdrawError && (
                                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                            {withdrawError}
                                        </div>
                                    )}

                                    {/* Withdraw Buttons */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleWithdraw}
                                            disabled={withdrawStatus !== 'idle' || !withdrawAmounts.token0Amount || !withdrawAmounts.token1Amount}
                                            className="btn-primary flex-1 py-4 text-lg flex items-center justify-center gap-2"
                                            style={{ backgroundColor: withdrawStatus === 'idle' ? '#ef4444' : undefined }}
                                        >
                                            {withdrawStatus === 'withdrawing' ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                    Removing...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                    </svg>
                                                    Remove
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleWithdrawAll}
                                            disabled={withdrawStatus !== 'idle'}
                                            className="btn-primary flex-1 py-4 text-lg flex items-center justify-center gap-2"
                                            style={{ backgroundColor: withdrawStatus === 'idle' ? '#dc2626' : undefined }}
                                        >
                                            {withdrawStatus === 'withdrawing' ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                    Removing All...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Withdraw All
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Pool Info Sidebar */}
                        <div className="space-y-4">
                            <div className="card p-5">
                                <h4 className="text-white font-bold mb-4">Pool Details</h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-[#92c9b2]">Pool</span>
                                        <span className="text-white font-bold">{selectedPool.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#92c9b2]">Fee Tier</span>
                                        <span className="text-white">{selectedPool.fee}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#92c9b2]">Tick Spacing</span>
                                        <span className="text-white">{selectedPool.tickSpacing}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#92c9b2]">TVL</span>
                                        <span className="text-[#11d483] font-bold">{selectedPool.tvl}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="card p-5">
                                <h4 className="text-white font-bold mb-4">Current Liquidity</h4>
                                <div className="space-y-2 text-sm font-mono">
                                    <div className="flex justify-between">
                                        <span className="text-[#92c9b2]">{selectedPool.liquidity.token0Symbol}</span>
                                        <span className="text-white">{selectedPool.liquidity.token0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#92c9b2]">{selectedPool.liquidity.token1Symbol}</span>
                                        <span className="text-white">{selectedPool.liquidity.token1}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="card-highlight p-4">
                                <div className="flex gap-3">
                                    <svg className="w-5 h-5 text-[#11d483] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                                    </svg>
                                    <div>
                                        <p className="text-white text-sm font-bold">KYC Protected Pool</p>
                                        <p className="text-[#92c9b2] text-xs mt-1">
                                            This pool uses the UniShield Hook to ensure all liquidity providers are KYC verified.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-wrap justify-between gap-4 items-center">
                <div>
                    <h1 className="text-white text-3xl font-black">UniShield Pools</h1>
                    <p className="text-[#92c9b2] text-sm mt-1">KYC-protected liquidity pools powered by iExec TEE verification</p>
                </div>
                <button onClick={fetchPoolData} className="btn-secondary py-2.5 px-4 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-5">
                    <p className="text-[#92c9b2] text-xs font-bold uppercase tracking-wider mb-1">Total Value Locked</p>
                    <p className="text-white text-2xl font-bold">
                        {poolData.totalTvl > 0 ? `$${poolData.totalTvl.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'No liquidity yet'}
                    </p>
                    <p className="text-[#92c9b2] text-xs mt-1">On Sepolia Testnet</p>
                </div>
                <div className="card p-5">
                    <p className="text-[#92c9b2] text-xs font-bold uppercase tracking-wider mb-1">Active Pools</p>
                    <p className="text-white text-2xl font-bold">{poolData.pools.length}</p>
                    <p className="text-[#92c9b2] text-xs mt-1">{poolData.pools.filter(p => p.kycRequired).length} KYC-protected</p>
                </div>
                <div className="card p-5">
                    <p className="text-[#92c9b2] text-xs font-bold uppercase tracking-wider mb-1">Network</p>
                    <p className="text-white text-2xl font-bold">Sepolia</p>
                    <p className="text-[#92c9b2] text-xs mt-1">Chain ID: 11155111</p>
                </div>
            </div>

            {/* Pools Table */}
            <div className="card overflow-hidden">
                <div className="p-5 border-b border-[#234839]">
                    <h2 className="text-white text-lg font-bold">Deployed Pools</h2>
                </div>
                {poolData.pools.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-[#92c9b2]">No pools found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#10221a]/50">
                                <tr>
                                    <th className="text-left text-[#92c9b2] text-xs font-bold uppercase tracking-wider px-5 py-3">Pool</th>
                                    <th className="text-left text-[#92c9b2] text-xs font-bold uppercase tracking-wider px-5 py-3">Liquidity</th>
                                    <th className="text-left text-[#92c9b2] text-xs font-bold uppercase tracking-wider px-5 py-3">Fee Tier</th>
                                    <th className="text-left text-[#92c9b2] text-xs font-bold uppercase tracking-wider px-5 py-3">Hook</th>
                                    <th className="text-left text-[#92c9b2] text-xs font-bold uppercase tracking-wider px-5 py-3">Status</th>
                                    <th className="text-left text-[#92c9b2] text-xs font-bold uppercase tracking-wider px-5 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {poolData.pools.map((pool, index) => (
                                    <tr key={index} className="border-t border-[#234839]/50 hover:bg-[#234839]/20 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    <div className="w-8 h-8 rounded-full bg-[#627eea] flex items-center justify-center text-[10px] font-bold border-2 border-[#193328]">
                                                        {pool.tokens[0].slice(0, 2)}
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-[#2775ca] flex items-center justify-center text-[10px] font-bold border-2 border-[#193328]">
                                                        {pool.tokens[1].slice(0, 2)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-white font-bold block">{pool.name}</span>
                                                    <span className="text-[#92c9b2] text-xs">Tick spacing: {pool.tickSpacing}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-white font-mono text-sm">
                                                <div>{pool.liquidity.token0} {pool.liquidity.token0Symbol}</div>
                                                <div>{pool.liquidity.token1} {pool.liquidity.token1Symbol}</div>
                                            </div>
                                            <div className="text-[#11d483] text-xs mt-1">≈ {pool.tvl}</div>
                                        </td>
                                        <td className="px-5 py-4 text-white font-bold">{pool.fee}</td>
                                        <td className="px-5 py-4">
                                            <a
                                                href={`https://sepolia.etherscan.io/address/${pool.hookAddress}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[#11d483] hover:underline font-mono text-sm"
                                            >
                                                {truncateAddress(pool.hookAddress)}
                                            </a>
                                            <div className="text-[#92c9b2] text-xs">UniShield Hook</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {pool.kycRequired ? (
                                                <span className="badge badge-success">
                                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                                                    </svg>
                                                    KYC Protected
                                                </span>
                                            ) : (
                                                <span className="badge badge-warning">Public</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <button
                                                onClick={() => setSelectedPool(pool)}
                                                className="btn-primary py-2 px-4 text-sm"
                                            >
                                                Manage
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pool Details Card */}
            {poolData.pools.length > 0 && (
                <div className="card p-5">
                    <h3 className="text-white font-bold mb-4">Contract Addresses</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-[#92c9b2] text-xs uppercase tracking-wider mb-1">Pool Manager</p>
                            <a
                                href={`https://sepolia.etherscan.io/address/${POOL_MANAGER_ADDRESS}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#11d483] hover:underline font-mono break-all"
                            >
                                {POOL_MANAGER_ADDRESS}
                            </a>
                        </div>
                        <div>
                            <p className="text-[#92c9b2] text-xs uppercase tracking-wider mb-1">UniShield Hook</p>
                            <a
                                href={`https://sepolia.etherscan.io/address/${CLEANPOOL_HOOK_ADDRESS}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#11d483] hover:underline font-mono break-all"
                            >
                                {CLEANPOOL_HOOK_ADDRESS}
                            </a>
                        </div>
                        <div>
                            <p className="text-[#92c9b2] text-xs uppercase tracking-wider mb-1">{poolData.pools[0]?.liquidity.token0Symbol || 'Token 0'}</p>
                            <a
                                href={`https://sepolia.etherscan.io/address/${poolData.pools[0]?.tokenAddresses[1]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#11d483] hover:underline font-mono break-all"
                            >
                                {poolData.pools[0]?.tokenAddresses[1]}
                            </a>
                        </div>
                        <div>
                            <p className="text-[#92c9b2] text-xs uppercase tracking-wider mb-1">{poolData.pools[0]?.liquidity.token1Symbol || 'Token 1'}</p>
                            <a
                                href={`https://sepolia.etherscan.io/address/${poolData.pools[0]?.tokenAddresses[0]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#11d483] hover:underline font-mono break-all"
                            >
                                {poolData.pools[0]?.tokenAddresses[0]}
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PoolsPage;
