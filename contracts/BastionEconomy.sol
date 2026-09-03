// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/INativeQueryVerifier.sol";

/**
 * @title BastionEconomy
 * @notice Phase 2: Attested Resource Economy for Bastion on Creditcoin.
 * @dev Dynamic resource scarcity (Stone, Energy, Food, Aegis Alloy) driven by verifiable
 *      cross-chain conditions via Attestcoin Protocol (0x0FD2).
 */
contract BastionEconomy is Ownable {
    address public constant DEFAULT_PRECOMPILE = 0x0000000000000000000000000000000000000FD2;

    INativeQueryVerifier public immutable VERIFIER;

    enum ResourceType {
        Stone,       // Construction of ramparts and bastions
        Energy,      // Powering artillery, shields, and sunstone batteries
        Food,        // Sustaining garrison population and morale
        AegisAlloy   // Heavy high-tier defense fortification
    }

    struct MarketCondition {
        uint256 stonePriceMultiplier;  // Basis points (10000 = 1.0x, 20000 = 2.0x)
        uint256 energyYieldMultiplier; // Basis points (10000 = 1.0x)
        uint256 foodScarcityIndex;     // Basis points (10000 = normal)
        uint64 sourceChain;
        uint64 sourceBlockHeight;
        bytes32 txKey;
        uint256 updatedTimestamp;
        string conditionDescription;
    }

    struct SettlementVault {
        uint256 stone;
        uint256 energy;
        uint256 food;
        uint256 aegisAlloy;
        uint256 lastHarvestTimestamp;
    }

    /// @notice Attested query replay protection for economic updates
    mapping(bytes32 => bool) public processedMarketQueries;

    /// @notice Settlement resource storage for each player/commander
    mapping(address => SettlementVault) public vaults;

    /// @notice Current active cross-chain market condition
    MarketCondition public currentMarket;

    /// @notice Total resources harvested across the realm
    uint256 public totalStoneProduced;
    uint256 public totalEnergyHarvested;

    event MarketShifted(
        uint64 indexed sourceChain,
        uint64 indexed blockHeight,
        bytes32 txKey,
        uint256 stoneMultiplier,
        uint256 energyMultiplier,
        uint256 foodScarcity,
        string description
    );

    event ResourcesHarvested(
        address indexed commander,
        uint256 stone,
        uint256 energy,
        uint256 food
    );

    event ResourcesSpent(
        address indexed commander,
        uint256 stone,
        uint256 energy,
        uint256 food,
        uint256 alloy,
        string purpose
    );

    event ResourceTraded(
        address indexed commander,
        ResourceType indexed fromType,
        ResourceType indexed toType,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(address _verifier) Ownable(msg.sender) {
        if (_verifier == address(0)) {
            VERIFIER = INativeQueryVerifier(DEFAULT_PRECOMPILE);
        } else {
            VERIFIER = INativeQueryVerifier(_verifier);
        }

        // Initialize baseline market (10000 bps = 1.0x baseline)
        currentMarket = MarketCondition({
            stonePriceMultiplier: 10000,
            energyYieldMultiplier: 10000,
            foodScarcityIndex: 10000,
            sourceChain: 0,
            sourceBlockHeight: 0,
            txKey: bytes32(0),
            updatedTimestamp: block.timestamp,
            conditionDescription: "Temperate Equilibrium"
        });
    }

    /**
     * @notice Updates in-game resource scarcity and multipliers using attested cross-chain data.
     * @param chainKey Creditcoin source chain identifier (e.g. 1 = Sepolia, 3 = Mainnet)
     * @param blockHeight Foreign block height
     * @param encodedTransaction ABI-encoded transaction bytes from source chain
     * @param merkleProof Inclusion proof within source block header
     * @param continuityProof Continuity proof linking to Creditcoin consensus
     */
    function updateAttestedMarket(
        uint64 chainKey,
        uint64 blockHeight,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external returns (bool) {
        // 1. Calculate transaction index
        uint64 txIndex = VERIFIER.calculateTxIndex(merkleProof);

        // 2. Generate unique market query key
        bytes32 txKey = keccak256(abi.encodePacked("MARKET", chainKey, blockHeight, txIndex));
        require(!processedMarketQueries[txKey], "BastionEconomy: market query already processed");

        // 3. Verify proof via Attestcoin Block Prover Precompile
        bool verified = VERIFIER.verifyAndEmit(
            chainKey,
            blockHeight,
            encodedTransaction,
            merkleProof,
            continuityProof
        );
        require(verified, "BastionEconomy: Attestcoin proof verification failed");

        // 4. Mark query as processed
        processedMarketQueries[txKey] = true;

        // 5. Derive deterministic market volatility from the verified data
        bytes32 seed = keccak256(abi.encodePacked(txKey, merkleProof.root, continuityProof.lowerEndpointDigest));
        
        uint256 volatilityTier = uint256(seed) % 4;
        uint256 stoneMultiplier;
        uint256 energyMultiplier;
        uint256 foodScarcity;
        string memory desc;

        if (volatilityTier == 0) {
            // Seismic Collapse: Stone prices surge due to cave-ins; Sunstone geysers erupt
            stoneMultiplier = 16000;  // 1.6x stone cost
            energyMultiplier = 14000; // 1.4x energy yield
            foodScarcity = 11000;     // 1.1x food cost
            desc = "Subterranean Tremors: Quarry Collapse & Geyser Surge";
        } else if (volatilityTier == 1) {
            // Calm Skies: Plentiful grain, normal extraction
            stoneMultiplier = 9000;   // 0.9x discount
            energyMultiplier = 10000; // 1.0x baseline
            foodScarcity = 8000;      // 0.8x food abundance
            desc = "Solar Zenith: Bountiful Harvest & Stable Quarries";
        } else if (volatilityTier == 2) {
            // Arcane Tempest: Energy surges, crops withered
            stoneMultiplier = 10000;  // 1.0x
            energyMultiplier = 18000; // 1.8x energy surge
            foodScarcity = 15000;     // 1.5x severe food drought
            desc = "Arcane Tempest: High Energy Radiation & Blighted Crops";
        } else {
            // Iron Lode Discovery: Stone and alloy abundance
            stoneMultiplier = 7500;   // 0.75x stone discount
            energyMultiplier = 9000;  // 0.9x
            foodScarcity = 10000;     // 1.0x
            desc = "Deep Bedrock Discovery: Rich Stone & Alloy Vein Found";
        }

        currentMarket = MarketCondition({
            stonePriceMultiplier: stoneMultiplier,
            energyYieldMultiplier: energyMultiplier,
            foodScarcityIndex: foodScarcity,
            sourceChain: chainKey,
            sourceBlockHeight: blockHeight,
            txKey: txKey,
            updatedTimestamp: block.timestamp,
            conditionDescription: desc
        });

        emit MarketShifted(
            chainKey,
            blockHeight,
            txKey,
            stoneMultiplier,
            energyMultiplier,
            foodScarcity,
            desc
        );

        return true;
    }

    /**
     * @notice Initialize or harvest resources for a commander based on active market yields.
     */
    function harvestResources() external returns (uint256 stoneGained, uint256 energyGained, uint256 foodGained) {
        SettlementVault storage vault = vaults[msg.sender];

        // Base yields scaled by market condition
        uint256 timeDelta = block.timestamp - vault.lastHarvestTimestamp;
        if (vault.lastHarvestTimestamp == 0 || timeDelta > 3600) {
            timeDelta = 3600; // Cap single harvest to 1 hour equivalent
        }

        // Base harvest units: 100 stone, 80 energy, 120 food per harvest cycle
        stoneGained = (100 * 10000) / currentMarket.stonePriceMultiplier;
        energyGained = (80 * currentMarket.energyYieldMultiplier) / 10000;
        foodGained = (120 * 10000) / currentMarket.foodScarcityIndex;

        vault.stone += stoneGained;
        vault.energy += energyGained;
        vault.food += foodGained;
        vault.lastHarvestTimestamp = block.timestamp;

        totalStoneProduced += stoneGained;
        totalEnergyHarvested += energyGained;

        emit ResourcesHarvested(msg.sender, stoneGained, energyGained, foodGained);
    }

    /**
     * @notice Allows commanders to construct or repair city defenses using attested resources.
     */
    function spendResources(
        uint256 stoneNeeded,
        uint256 energyNeeded,
        uint256 foodNeeded,
        uint256 alloyNeeded,
        string calldata purpose
    ) external returns (bool) {
        SettlementVault storage vault = vaults[msg.sender];
        require(vault.stone >= stoneNeeded, "BastionEconomy: insufficient Stone");
        require(vault.energy >= energyNeeded, "BastionEconomy: insufficient Energy");
        require(vault.food >= foodNeeded, "BastionEconomy: insufficient Food");
        require(vault.aegisAlloy >= alloyNeeded, "BastionEconomy: insufficient Aegis Alloy");

        vault.stone -= stoneNeeded;
        vault.energy -= energyNeeded;
        vault.food -= foodNeeded;
        vault.aegisAlloy -= alloyNeeded;

        emit ResourcesSpent(msg.sender, stoneNeeded, energyNeeded, foodNeeded, alloyNeeded, purpose);
        return true;
    }

    /**
     * @notice Credits battle bounty directly to commander's vault (called after defeating a Colossus).
     */
    function creditBounty(address commander, uint256 stone, uint256 energy, uint256 alloy) external onlyOwner {
        SettlementVault storage vault = vaults[commander];
        vault.stone += stone;
        vault.energy += energy;
        vault.aegisAlloy += alloy;
    }

    /**
     * @notice Trade resources through the market according to current cross-chain exchange rates.
     */
    function trade(ResourceType fromType, ResourceType toType, uint256 amountIn) external returns (uint256 amountOut) {
        require(fromType != toType, "BastionEconomy: cannot trade same resource");
        require(amountIn > 0, "BastionEconomy: invalid amount");
        SettlementVault storage vault = vaults[msg.sender];

        // Deduct source
        if (fromType == ResourceType.Stone) {
            require(vault.stone >= amountIn, "BastionEconomy: insufficient Stone");
            vault.stone -= amountIn;
        } else if (fromType == ResourceType.Energy) {
            require(vault.energy >= amountIn, "BastionEconomy: insufficient Energy");
            vault.energy -= amountIn;
        } else if (fromType == ResourceType.Food) {
            require(vault.food >= amountIn, "BastionEconomy: insufficient Food");
            vault.food -= amountIn;
        } else {
            require(vault.aegisAlloy >= amountIn, "BastionEconomy: insufficient Alloy");
            vault.aegisAlloy -= amountIn;
        }

        // Apply cross-chain exchange formula (e.g. 5% trading fee + market multiplier)
        uint256 netInput = (amountIn * 95) / 100;
        amountOut = netInput; // Base 1:1 parity with 5% slip fee

        // Credit target
        if (toType == ResourceType.Stone) {
            vault.stone += amountOut;
        } else if (toType == ResourceType.Energy) {
            vault.energy += amountOut;
        } else if (toType == ResourceType.Food) {
            vault.food += amountOut;
        } else {
            vault.aegisAlloy += amountOut;
        }

        emit ResourceTraded(msg.sender, fromType, toType, amountIn, amountOut);
    }

    /**
     * @notice Read commander vault balances.
     */
    function getVault(address commander) external view returns (SettlementVault memory) {
        return vaults[commander];
    }
}
