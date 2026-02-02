// src/tokens/CleanPoolTokens.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Clean USD - A stablecoin for CleanPool demo
contract CleanUSD is ERC20 {
    constructor() ERC20("Clean USD", "cUSD") {
        _mint(msg.sender, 1_000_000 * 10 ** 18); // 1M tokens
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @notice Clean ETH - Wrapped ETH for CleanPool demo
contract CleanETH is ERC20 {
    constructor() ERC20("Clean ETH", "cETH") {
        _mint(msg.sender, 1_000_000 * 10 ** 18); // 1M tokens
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
