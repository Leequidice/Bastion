// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BastionStructures
 * @notice Phase 3: Attested Structure State (ERC-721) for Bastion on Creditcoin.
 * @dev Represents key defensive structures (Ramparts, Ballistas, Sunstone Pylons) as on-chain assets.
 *      Structure state (Intact, Damaged, Destroyed) is written as verifiable state,
 *      allowing interoperability and verification by external contracts/games without a bridge.
 */
contract BastionStructures is ERC721URIStorage, Ownable {
    enum StructureType {
        Rampart,        // Aegis stone wall segment (absorbs siege damage)
        BallistaTower,  // Artillery counter-battery (ranged kinetic damage)
        SunstonePylon,  // Shield projector and electrical disruption
        CitadelCore     // Settlement command keep
    }

    enum StructureCondition {
        Intact,     // 100% operational
        Damaged,    // 50% operational, requires repairs
        Destroyed   // 0% operational, breached
    }

    struct StructureData {
        uint256 id;
        StructureType structureType;
        StructureCondition condition;
        uint16 level;
        uint32 gridX;
        uint32 gridY;
        uint256 maxDurability;
        uint256 currentDurability;
        uint256 defensePower;
        uint256 lastAttestedBlock;
        bytes32 stateAttestationHash;
    }

    uint256 private _nextTokenId;

    /// @notice Structure metadata by token ID
    mapping(uint256 => StructureData) public structures;

    /// @notice Authorized game engines (e.g. IncursionEngine) that can apply battle damage
    mapping(address => bool) public authorizedCallers;

    event StructureErected(
        uint256 indexed tokenId,
        address indexed commander,
        StructureType structureType,
        uint32 gridX,
        uint32 gridY,
        uint256 defensePower,
        bytes32 stateAttestationHash
    );

    event StructureDamaged(
        uint256 indexed tokenId,
        StructureCondition newCondition,
        uint256 durabilityRemaining,
        bytes32 newStateAttestationHash
    );

    event StructureRepaired(
        uint256 indexed tokenId,
        uint256 durabilityRestored,
        bytes32 newStateAttestationHash
    );

    event StructureUpgraded(
        uint256 indexed tokenId,
        uint16 newLevel,
        uint256 newDefensePower,
        bytes32 newStateAttestationHash
    );

    modifier onlyAuthorized() {
        require(msg.sender == owner() || authorizedCallers[msg.sender], "BastionStructures: unauthorized");
        _;
    }

    constructor() ERC721("Bastion Fortification Structure", "BASTION") Ownable(msg.sender) {}

    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }

    /**
     * @notice Constructs a new fortification structure token on the settlement grid.
     */
    function erectStructure(
        address commander,
        StructureType sType,
        uint32 gridX,
        uint32 gridY,
        string calldata tokenURI_
    ) external returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(commander, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        uint256 maxDur;
        uint256 defPower;

        if (sType == StructureType.Rampart) {
            maxDur = 1500;
            defPower = 100;
        } else if (sType == StructureType.BallistaTower) {
            maxDur = 800;
            defPower = 450;
        } else if (sType == StructureType.SunstonePylon) {
            maxDur = 600;
            defPower = 600;
        } else {
            maxDur = 3000;
            defPower = 300;
        }

        bytes32 attestationHash = _computeAttestationHash(
            tokenId,
            sType,
            StructureCondition.Intact,
            1,
            maxDur,
            defPower,
            block.number
        );

        structures[tokenId] = StructureData({
            id: tokenId,
            structureType: sType,
            condition: StructureCondition.Intact,
            level: 1,
            gridX: gridX,
            gridY: gridY,
            maxDurability: maxDur,
            currentDurability: maxDur,
            defensePower: defPower,
            lastAttestedBlock: block.number,
            stateAttestationHash: attestationHash
        });

        emit StructureErected(tokenId, commander, sType, gridX, gridY, defPower, attestationHash);
    }

    /**
     * @notice Inflicts damage from Colossus incursions, updating attested condition.
     */
    function applyBattleDamage(uint256 tokenId, uint256 damage) external onlyAuthorized returns (StructureCondition) {
        require(tokenId < _nextTokenId, "BastionStructures: invalid token ID");
        StructureData storage s = structures[tokenId];

        if (damage >= s.currentDurability) {
            s.currentDurability = 0;
            s.condition = StructureCondition.Destroyed;
        } else {
            s.currentDurability -= damage;
            if (s.currentDurability <= s.maxDurability / 2) {
                s.condition = StructureCondition.Damaged;
            }
        }

        s.lastAttestedBlock = block.number;
        s.stateAttestationHash = _computeAttestationHash(
            tokenId,
            s.structureType,
            s.condition,
            s.level,
            s.currentDurability,
            s.defensePower,
            block.number
        );

        emit StructureDamaged(tokenId, s.condition, s.currentDurability, s.stateAttestationHash);
        return s.condition;
    }

    /**
     * @notice Repairs damaged structures to full operational condition.
     */
    function repairStructure(uint256 tokenId) external returns (bool) {
        require(ownerOf(tokenId) == msg.sender || authorizedCallers[msg.sender], "BastionStructures: not owner");
        StructureData storage s = structures[tokenId];
        require(s.currentDurability < s.maxDurability, "BastionStructures: already at full durability");

        s.currentDurability = s.maxDurability;
        s.condition = StructureCondition.Intact;
        s.lastAttestedBlock = block.number;
        s.stateAttestationHash = _computeAttestationHash(
            tokenId,
            s.structureType,
            s.condition,
            s.level,
            s.maxDurability,
            s.defensePower,
            block.number
        );

        emit StructureRepaired(tokenId, s.maxDurability, s.stateAttestationHash);
        return true;
    }

    /**
     * @notice Upgrades structure level and defense output.
     */
    function upgradeStructure(uint256 tokenId) external returns (uint16 newLevel) {
        require(ownerOf(tokenId) == msg.sender, "BastionStructures: not owner");
        StructureData storage s = structures[tokenId];
        require(s.condition == StructureCondition.Intact, "BastionStructures: must be intact to upgrade");

        s.level += 1;
        s.maxDurability = (s.maxDurability * 13) / 10;
        s.currentDurability = s.maxDurability;
        s.defensePower = (s.defensePower * 14) / 10;
        s.lastAttestedBlock = block.number;
        s.stateAttestationHash = _computeAttestationHash(
            tokenId,
            s.structureType,
            s.condition,
            s.level,
            s.maxDurability,
            s.defensePower,
            block.number
        );

        emit StructureUpgraded(tokenId, s.level, s.defensePower, s.stateAttestationHash);
        return s.level;
    }

    /**
     * @notice Cryptographically hashes structure state for cross-contract or cross-game verification.
     */
    function _computeAttestationHash(
        uint256 tokenId,
        StructureType sType,
        StructureCondition condition,
        uint16 level,
        uint256 durability,
        uint256 defPower,
        uint256 blockNum
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            "BASTION_STRUCTURE_STATE",
            tokenId,
            uint8(sType),
            uint8(condition),
            level,
            durability,
            defPower,
            blockNum
        ));
    }

    /**
     * @notice Verification primitive: queryable state attestation for external contracts/games.
     */
    function getAttestedStructureState(uint256 tokenId) external view returns (
        StructureType sType,
        StructureCondition condition,
        uint16 level,
        uint256 durability,
        uint256 defensePower,
        uint256 blockHeight,
        bytes32 attestationHash
    ) {
        require(tokenId < _nextTokenId, "BastionStructures: invalid token ID");
        StructureData memory s = structures[tokenId];
        return (
            s.structureType,
            s.condition,
            s.level,
            s.currentDurability,
            s.defensePower,
            s.lastAttestedBlock,
            s.stateAttestationHash
        );
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }
}
