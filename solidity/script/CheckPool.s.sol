// script/CheckPool.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CheckPool is Script {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    function run() external view {
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        address hook = vm.envAddress("HOOK_ADDRESS");
        address tokenA = vm.envAddress("TOKEN_A_ADDRESS");
        address tokenB = vm.envAddress("TOKEN_B_ADDRESS");

        (address currency0, address currency1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(currency0),
            currency1: Currency.wrap(currency1),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(hook)
        });

        PoolId poolId = poolKey.toId();

        console.log("========== POOL CONFIGURATION ==========");
        console.log("Pool ID:", uint256(PoolId.unwrap(poolId)));
        console.log("Currency0:", currency0);
        console.log("Currency1:", currency1);
        //console.log("Fee:", 3000);
        //console.log("Tick Spacing:", 60);
        console.log("Hook:", hook);
        console.log("");

        // Get pool state using StateLibrary
        (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee) =
            IPoolManager(poolManager).getSlot0(poolId);

        console.log("========== POOL STATE ==========");
        if (sqrtPriceX96 != 0) {
            console.log("Status: Pool EXISTS!");
            console.log("sqrtPriceX96:", sqrtPriceX96);
            console.log("Current Tick:", tick);
            console.log("Protocol Fee:", protocolFee);
            console.log("LP Fee:", lpFee);

            // Get liquidity
            uint128 liquidity = IPoolManager(poolManager).getLiquidity(poolId);
            console.log("Total Liquidity:", liquidity);

            // Calculate approximate price
            // price = (sqrtPriceX96 / 2^96)^2
            // We can't do floating point, so just show the raw value
            console.log("");
            console.log("========== PRICE INFO ==========");
            console.log("sqrtPriceX96 (raw):", sqrtPriceX96);
            console.log("To calculate price: (sqrtPriceX96 / 2^96)^2");
        } else {
            console.log("Status: Pool does NOT exist");
        }

        // Check token balances in PoolManager
        console.log("");
        console.log("========== TOKEN BALANCES IN POOL MANAGER ==========");

        uint256 balance0 = IERC20(currency0).balanceOf(poolManager);
        uint256 balance1 = IERC20(currency1).balanceOf(poolManager);

        console.log("Token0 Balance:", balance0);
        console.log("Token1 Balance:", balance1);

        // Check token info
        console.log("");
        console.log("========== TOKEN INFO ==========");
        try IERC20(currency0).totalSupply() returns (uint256 supply0) {
            console.log("Token0 Total Supply:", supply0);
        } catch {
            console.log("Token0: Could not fetch total supply");
        }

        try IERC20(currency1).totalSupply() returns (uint256 supply1) {
            console.log("Token1 Total Supply:", supply1);
        } catch {
            console.log("Token1: Could not fetch total supply");
        }

        // Check Hook state
        console.log("");
        console.log("========== HOOK INFO ==========");
        console.log("Hook Address:", hook);

        // Try to read trustedSigner from hook
        (bool success, bytes memory data) = hook.staticcall(abi.encodeWithSignature("trustedSigner()"));
        if (success && data.length >= 32) {
            address trustedSigner = abi.decode(data, (address));
            console.log("Trusted Signer:", trustedSigner);
        }

        // Try to read owner from hook
        (success, data) = hook.staticcall(abi.encodeWithSignature("owner()"));
        if (success && data.length >= 32) {
            address owner = abi.decode(data, (address));
            console.log("Hook Owner:", owner);
        }
    }
}
