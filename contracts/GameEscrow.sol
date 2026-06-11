// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract GameEscrow {
    IERC20 public immutable token;

    mapping(address => uint256) public availableBalance;

    bool private locked;

    event Deposited(address indexed player, uint256 amount);
    event Withdrawn(address indexed player, uint256 amount);

    error InvalidToken();
    error InvalidAmount();
    error TransferFailed();
    error InsufficientBalance();
    error ReentrantCall();

    constructor(address tokenAddress) {
        if (tokenAddress == address(0)) revert InvalidToken();
        token = IERC20(tokenAddress);
    }

    modifier nonReentrant() {
        if (locked) revert ReentrantCall();
        locked = true;
        _;
        locked = false;
    }

    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();

        availableBalance[msg.sender] += amount;

        bool ok = token.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();

        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (availableBalance[msg.sender] < amount) revert InsufficientBalance();

        availableBalance[msg.sender] -= amount;

        bool ok = token.transfer(msg.sender, amount);
        if (!ok) revert TransferFailed();

        emit Withdrawn(msg.sender, amount);
    }

    function escrowTokenBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
