// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {UniShieldHook} from "../src/UniShieldHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

/**
 * @title DeployUniShieldHook
 * @notice Deployment script for the UniShield KYC Hook
 *
 * Usage:
 *   # Dry run (simulation)
 *   forge script script/DeployUniShieldHook.s.sol --rpc-url <RPC_URL>
 *
 *   # Actual deployment
 *   forge script script/DeployUniShieldHook.s.sol --rpc-url <RPC_URL> --broadcast --private-key <DEPLOYER_PRIVATE_KEY>
 *
 *   # With verification
 *   forge script script/DeployUniShieldHook.s.sol --rpc-url <RPC_URL> --broadcast --verify --etherscan-api-key <API_KEY>
 *
 * Environment variables:
 *   POOL_MANAGER_ADDRESS - Address of the deployed Uniswap v4 PoolManager
 *   TRUSTED_SIGNER       - Address of the TEE signer (from your iApp secret)
 */
contract DeployUniShieldHook is Script {
    // ============ Configuration ============

    // Uniswap v4 PoolManager addresses per network
    // Update these with actual deployed addresses
    address constant POOL_MANAGER_MAINNET = address(0);
    address constant POOL_MANAGER_SEPOLIA = address(0);
    address constant POOL_MANAGER_BASE_SEPOLIA = address(0);

    // Default trusted signer (Hardhat account #0 - FOR TESTING ONLY)
    // Replace this with your actual TEE signer address in production!
    address constant DEFAULT_TRUSTED_SIGNER =
        0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    function run() external {
        // Get configuration from environment or use defaults
        address poolManager = vm.envOr("POOL_MANAGER_ADDRESS", address(0));
        address trustedSigner = vm.envOr(
            "TRUSTED_SIGNER",
            DEFAULT_TRUSTED_SIGNER
        );

        // Validate inputs
        require(poolManager != address(0), "POOL_MANAGER_ADDRESS not set");
        require(trustedSigner != address(0), "TRUSTED_SIGNER not set");

        console.log("=== UniShield Hook Deployment ===");
        console.log("Pool Manager:", poolManager);
        console.log("Trusted Signer:", trustedSigner);
        console.log("");

        // Start broadcasting transactions
        vm.startBroadcast();

        // Deploy the hook
        UniShieldHook hook = new UniShieldHook(
            IPoolManager(poolManager),
            trustedSigner
        );

        vm.stopBroadcast();

        // Log deployment info
        console.log("=== Deployment Complete ===");
        console.log("UniShieldHook deployed to:", address(hook));
        console.log("");
        console.log("Next steps:");
        console.log("1. Verify the contract on block explorer");
        console.log("2. Update your frontend with the hook address");
        console.log("3. Create pools that use this hook");
    }

    /**
     * @notice Helper to deploy to a specific network
     * @param network The network name (mainnet, sepolia, base-sepolia)
     */
    function deployToNetwork(string memory network) external {
        address poolManager;

        if (keccak256(bytes(network)) == keccak256("mainnet")) {
            poolManager = POOL_MANAGER_MAINNET;
        } else if (keccak256(bytes(network)) == keccak256("sepolia")) {
            poolManager = POOL_MANAGER_SEPOLIA;
        } else if (keccak256(bytes(network)) == keccak256("base-sepolia")) {
            poolManager = POOL_MANAGER_BASE_SEPOLIA;
        } else {
            revert("Unknown network");
        }

        require(
            poolManager != address(0),
            "PoolManager not configured for this network"
        );

        // Set env and run
        vm.setEnv("POOL_MANAGER_ADDRESS", vm.toString(poolManager));
        this.run();
    }
}
