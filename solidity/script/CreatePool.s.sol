// script/CreatePool.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";

contract CreatePool is Script {
    function run() external {
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        address hook = vm.envAddress("HOOK_ADDRESS");
        address tokenA = vm.envAddress("TOKEN_A_ADDRESS");
        address tokenB = vm.envAddress("TOKEN_B_ADDRESS");

        // Ensure tokenA < tokenB (required by Uniswap v4)
        (address currency0, address currency1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(currency0),
            currency1: Currency.wrap(currency1),
            fee: 3000, // 0.3%
            tickSpacing: 60,
            hooks: IHooks(hook) // Your UniShieldHook!
        });

        // Initial price (1:1 for simplicity)
        // sqrtPriceX96 = sqrt(1) * 2^96
        uint160 startingPrice = 79228162514264337593543950336; // 1:1 price

        vm.startBroadcast();

        IPoolManager(poolManager).initialize(poolKey, startingPrice);

        console.log("Pool created!");
        console.log("Currency0:", currency0);
        console.log("Currency1:", currency1);
        console.log("Hook:", hook);

        vm.stopBroadcast();
    }
}
