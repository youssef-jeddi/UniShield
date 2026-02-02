// script/DeployTokens.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CleanUSD, CleanETH} from "../src/CleanTokens.sol";

contract DeployTokens is Script {
    function run() external {
        vm.startBroadcast();

        CleanUSD cUSD = new CleanUSD();
        CleanETH cETH = new CleanETH();

        console.log("CleanUSD deployed at:", address(cUSD));
        console.log("CleanETH deployed at:", address(cETH));

        // Ensure correct order for Uniswap (token0 < token1)
        if (address(cUSD) < address(cETH)) {
            console.log("Token0 (cUSD):", address(cUSD));
            console.log("Token1 (cETH):", address(cETH));
        } else {
            console.log("Token0 (cETH):", address(cETH));
            console.log("Token1 (cUSD):", address(cUSD));
        }

        vm.stopBroadcast();
    }
}
