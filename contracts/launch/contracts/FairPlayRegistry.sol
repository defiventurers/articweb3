// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Append-only gameplay commitments. Inclusion is not game-rule validation.
/// @dev This contract neither holds player funds nor decides game winners.
contract FairPlayRegistry {
    address public owner;
    address public registrar;
    uint64 public constant MAX_EVENTS = 4000;
    uint64 public constant QUICKNET_GENESIS = 1692803367;
    uint64 public constant QUICKNET_PERIOD = 3;
    struct Match { bytes32 headerHash; uint64 count; bool closed; bytes32[13] frontier; }
    mapping(bytes32 => Match) private matches;
    mapping(bytes32 => mapping(uint64 => bytes32)) public checkpointRoots;
    mapping(bytes32 => mapping(uint64 => bytes32)) public requestHashes;
    mapping(bytes32 => mapping(uint64 => uint64)) public requestRounds;
    mapping(bytes32 => mapping(uint64 => uint256)) public requestBlocks;
    event RegistrarChanged(address indexed previous, address indexed current);
    event MatchRegistered(bytes32 indexed matchId, bytes32 headerHash);
    event RollCommitted(bytes32 indexed matchId, uint64 indexed sequence, bytes32 intentHash, uint64 round, uint64 publishTime);
    event Checkpoint(bytes32 indexed matchId, uint64 indexed count, bytes32 root, bool closed);
    error Unauthorized(); error InvalidMatch(); error MatchClosed(); error InvalidBatch(); error ChangedCommitment(); error RoundNotFuture();
    modifier onlyRegistrar() { if (msg.sender != registrar) revert Unauthorized(); _; }
    constructor(address registrar_) { if (registrar_ == address(0)) revert Unauthorized(); owner = msg.sender; registrar = registrar_; }
    function setRegistrar(address next) external { if(msg.sender != owner || next == address(0)) revert Unauthorized(); emit RegistrarChanged(registrar,next); registrar=next; }
    function matchInfo(bytes32 id) external view returns(bytes32 headerHash,uint64 count,bool closed) { Match storage m=matches[id]; return(m.headerHash,m.count,m.closed); }
    function registerMatch(bytes32 id, bytes32 headerHash) external onlyRegistrar {
        if (id == bytes32(0) || headerHash == bytes32(0)) revert InvalidMatch();
        Match storage m=matches[id];
        if(m.headerHash != bytes32(0)) { if(m.headerHash != headerHash) revert ChangedCommitment(); return; }
        m.headerHash=headerHash; emit MatchRegistered(id,headerHash);
    }
    function commitRoll(bytes32 id,uint64 sequence,bytes32 intentHash,uint64 round) external onlyRegistrar {
        Match storage m=matches[id];
        if(m.headerHash==bytes32(0)||sequence==0||sequence>MAX_EVENTS||intentHash==bytes32(0)||round==0) revert InvalidMatch();
        if(m.closed) revert MatchClosed();
        bytes32 existing=requestHashes[id][sequence];
        if(existing!=bytes32(0)) { if(existing!=intentHash||requestRounds[id][sequence]!=round) revert ChangedCommitment(); return; }
        uint64 publishTime=QUICKNET_GENESIS+(round-1)*QUICKNET_PERIOD;
        if(publishTime<=block.timestamp+2) revert RoundNotFuture();
        requestHashes[id][sequence]=intentHash; requestRounds[id][sequence]=round; requestBlocks[id][sequence]=block.number;
        emit RollCommitted(id,sequence,intentHash,round,publishTime);
    }
    function appendCheckpoint(bytes32 id,bytes32[] calldata hashes,bool close) external onlyRegistrar {
        Match storage m=matches[id];
        if(m.headerHash==bytes32(0)) revert InvalidMatch();
        if(m.closed) revert MatchClosed();
        if(hashes.length>64||m.count+hashes.length>MAX_EVENTS||(hashes.length==0&&(!close||m.count==0))) revert InvalidBatch();
        for(uint256 i=0;i<hashes.length;i++) {
            bytes32 node=_leaf(hashes[i]); uint64 index=m.count; uint8 level;
            while(index&1==1) { node=_parent(m.frontier[level],node); index>>=1; level++; }
            m.frontier[level]=node; m.count++;
        }
        bytes32 root=_root(m); checkpointRoots[id][m.count]=root;
        if(close)m.closed=true;
        emit Checkpoint(id,m.count,root,m.closed);
    }
    function verifyMoveInclusion(bytes32 id,uint64 count,uint64 index,bytes32 eventHash,bytes32[] calldata siblings) external view returns(bool) {
        bytes32 expected=checkpointRoots[id][count];
        if(expected==bytes32(0)||index>=count||siblings.length>13)return false;
        bytes32 node=_leaf(eventHash); uint64 width=count;
        for(uint256 i=0;i<siblings.length;i++) {
            if(width<=1)return false;
            if(index&1==1)node=_parent(siblings[i],node);
            else { if(index+1>=width&&siblings[i]!=node)return false; node=_parent(node,siblings[i]); }
            index>>=1; width=(width+1)/2;
        }
        return width==1&&node==expected;
    }
    function _root(Match storage m) private view returns(bytes32 root) {
        bool seen; uint8 height;
        for(uint8 level=0;level<13;level++)if((uint256(m.count)&(uint256(1)<<level))!=0) {
            if(!seen){root=m.frontier[level];height=level;seen=true;}
            else { while(height<level){root=_parent(root,root);height++;} root=_parent(m.frontier[level],root);height=level+1; }
        }
    }
    function _leaf(bytes32 hash) private pure returns(bytes32){return sha256(abi.encodePacked(bytes1(0),hash));}
    function _parent(bytes32 a,bytes32 b) private pure returns(bytes32){return sha256(abi.encodePacked(bytes1(uint8(1)),a,b));}
}
