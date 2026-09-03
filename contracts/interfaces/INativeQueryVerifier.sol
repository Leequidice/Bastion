// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title INativeQueryVerifier
 * @notice Interface for Creditcoin's Block Prover Precompile at address 0x0000000000000000000000000000000000000FD2.
 * @dev Attestcoin Protocol provides synchronous Merkle & Continuity proof verification
 *      for supported source chains (e.g. Ethereum Sepolia chainKey: 1, Mainnet chainKey: 3).
 */
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

    /// @notice Calculates the transaction index within a block using the provided Merkle proof.
    function calculateTxIndex(MerkleProof calldata merkleProof) external view returns (uint64);

    /// @notice Synchronously verifies a single transaction proof on-chain (read-only view).
    function verify(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (bool);

    /// @notice Synchronously verifies a single transaction proof and emits TransactionVerified event.
    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external returns (bool);
}
