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
    error ReentrantCall();
    error DepositsPausedError();
    error LocksPausedError();
    error SettlementPausedError();
    error WithdrawalsPausedError();
    error EntryTooLarge();
    error ActiveLockCapReached();
    error LockNotExpired();

    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    address public owner;
    address public gameServer;

    bool public depositsPaused;
    bool public locksPaused;
    bool public settlementPaused;
    bool public withdrawalsPaused;

    uint256 public maxEntryAmount = 0.05 ether;
    uint256 public maxActiveLocks = 100;
    uint256 public activeLocks;
    uint256 public defaultLockTimeout = 2 hours;

    uint256 private reentrancyStatus = NOT_ENTERED;

    mapping(address => uint256) public availableBalance;
    mapping(address => uint256) public lockedBalance;
    mapping(bytes32 => bool) public matchSettled;
    mapping(bytes32 => mapping(address => uint256)) public lockedEntry;
    mapping(bytes32 => mapping(address => uint256)) public lockDeadline;

    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);
    event GameServerUpdated(address indexed oldGameServer, address indexed newGameServer);
    event Deposited(address indexed player, uint256 amount);
    event Withdrawn(address indexed player, uint256 amount);
    event EntryLocked(bytes32 indexed matchId, address indexed player, uint256 amount, uint256 deadline);
    event EntryReleased(bytes32 indexed matchId, address indexed player, uint256 amount);
    event ExpiredEntryRefunded(bytes32 indexed matchId, address indexed player, uint256 amount);
    event MatchSettled(bytes32 indexed matchId, uint256 totalPayout);
    event DepositsPaused(bool paused);
    event LocksPaused(bool paused);
    event SettlementPaused(bool paused);
    event WithdrawalsPaused(bool paused);
    event MaxEntryAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event MaxActiveLocksUpdated(uint256 oldCap, uint256 newCap);
    event DefaultLockTimeoutUpdated(uint256 oldTimeout, uint256 newTimeout);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyGameServer() {
        if (msg.sender != gameServer) revert NotGameServer();
        _;
    }

    modifier nonReentrant() {
        if (reentrancyStatus == ENTERED) revert ReentrantCall();
        reentrancyStatus = ENTERED;
        _;
        reentrancyStatus = NOT_ENTERED;
    }

    constructor(address initialGameServer) {
        if (initialGameServer == address(0)) revert ZeroAddress();
        owner = msg.sender;
        gameServer = initialGameServer;
        emit OwnerUpdated(address(0), msg.sender);
        emit GameServerUpdated(address(0), initialGameServer);
        emit MaxEntryAmountUpdated(0, maxEntryAmount);
        emit MaxActiveLocksUpdated(0, maxActiveLocks);
        emit DefaultLockTimeoutUpdated(0, defaultLockTimeout);
    }

    receive() external payable {
        deposit();
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

    function setDepositsPaused(bool paused) external onlyOwner {
        depositsPaused = paused;
        emit DepositsPaused(paused);
    }

    function setLocksPaused(bool paused) external onlyOwner {
        locksPaused = paused;
        emit LocksPaused(paused);
    }

    function setSettlementPaused(bool paused) external onlyOwner {
        settlementPaused = paused;
        emit SettlementPaused(paused);
    }

    function setWithdrawalsPaused(bool paused) external onlyOwner {
        withdrawalsPaused = paused;
        emit WithdrawalsPaused(paused);
    }

    function setMaxEntryAmount(uint256 newAmount) external onlyOwner {
        emit MaxEntryAmountUpdated(maxEntryAmount, newAmount);
        maxEntryAmount = newAmount;
    }

    function setMaxActiveLocks(uint256 newCap) external onlyOwner {
        emit MaxActiveLocksUpdated(maxActiveLocks, newCap);
        maxActiveLocks = newCap;
    }

    function setDefaultLockTimeout(uint256 newTimeout) external onlyOwner {
        if (newTimeout == 0) revert ZeroAmount();
        emit DefaultLockTimeoutUpdated(defaultLockTimeout, newTimeout);
        defaultLockTimeout = newTimeout;
    }

    function deposit() public payable nonReentrant {
        if (depositsPaused) revert DepositsPausedError();
        _deposit(msg.sender, msg.value);
    }

    function depositAndLock(bytes32 matchId) external payable nonReentrant {
        if (depositsPaused) revert DepositsPausedError();
        _lockFreshEntry(matchId, msg.sender, msg.value, false);
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (withdrawalsPaused) revert WithdrawalsPausedError();
        if (amount == 0) revert ZeroAmount();
        if (availableBalance[msg.sender] < amount) revert InsufficientAvailableBalance();
        availableBalance[msg.sender] -= amount;
        _sendEth(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function lockEntry(bytes32 matchId, uint256 amount) external nonReentrant {
        if (availableBalance[msg.sender] < amount) revert InsufficientAvailableBalance();
        availableBalance[msg.sender] -= amount;
        _lockFreshEntry(matchId, msg.sender, amount, true);
    }

    function releaseEntry(bytes32 matchId, address player) external onlyGameServer nonReentrant {
        uint256 amount = _clearLockedEntry(matchId, player);
        availableBalance[player] += amount;
        emit EntryReleased(matchId, player, amount);
    }

    function refundExpiredEntry(bytes32 matchId) external nonReentrant {
        if (matchSettled[matchId]) revert MatchAlreadySettled();
        uint256 deadline = lockDeadline[matchId][msg.sender];
        if (deadline == 0 || block.timestamp < deadline) revert LockNotExpired();
        uint256 amount = _clearLockedEntry(matchId, msg.sender);
        availableBalance[msg.sender] += amount;
        emit ExpiredEntryRefunded(matchId, msg.sender, amount);
    }

    function settleMatch(bytes32 matchId, address[4] calldata players, uint256[4] calldata payouts) external onlyGameServer nonReentrant {
        if (settlementPaused) revert SettlementPausedError();
        if (matchSettled[matchId]) revert MatchAlreadySettled();

        uint256 lockedTotal;
        uint256 payoutTotal;

        for (uint256 i = 0; i < 4; i += 1) {
            address player = players[i];
            if (player == address(0)) revert InvalidPlayers();
            for (uint256 j = 0; j < i; j += 1) {
                if (players[j] == player) revert InvalidPlayers();
            }

            uint256 locked = lockedEntry[matchId][player];
            if (locked == 0) revert EntryNotLocked();

            lockedTotal += locked;
            payoutTotal += payouts[i];
        }

        if (payoutTotal != lockedTotal) revert InvalidPayoutTotal();

        matchSettled[matchId] = true;

        for (uint256 i = 0; i < 4; i += 1) {
            address player = players[i];
            _clearLockedEntry(matchId, player);
            if (payouts[i] > 0) {
                availableBalance[player] += payouts[i];
            }
        }

        emit MatchSettled(matchId, payoutTotal);
    }

    function _deposit(address player, uint256 amount) private {
        if (amount == 0) revert ZeroAmount();
        availableBalance[player] += amount;
        emit Deposited(player, amount);
    }

    function _lockFreshEntry(bytes32 matchId, address player, uint256 amount, bool fromAvailableBalance) private {
        if (locksPaused) revert LocksPausedError();
        if (amount == 0) revert ZeroAmount();
        if (maxEntryAmount != 0 && amount > maxEntryAmount) revert EntryTooLarge();
        if (lockedEntry[matchId][player] != 0) revert EntryAlreadyLocked();
        if (maxActiveLocks != 0 && activeLocks >= maxActiveLocks) revert ActiveLockCapReached();

        lockedBalance[player] += amount;
        lockedEntry[matchId][player] = amount;
        lockDeadline[matchId][player] = block.timestamp + defaultLockTimeout;
        activeLocks += 1;

        if (fromAvailableBalance) {
            emit EntryLocked(matchId, player, amount, lockDeadline[matchId][player]);
            return;
        }

        emit EntryLocked(matchId, player, amount, lockDeadline[matchId][player]);
    }

    function _clearLockedEntry(bytes32 matchId, address player) private returns (uint256 amount) {
        amount = lockedEntry[matchId][player];
        if (amount == 0) revert EntryNotLocked();
        lockedEntry[matchId][player] = 0;
        lockDeadline[matchId][player] = 0;
        lockedBalance[player] -= amount;
        if (activeLocks > 0) activeLocks -= 1;
    }

    function _sendEth(address to, uint256 amount) private {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert EthTransferFailed();
    }
}
