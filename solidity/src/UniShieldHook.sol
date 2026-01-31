// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "v4-periphery/src/utils/BaseHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {
    BeforeSwapDelta,
    BeforeSwapDeltaLibrary
} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {
    MessageHashUtils
} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {
    ModifyLiquidityParams,
    SwapParams
} from "@uniswap/v4-core/src/types/PoolOperation.sol";

/**
 * @title UniShieldHook
 * @notice Uniswap v4 Hook that enforces KYC verification before allowing swaps
 * @dev Users must register their KYC attestation (signed by a trusted TEE) before trading
 */
contract UniShieldHook is BaseHook {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice The trusted signer address (derived from TEE's signing key)
    address public immutable trustedSigner;

    /// @notice Contract owner for admin functions
    address public owner;

    /// @notice Mapping of user address to their KYC expiry timestamp
    /// @dev If kycExpiry[user] > block.timestamp, the user is KYC'd
    mapping(address => uint256) public kycExpiry;

    /// @notice Used signatures to prevent replay attacks
    mapping(bytes32 => bool) public usedSignatures;

    /// @notice Emitted when a user successfully registers their KYC
    event KYCRegistered(address indexed user, uint256 expiry);
    event KYCRevoked(address indexed user);

    error NotKYCd();
    error KYCExpired();
    error InvalidSignature();
    error ExpiredAttestation();
    error OnlyPoolManager();
    error OnlyOwner();
    error SignatureAlreadyUsed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(
        IPoolManager _poolManager,
        address _trustedSigner
    ) BaseHook(_poolManager) {
        owner = msg.sender;
        trustedSigner = _trustedSigner;
    }

    /// @notice Define which hook functions this contract implements
    function getHookPermissions()
        public
        pure
        override
        returns (Hooks.Permissions memory)
    {
        return
            Hooks.Permissions({
                beforeInitialize: false,
                afterInitialize: false,
                beforeAddLiquidity: true, // Check KYC before adding liquidity
                afterAddLiquidity: false,
                beforeRemoveLiquidity: false, // Allow anyone to remove (they already passed KYC to add)
                afterRemoveLiquidity: false,
                beforeSwap: true, // Check KYC before swapping
                afterSwap: false,
                beforeDonate: false,
                afterDonate: false,
                beforeSwapReturnDelta: false,
                afterSwapReturnDelta: false,
                afterAddLiquidityReturnDelta: false,
                afterRemoveLiquidityReturnDelta: false
            });
    }

    /**
     * @notice Register KYC status using a TEE-signed attestation
     * @param expiry The expiry timestamp of the KYC attestation
     * @param v Signature component
     * @param r Signature component
     * @param s Signature component
     */
    function registerKYC(
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // Check attestation hasn't already expired
        if (expiry <= block.timestamp) {
            revert ExpiredAttestation();
        }

        // Create signature hash for replay protection
        bytes32 sigHash = keccak256(abi.encodePacked(r, s, v));
        if (usedSignatures[sigHash]) {
            revert SignatureAlreadyUsed();
        }

        // Reconstruct the message hash that the TEE signed
        // Must match: keccak256(abi.encodePacked(userAddress, expiry))
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, expiry));

        // Apply Ethereum signed message prefix (matches Python's encode_defunct)
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();

        // Recover the signer
        address recovered = ECDSA.recover(ethSignedHash, v, r, s);

        if (recovered != trustedSigner) {
            revert InvalidSignature();
        }

        // Mark signature as used
        usedSignatures[sigHash] = true;

        // Store the KYC expiry
        kycExpiry[msg.sender] = expiry;

        emit KYCRegistered(msg.sender, expiry);
    }

    /**
     * @notice Check if a user has valid KYC
     * @param user The address to check
     * @return True if user has valid (non-expired) KYC
     */
    function isKYCValid(address user) public view returns (bool) {
        return kycExpiry[user] > block.timestamp;
    }

    /**
     * @notice Revoke a user's KYC (emergency compliance action)
     * @param user The user to revoke
     */
    function revokeKYC(address user) external onlyOwner {
        kycExpiry[user] = 0;
        emit KYCRevoked(user);
    }

    // ============ Hook Implementation ============

    function _beforeSwap(
        address,
        PoolKey calldata,
        SwapParams calldata,
        bytes calldata
    ) internal view override returns (bytes4, BeforeSwapDelta, uint24) {
        // NOTE: Using tx.origin to get the actual user, not the router
        address user = tx.origin;

        // Check if the user has valid KYC
        if (kycExpiry[user] == 0) {
            revert NotKYCd();
        }
        if (kycExpiry[user] <= block.timestamp) {
            revert KYCExpired();
        }

        return (
            BaseHook.beforeSwap.selector,
            BeforeSwapDeltaLibrary.ZERO_DELTA,
            0
        );
    }

    function _beforeAddLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) internal view override returns (bytes4) {
        // NOTE: Using tx.origin to get the actual user, not the router
        // In production, consider passing user address via hookData for security
        address user = tx.origin;

        // Check if the user has valid KYC
        if (kycExpiry[user] == 0) {
            revert NotKYCd();
        }
        if (kycExpiry[user] <= block.timestamp) {
            revert KYCExpired();
        }
        return BaseHook.beforeAddLiquidity.selector;
    }
}
