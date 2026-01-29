// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {UniShieldHook} from "../src/UniShieldHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";

contract UniShieldHookTest is Test {
    UniShieldHook public hook;

    // Test signer (Hardhat account #0)
    uint256 constant SIGNER_PRIVATE_KEY =
        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    address constant TRUSTED_SIGNER =
        0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    // Test user (Hardhat account #1)
    address constant USER = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    // Mock pool manager
    address constant MOCK_POOL_MANAGER = address(0x1234);

    function setUp() public {
        hook = new UniShieldHook(
            IPoolManager(MOCK_POOL_MANAGER),
            TRUSTED_SIGNER
        );
    }

    function test_RegisterKYC_ValidSignature() public {
        // Arrange
        uint256 expiry = block.timestamp + 30 days;

        // Create the message hash (same as Python iApp)
        bytes32 messageHash = keccak256(abi.encodePacked(USER, expiry));
        bytes32 ethSignedHash = _toEthSignedMessageHash(messageHash);

        // Sign it with the trusted signer's private key
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            SIGNER_PRIVATE_KEY,
            ethSignedHash
        );

        // Act - register KYC as the user
        vm.prank(USER);
        hook.registerKYC(expiry, v, r, s);

        // Assert
        assertTrue(hook.isKYCValid(USER));
        assertEq(hook.kycExpiry(USER), expiry);
    }

    function test_RegisterKYC_InvalidSignature() public {
        // Arrange
        uint256 expiry = block.timestamp + 30 days;

        // Sign with wrong key (not the trusted signer)
        uint256 wrongKey = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        bytes32 messageHash = keccak256(abi.encodePacked(USER, expiry));
        bytes32 ethSignedHash = _toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, ethSignedHash);

        // Act & Assert - should revert
        vm.prank(USER);
        vm.expectRevert(UniShieldHook.InvalidSignature.selector);
        hook.registerKYC(expiry, v, r, s);
    }

    function test_RegisterKYC_ExpiredAttestation() public {
        // Arrange - attestation already expired
        uint256 expiry = block.timestamp - 1;

        bytes32 messageHash = keccak256(abi.encodePacked(USER, expiry));
        bytes32 ethSignedHash = _toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            SIGNER_PRIVATE_KEY,
            ethSignedHash
        );

        // Act & Assert
        vm.prank(USER);
        vm.expectRevert(UniShieldHook.ExpiredAttestation.selector);
        hook.registerKYC(expiry, v, r, s);
    }

    function test_RegisterKYC_WrongUser() public {
        // Arrange - signature is for USER but different address tries to use it
        uint256 expiry = block.timestamp + 30 days;
        address wrongUser = address(0xdead);

        // Sign for the original USER
        bytes32 messageHash = keccak256(abi.encodePacked(USER, expiry));
        bytes32 ethSignedHash = _toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            SIGNER_PRIVATE_KEY,
            ethSignedHash
        );

        // Act & Assert - wrongUser tries to register with USER's signature
        vm.prank(wrongUser);
        vm.expectRevert(UniShieldHook.InvalidSignature.selector);
        hook.registerKYC(expiry, v, r, s);
    }

    function test_IsKYCValid_NotRegistered() public view {
        assertFalse(hook.isKYCValid(USER));
    }

    function test_IsKYCValid_Expired() public {
        // First register valid KYC
        uint256 expiry = block.timestamp + 1 hours;
        bytes32 messageHash = keccak256(abi.encodePacked(USER, expiry));
        bytes32 ethSignedHash = _toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            SIGNER_PRIVATE_KEY,
            ethSignedHash
        );

        vm.prank(USER);
        hook.registerKYC(expiry, v, r, s);
        assertTrue(hook.isKYCValid(USER));

        // Warp time past expiry
        vm.warp(expiry + 1);
        assertFalse(hook.isKYCValid(USER));
    }

    function test_BeforeSwap_KYCValid() public {
        // Register valid KYC
        uint256 expiry = block.timestamp + 30 days;
        bytes32 messageHash = keccak256(abi.encodePacked(USER, expiry));
        bytes32 ethSignedHash = _toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            SIGNER_PRIVATE_KEY,
            ethSignedHash
        );

        vm.prank(USER);
        hook.registerKYC(expiry, v, r, s);

        // Call beforeSwap as pool manager
        vm.prank(MOCK_POOL_MANAGER);
        (bytes4 selector, , ) = hook.beforeSwap(
            USER,
            _createMockPoolKey(),
            IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: 1e18,
                sqrtPriceLimitX96: 0
            }),
            ""
        );

        assertEq(selector, IHooks.beforeSwap.selector);
    }

    function test_BeforeSwap_NotKYCd() public {
        // Don't register KYC, try to swap
        vm.prank(MOCK_POOL_MANAGER);
        vm.expectRevert(UniShieldHook.NotKYCd.selector);
        hook.beforeSwap(
            USER,
            _createMockPoolKey(),
            IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: 1e18,
                sqrtPriceLimitX96: 0
            }),
            ""
        );
    }

    function test_BeforeSwap_KYCExpired() public {
        // Register KYC that expires soon
        uint256 expiry = block.timestamp + 1 hours;
        bytes32 messageHash = keccak256(abi.encodePacked(USER, expiry));
        bytes32 ethSignedHash = _toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            SIGNER_PRIVATE_KEY,
            ethSignedHash
        );

        vm.prank(USER);
        hook.registerKYC(expiry, v, r, s);

        // Warp past expiry
        vm.warp(expiry + 1);

        // Try to swap
        vm.prank(MOCK_POOL_MANAGER);
        vm.expectRevert(UniShieldHook.KYCExpired.selector);
        hook.beforeSwap(
            USER,
            _createMockPoolKey(),
            IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: 1e18,
                sqrtPriceLimitX96: 0
            }),
            ""
        );
    }

    // ============ beforeAddLiquidity Tests ============

    function test_BeforeAddLiquidity_KYCValid() public {
        // Register valid KYC
        uint256 expiry = block.timestamp + 30 days;
        bytes32 messageHash = keccak256(abi.encodePacked(USER, expiry));
        bytes32 ethSignedHash = _toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            SIGNER_PRIVATE_KEY,
            ethSignedHash
        );

        vm.prank(USER);
        hook.registerKYC(expiry, v, r, s);

        // Call beforeAddLiquidity as pool manager
        vm.prank(MOCK_POOL_MANAGER);
        bytes4 selector = hook.beforeAddLiquidity(
            USER,
            _createMockPoolKey(),
            IPoolManager.ModifyLiquidityParams({
                tickLower: -100,
                tickUpper: 100,
                liquidityDelta: 1e18,
                salt: bytes32(0)
            }),
            ""
        );

        assertEq(selector, IHooks.beforeAddLiquidity.selector);
    }

    function test_BeforeAddLiquidity_NotKYCd() public {
        // Don't register KYC, try to add liquidity
        vm.prank(MOCK_POOL_MANAGER);
        vm.expectRevert(UniShieldHook.NotKYCd.selector);
        hook.beforeAddLiquidity(
            USER,
            _createMockPoolKey(),
            IPoolManager.ModifyLiquidityParams({
                tickLower: -100,
                tickUpper: 100,
                liquidityDelta: 1e18,
                salt: bytes32(0)
            }),
            ""
        );
    }

    function test_BeforeAddLiquidity_KYCExpired() public {
        // Register KYC that expires soon
        uint256 expiry = block.timestamp + 1 hours;
        bytes32 messageHash = keccak256(abi.encodePacked(USER, expiry));
        bytes32 ethSignedHash = _toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            SIGNER_PRIVATE_KEY,
            ethSignedHash
        );

        vm.prank(USER);
        hook.registerKYC(expiry, v, r, s);

        // Warp past expiry
        vm.warp(expiry + 1);

        // Try to add liquidity
        vm.prank(MOCK_POOL_MANAGER);
        vm.expectRevert(UniShieldHook.KYCExpired.selector);
        hook.beforeAddLiquidity(
            USER,
            _createMockPoolKey(),
            IPoolManager.ModifyLiquidityParams({
                tickLower: -100,
                tickUpper: 100,
                liquidityDelta: 1e18,
                salt: bytes32(0)
            }),
            ""
        );
    }

    // ============ Helper Functions ============

    function _toEthSignedMessageHash(
        bytes32 hash
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
            );
    }

    function _createMockPoolKey() internal pure returns (PoolKey memory) {
        return
            PoolKey({
                currency0: Currency.wrap(address(0x1)),
                currency1: Currency.wrap(address(0x2)),
                fee: 3000,
                tickSpacing: 60,
                hooks: IHooks(address(0))
            });
    }
}
