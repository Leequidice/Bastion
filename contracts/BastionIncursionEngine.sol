// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/INativeQueryVerifier.sol";

/**
 * @title BastionIncursionEngine
 * @notice Core Attestcoin Smart Contract (ASC) for Bastion on Creditcoin.
 * @dev Validates foreign chain state via Attestcoin Block Prover Precompile (0x0FD2),
 *      deterministically generating provably fair Colossi incursions against the walled city.
 */
contract BastionIncursionEngine is Ownable {
    /// @notice Address of the Attestcoin Block Prover Precompile
    address public constant DEFAULT_PRECOMPILE = 0x0000000000000000000000000000000000000FD2;

    INativeQueryVerifier public immutable VERIFIER;

    enum ColossusArchetype {
        Mountainbreaker, // Heavy blunt siege, damages outer ramparts
        DreadStrider,    // Agile towering beast, targets defensive towers
        IroncladGorger,  // Armored behemoth, threatens grain & fuel reserves
        TempestGoliath   // Electrical titan, disrupts sunstone defense grid
    }

    enum IncursionStatus {
        Approaching,     // Detected on radar, marching toward the walls
        Engaged,         // At the perimeter, actively battering defenses
        Repelled,        // Successfully defeated by player fortifications
        Breached         // Overwhelmed defenses, caused city collateral damage
    }

    struct Incursion {
        uint256 id;
        uint64 sourceChain;        // e.g. 1 = Ethereum Sepolia, 3 = Ethereum Mainnet
        uint64 sourceBlockHeight;
        uint64 transactionIndex;
        bytes32 txKey;
        ColossusArchetype archetype;
        uint32 severity;          // 1 to 5 scale
        uint256 maxHp;
        uint256 currentHp;
        uint256 siegePower;       // Damage inflicted if not neutralized
        uint256 stoneReward;
        uint256 energyReward;
        uint256 detectedTimestamp;
        IncursionStatus status;
        address defender;         // Player who engaged or repelled
    }

    /// @notice Replay protection mapping ensuring external transactions are processed exactly once
    mapping(bytes32 => bool) public processedQueries;

    /// @notice Historical records of all incursions
    Incursion[] public incursions;

    /// @notice Total Colossi repelled by defenders
    uint256 public totalRepelled;
    /// @notice Total breaches suffered by the settlement
    uint256 public totalBreached;

    // Events as mandated by hackathon brief & game state loop
    event IncursionTriggered(
        uint256 indexed incursionId,
        uint8 colossusType,
        uint32 severity,
        uint64 indexed sourceChain,
        uint64 indexed blockHeight,
        bytes32 txKey,
        uint256 colossusHp,
        uint256 siegePower
    );

    event IncursionDefended(
        uint256 indexed incursionId,
        address indexed defender,
        uint256 defensePowerUsed,
        uint256 colossusHpRemaining,
        bool wasDefeated,
        uint256 stoneBounty,
        uint256 energyBounty
    );

    event IncursionBreach(
        uint256 indexed incursionId,
        uint256 damageInflicted
    );

    /**
     * @param _verifier Custom verifier address (pass address(0) to use official 0x0FD2 precompile)
     */
    constructor(address _verifier) Ownable(msg.sender) {
        if (_verifier == address(0)) {
            VERIFIER = INativeQueryVerifier(DEFAULT_PRECOMPILE);
        } else {
            VERIFIER = INativeQueryVerifier(_verifier);
        }
    }

    /**
     * @notice Primary Attestcoin entry point: verifies external source chain proof and triggers Colossus incursion.
     * @param chainKey Creditcoin identifier for source chain (e.g. 1 = Sepolia, 3 = Mainnet)
     * @param blockHeight Foreign block height where event/transaction occurred
     * @param encodedTransaction ABI-encoded transaction bytes from the source chain
     * @param merkleProof Inclusion proof within the source block header
     * @param continuityProof Continuity proof anchoring the source block to Creditcoin consensus
     * @return incursionId The created incursion identifier
     */
    function triggerIncursionCheck(
        uint64 chainKey,
        uint64 blockHeight,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external returns (uint256 incursionId) {
        // 1. Calculate transaction index from Merkle proof path
        uint64 txIndex = VERIFIER.calculateTxIndex(merkleProof);

        // 2. Compute deterministic, collision-resistant transaction key
        bytes32 txKey = keccak256(abi.encodePacked(chainKey, blockHeight, txIndex));
        require(!processedQueries[txKey], "Bastion: incursion query already processed");

        // 3. Verify proof synchronously with the Attestcoin Block Prover Precompile
        bool verified = VERIFIER.verifyAndEmit(
            chainKey,
            blockHeight,
            encodedTransaction,
            merkleProof,
            continuityProof
        );
        require(verified, "Bastion: Attestcoin proof verification failed");

        // 4. Mark query as processed (replay protection)
        processedQueries[txKey] = true;

        // 5. Deterministically derive Colossus attributes from the verified cross-chain proof data
        bytes32 seed = keccak256(abi.encodePacked(txKey, merkleProof.root, continuityProof.lowerEndpointDigest));

        incursionId = incursions.length;
        ColossusArchetype archetype = ColossusArchetype(uint8(uint256(seed) % 4));
        uint32 severity = uint32((uint256(seed >> 8) % 5) + 1); // 1 to 5 stars
        uint256 hp = (severity * 2000) + ((uint256(seed >> 16) % 500));
        uint256 siege = (severity * 100) + ((uint256(seed >> 24) % 60));
        uint256 stoneBounty = severity * 75;
        uint256 energyBounty = severity * 40;

        incursions.push(Incursion({
            id: incursionId,
            sourceChain: chainKey,
            sourceBlockHeight: blockHeight,
            transactionIndex: txIndex,
            txKey: txKey,
            archetype: archetype,
            severity: severity,
            maxHp: hp,
            currentHp: hp,
            siegePower: siege,
            stoneReward: stoneBounty,
            energyReward: energyBounty,
            detectedTimestamp: block.timestamp,
            status: IncursionStatus.Approaching,
            defender: address(0)
        }));

        emit IncursionTriggered(
            incursionId,
            uint8(archetype),
            severity,
            chainKey,
            blockHeight,
            txKey,
            hp,
            siege
        );
    }

    /**
     * @notice Defender mounts resistance using city artillery, balistas, and sunstone batteries.
     * @param incursionId Identifier of the approaching Colossus
     * @param defensePower Total attack value mustered by the defender's active towers
     */
    function defendIncursion(uint256 incursionId, uint256 defensePower) external returns (bool defeated) {
        require(incursionId < incursions.length, "Bastion: invalid incursion ID");
        Incursion storage inc = incursions[incursionId];
        require(
            inc.status == IncursionStatus.Approaching || inc.status == IncursionStatus.Engaged,
            "Bastion: incursion already resolved"
        );

        inc.defender = msg.sender;

        if (defensePower >= inc.currentHp) {
            // Colossus vanquished
            inc.currentHp = 0;
            inc.status = IncursionStatus.Repelled;
            totalRepelled++;
            defeated = true;
        } else {
            // Colossus damaged but continues assault
            inc.currentHp -= defensePower;
            inc.status = IncursionStatus.Engaged;
            defeated = false;
        }

        emit IncursionDefended(
            incursionId,
            msg.sender,
            defensePower,
            inc.currentHp,
            defeated,
            defeated ? inc.stoneReward : 0,
            defeated ? inc.energyReward : 0
        );
    }

    /**
     * @notice Resolves an unhalted assault where the Colossus reaches the inner perimeter.
     * @param incursionId Incursion identifier
     */
    function resolveBreach(uint256 incursionId) external returns (uint256 damageInflicted) {
        require(incursionId < incursions.length, "Bastion: invalid incursion ID");
        Incursion storage inc = incursions[incursionId];
        require(inc.status == IncursionStatus.Engaged || inc.status == IncursionStatus.Approaching, "Bastion: already resolved");

        inc.status = IncursionStatus.Breached;
        totalBreached++;
        damageInflicted = inc.siegePower;

        emit IncursionBreach(incursionId, damageInflicted);
    }

    /**
     * @notice Helper to inspect total incursion count
     */
    function getIncursionsCount() external view returns (uint256) {
        return incursions.length;
    }

    /**
     * @notice Helper to fetch recent incursions
     */
    function getRecentIncursions(uint256 limit) external view returns (Incursion[] memory) {
        uint256 count = incursions.length;
        if (limit == 0 || limit > count) {
            limit = count;
        }
        Incursion[] memory results = new Incursion[](limit);
        for (uint256 i = 0; i < limit; i++) {
            results[i] = incursions[count - 1 - i];
        }
        return results;
    }
}
