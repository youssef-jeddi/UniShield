// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
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

/**
 * @title UniShieldHook
 * @notice Uniswap v4 Hook that enforces KYC verification before allowing swaps
 * @dev Users must register their KYC attestation (signed by a trusted TEE) before trading
 */
contract UniShieldHook is IHooks {
    using PoolIdLibrary for PoolKey;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice The pool manager
    IPoolManager public immutable poolManager;

    /// @notice The trusted signer address (derived from TEE's signing key)
    address public immutable trustedSigner;

    /// @notice Mapping of user address to their KYC expiry timestamp
    /// @dev If kycExpiry[user] > block.timestamp, the user is KYC'd
    mapping(address => uint256) public kycExpiry;

    /// @notice Emitted when a user successfully registers their KYC
    event KYCRegistered(address indexed user, uint256 expiry);

    error NotKYCd();
    error KYCExpired();
    error InvalidSignature();
    error ExpiredAttestation();
    error OnlyPoolManager();

    modifier onlyPoolManager() {
        if (msg.sender != address(poolManager)) revert OnlyPoolManager();
        _;
    }

    constructor(IPoolManager _poolManager, address _trustedSigner) {
        poolManager = _poolManager;
        trustedSigner = _trustedSigner;
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

    // ============ Hook Implementation ============

    function beforeSwap(
        address sender,
        PoolKey calldata,
        IPoolManager.SwapParams calldata,
        bytes calldata
    )
        external
        view
        override
        onlyPoolManager
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        // Check if the sender has valid KYC
        if (kycExpiry[sender] == 0) {
            revert NotKYCd();
        }
        if (kycExpiry[sender] <= block.timestamp) {
            revert KYCExpired();
        }

        return (
            IHooks.beforeSwap.selector,
            BeforeSwapDeltaLibrary.ZERO_DELTA,
            0
        );
    }

    // ============ Unused Hooks (required by interface) ============

    function beforeInitialize(
        address,
        PoolKey calldata,
        uint160
    ) external pure override returns (bytes4) {
        return IHooks.beforeInitialize.selector;
    }

    function afterInitialize(
        address,
        PoolKey calldata,
        uint160,
        int24
    ) external pure override returns (bytes4) {
        return IHooks.afterInitialize.selector;
    }

    function beforeAddLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.beforeAddLiquidity.selector;
    }

    function afterAddLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        return (IHooks.afterAddLiquidity.selector, BalanceDelta.wrap(0));
    }

    function beforeRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.beforeRemoveLiquidity.selector;
    }

    function afterRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        return (IHooks.afterRemoveLiquidity.selector, BalanceDelta.wrap(0));
    }

    function afterSwap(
        address,
        PoolKey calldata,
        IPoolManager.SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, int128) {
        return (IHooks.afterSwap.selector, 0);
    }

    function beforeDonate(
        address,
        PoolKey calldata,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.beforeDonate.selector;
    }

    function afterDonate(
        address,
        PoolKey calldata,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.afterDonate.selector;
    }
}
