// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
interface IPassport {function passportOf(address) external view returns(uint256);function refreshMetadata(uint256,bytes32) external;}
/// @notice Free transferable achievement/arrival keepsakes, issued after passport.
contract AntarcticKeepsakes is ERC1155,AccessControl {
    bytes32 public constant MINTER_ROLE=keccak256("MINTER_ROLE");
    IPassport public immutable passport;
    mapping(bytes32=>address) public recipientForClaim;
    mapping(bytes32=>uint256) public tokenForClaim;
    error InvalidClaim(); error ClaimConflict(); error PassportFirst();
    constructor(address admin,address minter,address passport_,string memory metadata) ERC1155(metadata){if(admin==address(0)||minter==address(0)||passport_==address(0))revert InvalidClaim();passport=IPassport(passport_);_grantRole(DEFAULT_ADMIN_ROLE,admin);_grantRole(MINTER_ROLE,minter);}
    function mintArrival(address recipient,bytes32 claimId) external onlyRole(MINTER_ROLE){_deliver(recipient,1,claimId);}
    function mintAchievement(address recipient,uint256 tokenId,bytes32 claimId) external onlyRole(MINTER_ROLE){if(tokenId<2)revert InvalidClaim();_deliver(recipient,tokenId,claimId);}
    function _deliver(address recipient,uint256 tokenId,bytes32 claimId) private {
        if(recipient==address(0)||claimId==bytes32(0))revert InvalidClaim();
        if(recipientForClaim[claimId]!=address(0)){if(recipientForClaim[claimId]!=recipient||tokenForClaim[claimId]!=tokenId)revert ClaimConflict();return;}
        uint256 passportId=passport.passportOf(recipient);if(passportId==0)revert PassportFirst();
        recipientForClaim[claimId]=recipient;tokenForClaim[claimId]=tokenId;_mint(recipient,tokenId,1,"");
        passport.refreshMetadata(passportId,sha256(abi.encode(recipient,tokenId,claimId)));
    }
    function supportsInterface(bytes4 id) public view override(ERC1155,AccessControl) returns(bool){return super.supportsInterface(id);}
}
