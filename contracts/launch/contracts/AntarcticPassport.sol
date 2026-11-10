// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @notice Free, account-bound game passport. No funds, staking or prizes.
/// @dev Metadata is mutable, service-authored, and excludes personal identities.
contract AntarcticPassport is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE=keccak256("MINTER_ROLE");
    bytes32 public constant METADATA_ROLE=keccak256("METADATA_ROLE");
    uint256 public totalIssued;
    string private metadataBase;
    mapping(bytes32=>uint256) public tokenForClaim;
    mapping(address=>uint256) public passportOf;
    mapping(uint256=>bytes32) public metadataRevision;
    event MetadataUpdate(uint256 _tokenId);
    event BatchMetadataUpdate(uint256 _fromTokenId,uint256 _toTokenId);
    error AccountBound(); error ClaimConflict(); error InvalidClaim();
    constructor(address admin,address minter,string memory base) ERC721("Antarctic Passport","AKPASS") {
        if(admin==address(0)||minter==address(0)||bytes(base).length==0)revert InvalidClaim();
        _grantRole(DEFAULT_ADMIN_ROLE,admin);_grantRole(MINTER_ROLE,minter);_grantRole(METADATA_ROLE,minter);metadataBase=base;
    }
    function mintVisa(address recipient,bytes32 claimId) external onlyRole(MINTER_ROLE) returns(uint256 id) {
        if(recipient==address(0)||claimId==bytes32(0))revert InvalidClaim();
        id=tokenForClaim[claimId];if(id!=0){if(ownerOf(id)!=recipient)revert ClaimConflict();return id;}
        if(passportOf[recipient]!=0)revert ClaimConflict();
        id=++totalIssued;tokenForClaim[claimId]=id;passportOf[recipient]=id;_safeMint(recipient,id);
    }
    function tokenURI(uint256 id) public view override returns(string memory) {_requireOwned(id);return string.concat(metadataBase,Strings.toString(id),".json");}
    function setMetadataBase(string calldata base) external onlyRole(DEFAULT_ADMIN_ROLE) {if(bytes(base).length==0)revert InvalidClaim();metadataBase=base;if(totalIssued>0)emit BatchMetadataUpdate(1,totalIssued);}
    function refreshMetadata(uint256 id,bytes32 revision) external onlyRole(METADATA_ROLE) {_requireOwned(id);metadataRevision[id]=revision;emit MetadataUpdate(id);}
    function _update(address to,uint256 id,address auth) internal override returns(address) {if(_ownerOf(id)!=address(0)&&to!=address(0))revert AccountBound();return super._update(to,id,auth);}
    function supportsInterface(bytes4 id) public view override(ERC721,AccessControl) returns(bool) {return id==0x49064906||super.supportsInterface(id);}
}
