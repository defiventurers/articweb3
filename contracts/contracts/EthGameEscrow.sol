// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract EthGameEscrow {
    error NotOwner();
    error NotGameServer();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientAvailableBalance();
    error EntryAlreadyLocked();
    error EntryNotLocked();
    error InvalidPlayers();
    error InvalidPayoutTotal();
    error MatchAlreadySettled();
    error EthTransferFailed();

    address public owner;
    address public gameServer;

    mapping(address => uint256) public availableBalance;
    mapping(address => uint256) public lockedBalance;
    mapping(bytes32 => bool) public matchSettled;
    mapping(bytes32 => mapping(address => uint256)) public lockedEntry;

    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);
    event GameServerUpdated(address indexed oldGameServer, address indexed newGameServer);
    event Deposited(address indexed player, uint256 amount);
    event Withdrawn(address indexed player, uint256 amount);
    event EntryLocked(bytes32 indexed matchId, address indexed player, uint256 amount);
    event EntryReleased(bytes32 indexed matchId, address indexed player, uint256 amount);
    event MatchSettled(bytes32 indexed matchId, uint256 totalPayout);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyGameServer() {
        if (msg.sender != gameServer) revert NotGameServer();
        _;
    }

    constructor(address initialGameServer) {
        if (initialGameServer == address(0)) revert ZeroAddress();
        owner = msg.sender;
        gameServer = initialGameServer;
        emit OwnerUpdated(address(0), msg.sender);
        emit GameServerUpdated(address(0), initialGameServer);
    }

    receive() external payable {
        _deposit(msg.sender, msg.value);
    }

    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerUpdated(owner, newOwner);
        owner = newOwner;
    }

    function setGameServer(address newGameServer) external onlyOwner {
        if (newGameServer == address(0)) revert ZeroAddress();
        emit GameServerUpdated(gameServer, newGameServer);
        gameServer = newGameServer;
    }

    function deposit() external payable {
        _deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (availableBalance[msg.sender] < amount) revert InsufficientAvailableBalance();
        availableBalance[msg.sender] -= amount;
        _sendEth(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function lockEntry(bytes32 matchId, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (lockedEntry[matchId][msg.sender] != 0) revert EntryAlreadyLocked();
        if (availableBalance[msg.sender] < amount) revert InsufficientAvailableBalance();
        availableBalance[msg.sender] -= amount;
        lockedBalance[msg.sender] += amount;
        lockedEntry[matchId][msg.sender] = amount;
        emit EntryLocked(matchId, msg.sender, amount);
    }

    function releaseEntry(bytes32 matchId, address player) external onlyGameServer {
        uint256 amount = lockedEntry[matchId][player];
        if (amount == 0) revert EntryNotLocked();
        lockedEntry[matchId][player] = 0;
        lockedBalance[player] -= amount;
        availableBalance[player] += amount;
        emit EntryReleased(matchId, player, amount);
    }

    function settleMatch(bytes32 matchId, address[4] calldata players, uint256[4] calldata payouts) external onlyGameServer {
        if (matchSettled[matchId]) revert MatchAlreadySettled();

        uint256 lockedTotal;
        uint256 payoutTotal;

        for (uint256 i = 0; i < 4; i += 1) {
            address player = players[i];
            if (player == address(0)) revert InvalidPlayers();

            uint256 locked = lockedEntry[matchId][player];
            if (locked == 0) revert EntryNotLocked();

            lockedEntry[matchId][player] = 0;
            lockedBalance[player] -= locked;
            lockedTotal += locked;
            payoutTotal += payouts[i];
        }

        if (payoutTotal != lockedTotal) revert InvalidPayoutTotal();

        matchSettled[matchId] = true;

        for (uint256 i = 0; i < 4; i += 1) {
            if (payouts[i] > 0) {
                availableBalance[players[i]] += payouts[i];
            }
        }

        emit MatchSettled(matchId, payoutTotal);
    }

    function _deposit(address player, uint256 amount) private {
        if (amount == 0) revert ZeroAmount();
        availableBalance[player] += amount;
        emit Deposited(player, amount);
    }

    function _sendEth(address to, uint256 amount) private {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert EthTransferFailed();
    }
}
