# BASTION // Technical Architecture & Attestcoin Protocol Integration

## 1. System Overview
Bastion is an Attestcoin-native city builder deployed on Creditcoin (EVM-compatible layer-1). It leverages Creditcoin's **Block Prover Precompile (`0x0FD2`)** to read verifiable data from external chains (such as Ethereum Sepolia, `chainKey: 1`) synchronously in a single block.

```
+-------------------------------------------------------------+
|                  Ethereum Sepolia (ChainKey 1)             |
|  - SeismicBeacon.sol emits SeismicTremorDetected events     |
|  - Or arbitrary transactions / oracle events                 |
+-------------------------------------------------------------+
                              |
                              | Attestation Consensus & Proof Builder
                              v
+-------------------------------------------------------------+
|             Attestcoin Protocol Proof Pipeline              |
|  - Transaction Merkle Proof (Siblings in Tx tree)            |
|  - Continuity Proof (Chain of roots anchoring to attestation)|
+-------------------------------------------------------------+
                              |
                              | Direct synchronous call
                              v
+-------------------------------------------------------------+
|               Creditcoin Testnet (Chain ID 102031)          |
|                                                             |
|   Block Prover Precompile (0x0FD2)                          |
|      ▲                                                      |
|      │ verifyAndEmit(chainKey, height, txBytes, merkle, cont)|
|      │                                                      |
|   BastionIncursionEngine.sol (ASC Contract)                 |
|      - Replay Protection (processedQueries[txKey])          |
|      - Deterministic Colossus Derivation                    |
|      - Combat & Breach Resolution                           |
|                                                             |
|   BastionEconomy.sol                                        |
|      - Cross-chain market volatility & multipliers          |
|      - Vault resource management (Stone, Energy, Food)      |
|                                                             |
|   BastionStructures.sol (ERC-721)                           |
|      - Tokenized defensive ramparts & artillery towers      |
|      - Cryptographic state attestation hashes               |
+-------------------------------------------------------------+
```

---

## 2. Attestcoin Precompile Interface (`INativeQueryVerifier`)
Located at address `0x0000000000000000000000000000000000000FD2`, the precompile exposes synchronous methods to verify inclusion and continuity proofs without asynchronous oracle delay:

```solidity
interface INativeQueryVerifier {
    struct MerkleProofEntry {
        bytes32 hash;
        bool isLeft;
    }

    struct MerkleProof {
        bytes32 root;
        MerkleProofEntry[] siblings;
    }

    struct ContinuityProof {
        bytes32 lowerEndpointDigest;
        bytes32[] roots;
    }

    event TransactionVerified(
        uint64 indexed chainKey,
        uint64 indexed height,
        uint64 transactionIndex
    );

    function calculateTxIndex(MerkleProof calldata merkleProof) external view returns (uint64);

    function verify(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (bool);

    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external returns (bool);
}
```

---

## 3. Cryptographic Incursion Derivation
To ensure incursions are **provably fair and immune to miner or contract-owner manipulation**, the Colossus attributes are deterministically derived from the verified proof parameters:

$$\text{txKey} = \text{keccak256}(\text{chainKey}, \text{blockHeight}, \text{txIndex})$$

$$\text{seed} = \text{keccak256}(\text{txKey}, \text{merkleRoot}, \text{lowerEndpointDigest})$$

From this cryptographic seed:
- **Colossus Archetype:** $\text{uint8}(\text{uint256}(\text{seed}) \pmod 4)$
  - `0`: Mountainbreaker (Siege blunt damage against walls)
  - `1`: Dread Strider (High agility tower slayer)
  - `2`: Ironclad Gorger (Devours settlement ore & grain)
  - `3`: Tempest Goliath (EMP lightning disruption)
- **Threat Severity:** $1 + (\text{uint256}(\text{seed} \gg 8) \pmod 5)$ (1 to 5 Stars)
- **Health Points:** $\text{Severity} \times 2000 + (\text{uint256}(\text{seed} \gg 16) \pmod{500})$
- **Siege Power:** $\text{Severity} \times 100 + (\text{uint256}(\text{seed} \gg 24) \pmod{60})$

---

## 4. Replay Attack Prevention
To prevent an attacker from repeatedly submitting the same source chain transaction to spawn multiple identical incursions or trigger repeated market shifts:
```solidity
bytes32 txKey = keccak256(abi.encodePacked(chainKey, blockHeight, txIndex));
require(!processedQueries[txKey], "Bastion: incursion query already processed");
...
processedQueries[txKey] = true;
```

---

## 5. Gas Economics & Verification Cost Analysis
According to the official Attestcoin protocol documentation:
$$\text{CTC Cost} \approx 2.3 \times 10^{-5} + 2.9 \times 10^{-7} \times (\text{continuityHashCount}) \text{ CTC}$$

* **Single Block / Recent Tx (10-block continuity):**
  $$\text{CTC Cost} \approx 2.3 \times 10^{-5} + 2.9 \times 10^{-6} \approx 2.59 \times 10^{-5} \text{ CTC}$$
  ($< \$0.0001 \text{ USD}$)
* **Checkpoint Tx (1,000-block continuity):**
  $$\text{CTC Cost} \approx 3.13 \times 10^{-4} \text{ CTC}$$
* **Execution Latency:**
  The precompile executes native Rust logic inside the Creditcoin node, completing synchronous verification in **one single block** ($\sim 15$ seconds).
