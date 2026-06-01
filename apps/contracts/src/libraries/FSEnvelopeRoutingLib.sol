// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "../errors/EFSEnvelopeRegistry.sol";
import "./FSCommitmentLib.sol";

/// @dev Register-time routing, quorum, and sequential-order validation for FSEnvelopeRegistry.
library FSEnvelopeRoutingLib {
    uint8 internal constant ROUTING_PARALLEL = 0;
    uint8 internal constant ROUTING_SEQUENTIAL = 1;

    function validateRegisterRouting(
        bytes32[] calldata requiredCommitments_,
        bytes32[] calldata optionalCommitments_,
        uint8 routingMode_,
        bytes32[] calldata routingOrder_,
        uint8 quorumN_,
        bytes32[] calldata quorumSet_
    ) internal pure {
        if (requiredCommitments_.length > FSCommitmentLib.MAX_SIGNERS_PER_ENVELOPE)
            revert ExceedsMaxSigners();
        if (optionalCommitments_.length > FSCommitmentLib.MAX_SIGNERS_PER_ENVELOPE)
            revert ExceedsMaxSigners();
        if (
            requiredCommitments_.length + optionalCommitments_.length >
            FSCommitmentLib.MAX_SIGNERS_PER_ENVELOPE
        ) revert ExceedsMaxSigners();
        if (routingOrder_.length > FSCommitmentLib.MAX_SIGNERS_PER_ENVELOPE)
            revert ExceedsMaxSigners();
        if (quorumSet_.length > FSCommitmentLib.MAX_SIGNERS_PER_ENVELOPE)
            revert ExceedsMaxSigners();

        FSCommitmentLib.assertSortedUnique(requiredCommitments_);
        FSCommitmentLib.assertSortedUnique(optionalCommitments_);
        if (requiredCommitments_.length > 0 &&
            optionalCommitments_.length > 0 &&
            optionalCommitments_[0] <=
            requiredCommitments_[requiredCommitments_.length - 1]
        ) {
            for (uint256 i = 0; i < optionalCommitments_.length; i++) {
                for (uint256 j = 0; j < requiredCommitments_.length; j++) {
                    if (optionalCommitments_[i] == requiredCommitments_[j])
                        revert DuplicateCommitment();
                }
            }
        }

        if (routingMode_ > ROUTING_SEQUENTIAL) revert InvalidRoutingConfig();

        if (routingMode_ == ROUTING_SEQUENTIAL) {
            if (routingOrder_.length == 0) revert InvalidRoutingConfig();
            if (
                routingOrder_.length !=
                requiredCommitments_.length + optionalCommitments_.length
            ) revert InvalidRoutingConfig();
            assertMultisetEqual(
                routingOrder_,
                requiredCommitments_,
                optionalCommitments_
            );
        } else if (routingOrder_.length > 0) {
            revert InvalidRoutingConfig();
        }

        if (quorumSet_.length > 0) {
            FSCommitmentLib.assertSortedUnique(quorumSet_);
            if (quorumN_ == 0 || quorumN_ > quorumSet_.length)
                revert InvalidQuorumConfig();
            bytes32[] memory roster = FSCommitmentLib.mergeSortedCommitments(
                requiredCommitments_,
                optionalCommitments_
            );
            for (uint256 i = 0; i < quorumSet_.length; i++) {
                bool inRoster;
                for (uint256 j = 0; j < roster.length; j++) {
                    if (quorumSet_[i] == roster[j]) {
                        inRoster = true;
                        break;
                    }
                }
                if (!inRoster) revert InvalidQuorumConfig();
            }
        } else if (quorumN_ != 0) {
            revert InvalidQuorumConfig();
        }
    }

    function assertMultisetEqual(
        bytes32[] calldata order_,
        bytes32[] calldata required_,
        bytes32[] calldata optional_
    ) private pure {
        bytes32[] memory roster = FSCommitmentLib.mergeSortedCommitments(
            required_,
            optional_
        );
        if (order_.length != roster.length) revert InvalidRoutingConfig();
        for (uint256 i = 0; i < order_.length; i++) {
            bool found;
            for (uint256 j = 0; j < roster.length; j++) {
                if (order_[i] == roster[j]) {
                    found = true;
                    break;
                }
            }
            if (!found) revert InvalidRoutingConfig();
        }
        for (uint256 i = 0; i < roster.length; i++) {
            bool found;
            for (uint256 j = 0; j < order_.length; j++) {
                if (roster[i] == order_[j]) {
                    found = true;
                    break;
                }
            }
            if (!found) revert InvalidRoutingConfig();
        }
    }
}
