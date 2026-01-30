// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {UniShieldHook} from "../src/UniShieldHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {HookMiner} from "v4-periphery/src/utils/HookMiner.sol";

/**
 * @title DeployUniShieldHook
 * @notice Deployment script for the UniShield KYC Hook
 *
 * Usage:
 *   forge script script/DeployUniShieldHook.s.sol:DeployUniShieldHook \
 *     --broadcast --rpc-url <RPC_URL> --account <ACCOUNT>
 *
 * Environment variables:
 *   POOL_MANAGER_ADDRESS - Address of the deployed Uniswap v4 PoolManager
 *   TRUSTED_SIGNER       - Address of the TEE signer (from your iApp secret)
 */
contract DeployUniShieldHook is Script {
    // CREATE2 Deployer Proxy - Foundry routes CREATE2 deployments through this
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    // Default trusted signer (Hardhat account #0 - FOR TESTING ONLY)
    address constant DEFAULT_TRUSTED_SIGNER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    function run() external {
        // Get configuration from environment
        address poolManager = vm.envOr("POOL_MANAGER_ADDRESS", address(0));
        address trustedSigner = vm.envOr("TRUSTED_SIGNER", DEFAULT_TRUSTED_SIGNER);

        // Validate inputs
        require(poolManager != address(0), "POOL_MANAGER_ADDRESS not set");
        require(trustedSigner != address(0), "TRUSTED_SIGNER not set");

        console.log("=== UniShield Hook Deployment ===");
        console.log("Pool Manager:", poolManager);
        console.log("Trusted Signer:", trustedSigner);
        console.log("");

        // Calculate the flags for our hook (beforeSwap + beforeAddLiquidity)
        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG);

        // Prepare constructor args
        bytes memory constructorArgs = abi.encode(IPoolManager(poolManager), trustedSigner);

        // Mine for a valid hook address using the CREATE2 Deployer Proxy
        // Foundry routes all CREATE2 deployments through this proxy
        console.log("Mining for valid hook address...");
        (address hookAddress, bytes32 salt) = HookMiner.find(
            CREATE2_DEPLOYER,
            flags,
            type(UniShieldHook).creationCode,
            constructorArgs
        );

        console.log("Found valid address:", hookAddress);
        console.log("Salt:", vm.toString(salt));
        console.log("");

        // Start broadcasting transactions
        vm.startBroadcast();

        // Deploy the hook using CREATE2 (Foundry will route through CREATE2_DEPLOYER)
        UniShieldHook hook = new UniShieldHook{salt: salt}(
            IPoolManager(poolManager),
            trustedSigner
        );

        vm.stopBroadcast();

        // Verify the address matches
        require(address(hook) == hookAddress, "Hook address mismatch");

        // Log deployment info
        console.log("=== Deployment Complete ===");
        console.log("UniShieldHook deployed to:", address(hook));
        console.log("");
        console.log("Next steps:");
        console.log("1. Verify the contract on block explorer");
        console.log("2. Update your frontend with the hook address");
        console.log("3. Create pools that use this hook");
    }
}
