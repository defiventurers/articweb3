// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

interface IFoundingPassport { function passportOf(address) external view returns (uint256); }

/// @notice Exactly 33 unique founding Mystery Golden Eggs; one per verified Passport wallet.
/// @dev NFTs are free collectibles, with no promise of prizes, redemption or financial value.
contract AntarcticMysteryEgg is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint8 public constant MAX_EDITION = 33;
    IFoundingPassport public immutable passport;
    uint8 public mintedCount;
    string private metadataBase;
    mapping(bytes32 => uint256) public tokenForClaim;
    mapping(address => uint256) public eggOf;
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);
    error InvalidClaim();
    error ClaimConflict();
    error SoldOut();
    error PassportRequired();

    constructor(address admin, address minter, address passportAddress, string memory base)
        ERC721("Antarctic Mystery Golden Egg", "AKMYST33")
    {
        if (admin == address(0) || minter == address(0) || passportAddress == address(0) || bytes(base).length == 0) revert InvalidClaim();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        passport = IFoundingPassport(passportAddress);
        metadataBase = base;
    }

    function mintEgg(address recipient, bytes32 claimId, uint8 edition) external onlyRole(MINTER_ROLE) returns (uint256) {
        if (recipient == address(0) || claimId == bytes32(0) || edition == 0 || edition > MAX_EDITION) revert InvalidClaim();
        uint256 existing = tokenForClaim[claimId];
        if (existing != 0) {
            if (existing != edition || ownerOf(existing) != recipient) revert ClaimConflict();
            return existing;
        }
        if (passport.passportOf(recipient) == 0) revert PassportRequired();
        if (eggOf[recipient] != 0 || _ownerOf(edition) != address(0)) revert ClaimConflict();
        if (mintedCount == MAX_EDITION) revert SoldOut();
        tokenForClaim[claimId] = edition;
        eggOf[recipient] = edition;
        mintedCount++;
        _safeMint(recipient, edition);
        return edition;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat(metadataBase, Strings.toString(tokenId), ".json");
    }

    function setMetadataBase(string calldata base) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (bytes(base).length == 0) revert InvalidClaim();
        metadataBase = base;
        if (mintedCount != 0) emit BatchMetadataUpdate(1, MAX_EDITION);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return interfaceId == 0x49064906 || super.supportsInterface(interfaceId);
    }
}
