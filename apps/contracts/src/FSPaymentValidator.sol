// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./errors/EFSPaymentValidator.sol";
import "./interfaces/IFSFileRegistry.sol";

contract FSPaymentValidator is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint8 internal constant MAX_PAYOUT_LEGS = 32;
    uint8 internal constant MAX_RULE_COMMITMENTS = 128;

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

    struct PayoutLeg {
        address recipient;
        uint256 amount;
    }

    struct PaymentRule {
        address payer;
        address token;
        bytes32 cidId;
        ReleaseType releaseType;
        bytes32 specificSignerCommitment;
        uint8 thresholdN;
        uint64 expiresAt;
        bool executed;
        bool cancelled;
    }

    IFSFileRegistry public immutable fileRegistry;
    uint256 public immutable deploymentChainId;

    uint256 public nextRuleId;
    mapping(uint256 ruleId => PaymentRule) public rules;
    mapping(uint256 ruleId => PayoutLeg[]) private _ruleLegs;
    mapping(uint256 ruleId => bytes32[]) private _ruleSignerCommitments;
    mapping(bytes32 cidId => uint256[]) private _ruleIdsByCid;

    event PaymentRuleRegistered(
        uint256 indexed ruleId,
        bytes32 indexed cidId,
        address indexed payer,
        address token,
        ReleaseType releaseType
    );

    event PaymentRuleUpdated(uint256 indexed ruleId, bytes32 indexed cidId);
    event PaymentRuleCancelled(uint256 indexed ruleId, bytes32 indexed cidId);
    event PayoutExecuted(
        uint256 indexed ruleId,
        bytes32 indexed cidId,
        address indexed recipient,
        uint256 amount
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

    function registerRule(
        address payer_,
        address token_,
        bytes32 cidId_,
        ReleaseType releaseType_,
        bytes32 specificSignerCommitment_,
        uint8 thresholdN_,
        uint64 expiresAt_,
        bytes32[] calldata signerCommitments_,
        PayoutLeg[] calldata legs_
    ) external returns (uint256 ruleId) {
        if (msg.sender != payer_) revert UnauthorizedRuleRegistration();
        _assertFileRegistered(cidId_);
        _validateLegs(payer_, token_, legs_);
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

        ruleId = nextRuleId++;
        PaymentRule storage rule = rules[ruleId];
        rule.payer = payer_;
        rule.token = token_;
        rule.cidId = cidId_;
        rule.releaseType = releaseType_;
        rule.specificSignerCommitment = specificSignerCommitment_;
        rule.thresholdN = thresholdN_;
        rule.expiresAt = expiresAt_;

        _storeLegs(ruleId, legs_);
        if (_needsCommitmentList(releaseType_)) {
            _storeSignerCommitments(ruleId, signerCommitments_);
        }

        _ruleIdsByCid[cidId_].push(ruleId);

        emit PaymentRuleRegistered(
            ruleId,
            cidId_,
            payer_,
            token_,
            releaseType_
        );
    }

    function updatePayoutRule(
        uint256 ruleId,
        ReleaseType releaseType_,
        bytes32 specificSignerCommitment_,
        uint8 thresholdN_,
        uint64 expiresAt_,
        bytes32[] calldata signerCommitments_,
        PayoutLeg[] calldata legs_
    ) external nonReentrant {
        PaymentRule storage rule = rules[ruleId];
        if (rule.payer == address(0)) revert InvalidPayer();
        if (msg.sender != rule.payer) revert UnauthorizedRuleRegistration();
        if (rule.executed || rule.cancelled) revert RuleAlreadyExecuted();

        _validateLegs(rule.payer, rule.token, legs_);
        _validateReleaseConfig(
            releaseType_,
            specificSignerCommitment_,
            thresholdN_,
            signerCommitments_
        );
        if (releaseType_ == ReleaseType.QuorumRequired) {
            _validateQuorumRequiredThreshold(rule.cidId, thresholdN_);
        }
        if (releaseType_ == ReleaseType.QuorumAll) {
            _validateQuorumAllThreshold(rule.cidId, thresholdN_);
        }
        _validateExpiresAt(expiresAt_);

        rule.releaseType = releaseType_;
        rule.specificSignerCommitment = specificSignerCommitment_;
        rule.thresholdN = thresholdN_;
        rule.expiresAt = expiresAt_;

        delete _ruleLegs[ruleId];
        delete _ruleSignerCommitments[ruleId];
        _storeLegs(ruleId, legs_);
        if (_needsCommitmentList(releaseType_)) {
            _storeSignerCommitments(ruleId, signerCommitments_);
        }

        emit PaymentRuleUpdated(ruleId, rule.cidId);
    }

    function cancelPayoutRule(uint256 ruleId) external nonReentrant {
        PaymentRule storage rule = rules[ruleId];
        if (rule.payer == address(0)) revert InvalidPayer();
        if (msg.sender != rule.payer) revert UnauthorizedRuleRegistration();
        if (rule.executed) revert RuleAlreadyExecuted();
        if (rule.cancelled) revert RuleAlreadyCancelled();
        rule.cancelled = true;
        emit PaymentRuleCancelled(ruleId, rule.cidId);
    }

    function executePayout(uint256 ruleId) external nonReentrant {
        PaymentRule storage rule = rules[ruleId];
        if (rule.executed || rule.cancelled) revert RuleNotExecutable();
        if (!_releaseConditionsMet(ruleId, rule)) revert RuleNotExecutable();
        if (rule.expiresAt != 0 && block.timestamp > rule.expiresAt)
            revert RuleNotExecutable();

        PayoutLeg[] storage legs = _ruleLegs[ruleId];

        rule.executed = true;

        address token = rule.token;
        address payer = rule.payer;
        uint256 len = legs.length;

        for (uint256 i = 0; i < len; ) {
            PayoutLeg storage leg = legs[i];
            uint256 beforeBal = IERC20(token).balanceOf(leg.recipient);
            IERC20(token).safeTransferFrom(payer, leg.recipient, leg.amount);
            uint256 afterBal = IERC20(token).balanceOf(leg.recipient);
            if (afterBal - beforeBal < leg.amount)
                revert InsufficientTransferReceived();
            emit PayoutExecuted(ruleId, rule.cidId, leg.recipient, leg.amount);
            unchecked {
                ++i;
            }
        }
    }

    function canExecute(uint256 ruleId) external view returns (bool) {
        PaymentRule storage rule = rules[ruleId];
        if (rule.executed || rule.cancelled || rule.payer == address(0))
            return false;
        if (rule.expiresAt != 0 && block.timestamp > rule.expiresAt)
            return false;
        return _releaseConditionsMet(ruleId, rule);
    }

    function ruleLegs(uint256 ruleId) external view returns (PayoutLeg[] memory) {
        return _ruleLegs[ruleId];
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

    function _assertFileRegistered(bytes32 cidId_) private view {
        if (fileRegistry.fileRegistrations(cidId_).timestamp == 0) {
            revert FileNotRegistered();
        }
    }

    function _validateLegs(
        address payer_,
        address token_,
        PayoutLeg[] calldata legs_
    ) private pure {
        if (payer_ == address(0) || token_ == address(0)) revert InvalidPayer();
        if (legs_.length == 0 || legs_.length > MAX_PAYOUT_LEGS)
            revert ExceedsMaxLegs();
        for (uint256 i = 0; i < legs_.length; i++) {
            if (legs_[i].recipient == address(0)) revert InvalidPayer();
            if (legs_[i].amount == 0) revert InvalidAmount();
        }
    }

    function _validateExpiresAt(uint64 expiresAt_) private view {
        if (expiresAt_ != 0 && expiresAt_ <= block.timestamp)
            revert InvalidReleaseConfig();
    }

    function _storeLegs(uint256 ruleId, PayoutLeg[] calldata legs_) private {
        PayoutLeg[] storage stored = _ruleLegs[ruleId];
        for (uint256 i = 0; i < legs_.length; i++) {
            stored.push(legs_[i]);
        }
    }

    function _needsCommitmentList(
        ReleaseType releaseType_
    ) private pure returns (bool) {
        return releaseType_ == ReleaseType.AtLeastN ||
            releaseType_ == ReleaseType.QuorumSet ||
            releaseType_ == ReleaseType.AllOfSet;
    }

    function _storeSignerCommitments(
        uint256 ruleId,
        bytes32[] calldata signerCommitments_
    ) private {
        if (signerCommitments_.length > MAX_RULE_COMMITMENTS)
            revert ExceedsMaxCommitments();
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

    function _validateReleaseConfig(
        ReleaseType releaseType_,
        bytes32 specificSignerCommitment_,
        uint8 thresholdN_,
        bytes32[] calldata signerCommitments_
    ) private pure {
        if (releaseType_ == ReleaseType.SpecificSigner) {
            if (specificSignerCommitment_ == bytes32(0))
                revert InvalidReleaseConfig();
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
        if (
            thresholdN_ == 0 || thresholdN_ > reg.requiredSignersCount
        ) revert InvalidReleaseConfig();
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
        PaymentRule storage rule
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
