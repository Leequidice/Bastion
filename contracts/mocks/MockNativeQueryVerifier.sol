// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/INativeQueryVerifier.sol";

/**
 * @title MockNativeQueryVerifier
 * @notice Test & local simulation implementation of the Attestcoin Block Prover Precompile (0x0FD2).
 * @dev Replicates the behavior and event emissions of the native precompile for offline/local unit tests.
 */
contract MockNativeQueryVerifier is INativeQueryVerifier {
    bool public shouldPass = true;
    mapping(bytes32 => bool) public forcedRejections;

    function setShouldPass(bool _shouldPass) external {
        shouldPass = _shouldPass;
    }

    function setForcedRejection(bytes32 root, bool reject) external {
        forcedRejections[root] = reject;
    }

    function calculateTxIndex(MerkleProof calldata merkleProof) public pure override returns (uint64) {
        uint64 index = 0;
        for (uint256 i = 0; i < merkleProof.siblings.length; i++) {
            if (!merkleProof.siblings[i].isLeft) {
                index |= uint64(1 << i);
            }
        }
        return index;
    }

    function verify(
        uint64,
        uint64,
        bytes calldata,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata
    ) external view override returns (bool) {
        if (!shouldPass || forcedRejections[merkleProof.root]) {
            return false;
        }
        return true;
    }

    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata /* encodedTransaction */,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata /* continuityProof */
    ) external override returns (bool) {
        if (!shouldPass || forcedRejections[merkleProof.root]) {
            revert("MockNativeQueryVerifier: proof verification failed");
        }
        uint64 txIndex = calculateTxIndex(merkleProof);
        emit TransactionVerified(chainKey, height, txIndex);
        return true;
    }
}
