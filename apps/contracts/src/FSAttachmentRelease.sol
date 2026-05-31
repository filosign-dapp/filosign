// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./errors/EFSPaymentValidator.sol";
import "./interfaces/IFSFileRegistry.sol";

/// @notice Signature-conditional supplementary packet release (Teams Pro). Review-only packets stay off-chain.
contract FSAttachmentRelease is ReentrancyGuard {
    uint8 internal constant MAX_ATTACHMENT_RECIPIENTS = 32;
    uint8 internal constant MAX_RULE_COMMITMENTS = 128;
    uint8 internal constant MAX_RULES_PER_CID = 128;

    enum ReleaseType {
        AllSigned,
        SpecificSigner,
        AtLeastN,
        AllRequiredSigned,
        AllSignedComplete,
        QuorumRequired,
        QuorumSet,
        QuorumAll,
        AllOfSet
    }

    struct AttachmentRule {
        bytes32 cidId;
        address sender;
        bytes32 packetContentHash;
        bytes20 recipientsCommitment;
        ReleaseType releaseType;
        bytes32 specificSignerCommitment;
        uint8 thresholdN;
        uint64 expiresAt;
        bool released;
        bool cancelled;
    }

    IFSFileRegistry public immutable fileRegistry;
    uint256 public immutable deploymentChainId;

    uint256 public nextRuleId;
    mapping(uint256 ruleId => AttachmentRule) public rules;
    mapping(uint256 ruleId => bytes32[]) private _ruleSignerCommitments;
    mapping(bytes32 cidId => uint256[]) private _ruleIdsByCid;

    event AttachmentRuleRegistered(
        uint256 indexed ruleId,
        bytes32 indexed cidId,
        address indexed sender,
        bytes20 recipientsCommitment,
        bytes32 packetContentHash,
        ReleaseType releaseType
    );

    event AttachmentRuleCancelled(uint256 indexed ruleId, bytes32 indexed cidId);

    event AttachmentReleased(
        uint256 indexed ruleId,
        bytes32 indexed cidId,
        bytes20 recipientsCommitment,
        bytes32 packetContentHash
    );

    constructor(address fileRegistry_, uint256 deploymentChainId_) {
        if (fileRegistry_ == address(0)) {
            revert InvalidReleaseConfig();
        }
        fileRegistry = IFSFileRegistry(fileRegistry_);
        deploymentChainId = deploymentChainId_;
        if (block.chainid != deploymentChainId_) {
            revert InvalidReleaseConfig();
        }
    }

    function registerAttachmentRule(
        bytes32 cidId_,
        bytes32 packetContentHash_,
        ReleaseType releaseType_,
        bytes32 specificSignerCommitment_,
        uint8 thresholdN_,
        uint64 expiresAt_,
        bytes32[] calldata signerCommitments_,
        bytes32[] calldata recipientEmailCommitments_
    ) external returns (uint256 ruleId) {
        IFSFileRegistry.FileRegistrationView memory reg = fileRegistry
            .fileRegistrations(cidId_);
        if (reg.timestamp == 0) revert FileNotRegistered();
        if (msg.sender != reg.sender) revert UnauthorizedRuleRegistration();
        if (packetContentHash_ == bytes32(0)) revert InvalidReleaseConfig();
        if (
            recipientEmailCommitments_.length == 0 ||
            recipientEmailCommitments_.length > MAX_ATTACHMENT_RECIPIENTS
        ) revert InvalidReleaseConfig();

        _validateReleaseConfig(
            releaseType_,
            specificSignerCommitment_,
            thresholdN_,
            signerCommitments_
        );
        if (releaseType_ == ReleaseType.QuorumRequired) {
            _validateQuorumRequiredThreshold(cidId_, thresholdN_);
        }
        if (releaseType_ == ReleaseType.QuorumAll) {
            _validateQuorumAllThreshold(cidId_, thresholdN_);
        }
        _validateExpiresAt(expiresAt_);
        _validateRecipientCommitments(recipientEmailCommitments_);

        if (_ruleIdsByCid[cidId_].length >= MAX_RULES_PER_CID) {
            revert ExceedsMaxCommitments();
        }

        bytes20 recipientsCommitment = fileRegistry.computeEmailSignerCommitment(
            recipientEmailCommitments_
        );

        ruleId = nextRuleId++;
        AttachmentRule storage rule = rules[ruleId];
        rule.cidId = cidId_;
        rule.sender = reg.sender;
        rule.packetContentHash = packetContentHash_;
        rule.recipientsCommitment = recipientsCommitment;
        rule.releaseType = releaseType_;
        rule.specificSignerCommitment = specificSignerCommitment_;
        rule.thresholdN = thresholdN_;
        rule.expiresAt = expiresAt_;

        if (_needsCommitmentList(releaseType_)) {
            _storeSignerCommitments(ruleId, signerCommitments_);
        }

        _ruleIdsByCid[cidId_].push(ruleId);

        emit AttachmentRuleRegistered(
            ruleId,
            cidId_,
            reg.sender,
            recipientsCommitment,
            packetContentHash_,
            releaseType_
        );
    }

    function cancelAttachmentRule(uint256 ruleId) external nonReentrant {
        AttachmentRule storage rule = rules[ruleId];
        if (rule.sender == address(0)) revert InvalidPayer();
        if (msg.sender != rule.sender) revert UnauthorizedRuleRegistration();
        if (rule.released) revert RuleAlreadyExecuted();
        if (rule.cancelled) revert RuleAlreadyCancelled();
        _assertRequiredSigningNotStarted(rule.cidId);
        rule.cancelled = true;
        emit AttachmentRuleCancelled(ruleId, rule.cidId);
    }

    function executeAttachmentRelease(
        uint256 ruleId
    ) external nonReentrant {
        AttachmentRule storage rule = rules[ruleId];
        if (rule.released || rule.cancelled) revert RuleNotExecutable();
        if (!_releaseConditionsMet(ruleId, rule)) revert RuleNotExecutable();
        if (rule.expiresAt != 0 && block.timestamp > rule.expiresAt) {
            revert RuleNotExecutable();
        }
        rule.released = true;
        emit AttachmentReleased(
            ruleId,
            rule.cidId,
            rule.recipientsCommitment,
            rule.packetContentHash
        );
    }

    function canRelease(uint256 ruleId) external view returns (bool) {
        AttachmentRule storage rule = rules[ruleId];
        if (rule.released || rule.cancelled || rule.sender == address(0)) {
            return false;
        }
        if (rule.expiresAt != 0 && block.timestamp > rule.expiresAt) {
            return false;
        }
        return _releaseConditionsMet(ruleId, rule);
    }

    function signerCommitments(
        uint256 ruleId
    ) external view returns (bytes32[] memory) {
        return _ruleSignerCommitments[ruleId];
    }

    function ruleIdsForCid(
        bytes32 cidId_
    ) external view returns (uint256[] memory) {
        return _ruleIdsByCid[cidId_];
    }

    function _validateRecipientCommitments(
        bytes32[] calldata commitments_
    ) private pure {
        for (uint256 i = 0; i < commitments_.length; i++) {
            if (commitments_[i] == bytes32(0)) revert InvalidReleaseConfig();
            for (uint256 j = 0; j < i; j++) {
                if (commitments_[j] >= commitments_[i]) {
                    revert InvalidReleaseConfig();
                }
            }
        }
    }

    function _validateExpiresAt(uint64 expiresAt_) private view {
        if (expiresAt_ != 0 && expiresAt_ <= block.timestamp) {
            revert InvalidReleaseConfig();
        }
    }

    function _storeSignerCommitments(
        uint256 ruleId,
        bytes32[] calldata signerCommitments_
    ) private {
        if (signerCommitments_.length > MAX_RULE_COMMITMENTS) {
            revert ExceedsMaxCommitments();
        }
        bytes32[] storage stored = _ruleSignerCommitments[ruleId];
        for (uint256 i = 0; i < signerCommitments_.length; i++) {
            bytes32 commitment = signerCommitments_[i];
            if (commitment == bytes32(0)) revert InvalidReleaseConfig();
            for (uint256 j = 0; j < i; j++) {
                if (signerCommitments_[j] == commitment) {
                    revert InvalidReleaseConfig();
                }
            }
            stored.push(commitment);
        }
    }

    function _needsCommitmentList(
        ReleaseType releaseType_
    ) private pure returns (bool) {
        return releaseType_ == ReleaseType.AtLeastN ||
            releaseType_ == ReleaseType.QuorumSet ||
            releaseType_ == ReleaseType.AllOfSet;
    }

    function _validateReleaseConfig(
        ReleaseType releaseType_,
        bytes32 specificSignerCommitment_,
        uint8 thresholdN_,
        bytes32[] calldata signerCommitments_
    ) private pure {
        if (releaseType_ == ReleaseType.SpecificSigner) {
            if (specificSignerCommitment_ == bytes32(0)) {
                revert InvalidReleaseConfig();
            }
            return;
        }
        if (
            releaseType_ == ReleaseType.AtLeastN ||
            releaseType_ == ReleaseType.QuorumSet
        ) {
            if (
                thresholdN_ == 0 ||
                signerCommitments_.length == 0 ||
                thresholdN_ > signerCommitments_.length
            ) revert InvalidReleaseConfig();
            return;
        }
        if (releaseType_ == ReleaseType.AllOfSet) {
            if (signerCommitments_.length == 0) revert InvalidReleaseConfig();
            return;
        }
        if (releaseType_ == ReleaseType.QuorumAll) {
            if (thresholdN_ == 0) revert InvalidReleaseConfig();
            return;
        }
        if (releaseType_ == ReleaseType.QuorumRequired) {
            if (thresholdN_ == 0) revert InvalidReleaseConfig();
            return;
        }
    }

    function _assertRequiredSigningNotStarted(bytes32 cidId_) private view {
        if (
            fileRegistry.fileRegistrations(cidId_).requiredSignaturesCount > 0
        ) revert RequiredSigningStarted();
    }

    function _validateQuorumRequiredThreshold(
        bytes32 cidId_,
        uint8 thresholdN_
    ) private view {
        IFSFileRegistry.FileRegistrationView memory reg = fileRegistry
            .fileRegistrations(cidId_);
        if (reg.quorumN > 0) {
            if (thresholdN_ != reg.quorumN) revert InvalidReleaseConfig();
            return;
        }
        if (thresholdN_ == 0 || thresholdN_ > reg.requiredSignersCount) {
            revert InvalidReleaseConfig();
        }
    }

    function _validateQuorumAllThreshold(
        bytes32 cidId_,
        uint8 thresholdN_
    ) private view {
        IFSFileRegistry.FileRegistrationView memory reg = fileRegistry
            .fileRegistrations(cidId_);
        if (thresholdN_ == 0 || thresholdN_ > reg.signersCount) {
            revert InvalidReleaseConfig();
        }
    }

    function _releaseConditionsMet(
        uint256 ruleId,
        AttachmentRule storage rule
    ) private view returns (bool) {
        bytes32 cidId = rule.cidId;
        ReleaseType rt = rule.releaseType;

        if (rt == ReleaseType.AllSigned || rt == ReleaseType.AllRequiredSigned) {
            return fileRegistry.allRequiredSigned(cidId);
        }
        if (rt == ReleaseType.AllSignedComplete) {
            return fileRegistry.allSigned(cidId);
        }
        if (rt == ReleaseType.SpecificSigner) {
            return fileRegistry.hasSigned(cidId, rule.specificSignerCommitment);
        }
        if (rt == ReleaseType.QuorumRequired) {
            IFSFileRegistry.FileRegistrationView memory reg = fileRegistry
                .fileRegistrations(cidId);
            if (reg.quorumN > 0) {
                return fileRegistry.quorumMet(cidId);
            }
            return reg.requiredSignaturesCount >= rule.thresholdN;
        }
        if (rt == ReleaseType.QuorumAll) {
            return fileRegistry.rosterSignedCount(cidId) >= rule.thresholdN;
        }

        bytes32[] storage commitments = _ruleSignerCommitments[ruleId];
        if (rt == ReleaseType.AllOfSet) {
            for (uint256 i = 0; i < commitments.length; i++) {
                if (!fileRegistry.hasSigned(cidId, commitments[i])) return false;
            }
            return commitments.length > 0;
        }

        uint8 signed;
        for (uint256 i = 0; i < commitments.length; i++) {
            if (fileRegistry.hasSigned(cidId, commitments[i])) {
                signed++;
                if (signed >= rule.thresholdN) return true;
            }
        }
        return false;
    }
}
