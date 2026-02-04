// script/CreatePoolWithPrice.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";

contract CreatePoolWithPrice is Script {
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
            fee: 500, // 0.05%
            tickSpacing: 10, // tick spacing for 0.05% fee tier
            hooks: IHooks(hook)
        });

        // Set your desired ETH price here
        // cETH (0x7ca...) < cUSD (0xfff...), so currency0 = cETH, currency1 = cUSD
        // price = cUSD/cETH = 2500, sqrtPriceX96 = sqrt(2500) * 2^96
        uint160 startingPrice = 3961408125713216879677197516800; // 1 ETH = $2500

        vm.startBroadcast();

        IPoolManager(poolManager).initialize(poolKey, startingPrice);

        console.log("Pool created with realistic ETH price!");
        console.log("Currency0 (cETH):", currency0);
        console.log("Currency1 (cUSD):", currency1);
        console.log("Hook:", hook);
        console.log("Fee: 500 (0.05%)");
        console.log("Tick Spacing: 10");
        console.log("Starting sqrtPriceX96:", startingPrice);
        console.log("This represents approximately 1 ETH = $2500");

        vm.stopBroadcast();
    }
}
