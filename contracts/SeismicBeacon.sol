// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SeismicBeacon
 * @notice Source chain contract (deployed on Ethereum Sepolia, chainKey: 1)
 * @dev Emits verifiable seismic anomaly events that trigger Colossi incursions in Bastion on Creditcoin.
 */
contract SeismicBeacon {
    event SeismicTremorDetected(
        address indexed observer,
        bytes32 indexed epicenter,
        uint256 tremorMagnitude,
        string geologicalZone,
        uint256 timestamp
    );

    uint256 public totalTremorsRecorded;

    /**
     * @notice Records seismic or Colossus ground tremors on the source chain.
     * @param epicenter Cryptographic identifier or coordinates of the seismic tremor
     * @param tremorMagnitude Severity scale (e.g. 10 to 100)
     * @param geologicalZone The frontier region where tremors originated (e.g. "Crag of Torment")
     */
    function recordSeismicActivity(
        bytes32 epicenter,
        uint256 tremorMagnitude,
        string calldata geologicalZone
    ) external returns (uint256) {
        totalTremorsRecorded++;

        emit SeismicTremorDetected(
            msg.sender,
            epicenter,
            tremorMagnitude,
            geologicalZone,
            block.timestamp
        );

        return totalTremorsRecorded;
    }
}
