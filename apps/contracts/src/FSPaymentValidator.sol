// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./errors/EFSPaymentValidator.sol";
import "./interfaces/IFSFileRegistry.sol";

/// @notice Pull-payment rules: USDC transferFrom payer when release conditions hold (any relayer may execute).
contract FSPaymentValidator is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum ReleaseType {
        AllSigned,
        SpecificSigner,
        AtLeastN
    }

    struct PaymentRule {
        address payer;
        address recipient;
        address token;
        uint256 amount;
        bytes32 cidId;
        ReleaseType releaseType;
        bytes32 specificSignerCommitment;
        uint8 thresholdN;
        bool executed;
    }

    IFSFileRegistry public immutable fileRegistry;
    uint256 public immutable deploymentChainId;

    uint256 public nextRuleId;
    mapping(uint256 ruleId => PaymentRule) public rules;
    mapping(uint256 ruleId => bytes32[]) private _ruleSignerCommitments;
    mapping(bytes32 cidId => uint256[]) private _ruleIdsByCid;

    event PaymentRuleRegistered(
        uint256 indexed ruleId,
        bytes32 indexed cidId,
        address indexed payer,
        address recipient,
        address token,
        uint256 amount,
        ReleaseType releaseType
    );

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

    /// @notice Register a payout rule. Caller must be the payer (Alice's smart account).
    function registerRule(
        address payer_,
        address recipient_,
        address token_,
        uint256 amount_,
        bytes32 cidId_,
        ReleaseType releaseType_,
        bytes32 specificSignerCommitment_,
        uint8 thresholdN_,
        bytes32[] calldata signerCommitments_
    ) external returns (uint256 ruleId) {
        if (msg.sender != payer_) revert UnauthorizedRuleRegistration();
        if (payer_ == address(0) || recipient_ == address(0) || token_ == address(0)) {
            revert InvalidPayer();
        }
        if (amount_ == 0) revert InvalidAmount();
        if (!_validateReleaseConfig(
                releaseType_,
                specificSignerCommitment_,
                thresholdN_,
                signerCommitments_
            )) {
            revert InvalidReleaseConfig();
        }

        ruleId = nextRuleId++;
        PaymentRule storage rule = rules[ruleId];
        rule.payer = payer_;
        rule.recipient = recipient_;
        rule.token = token_;
        rule.amount = amount_;
        rule.cidId = cidId_;
        rule.releaseType = releaseType_;
        rule.specificSignerCommitment = specificSignerCommitment_;
        rule.thresholdN = thresholdN_;

        if (releaseType_ == ReleaseType.AtLeastN) {
            _storeAtLeastNCommitments(ruleId, signerCommitments_);
        }

        _ruleIdsByCid[cidId_].push(ruleId);

        emit PaymentRuleRegistered(
            ruleId,
            cidId_,
            payer_,
            recipient_,
            token_,
            amount_,
            releaseType_
        );
    }

    /// @notice Pull USDC to recipient when release conditions are met. Callable by anyone (Gelato or self-relay).
    function executePayout(uint256 ruleId) external nonReentrant {
        PaymentRule storage rule = rules[ruleId];
        if (rule.executed) revert RuleAlreadyExecuted();
        if (!_releaseConditionsMet(ruleId, rule)) revert RuleNotExecutable();

        rule.executed = true;

        IERC20(rule.token).safeTransferFrom(
            rule.payer,
            rule.recipient,
            rule.amount
        );

        emit PayoutExecuted(ruleId, rule.cidId, rule.recipient, rule.amount);
    }

    function canExecute(uint256 ruleId) external view returns (bool) {
        PaymentRule storage rule = rules[ruleId];
        if (rule.executed || rule.payer == address(0)) return false;
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

    /// @dev Reverts on zero or duplicate commitments (distinct signers required for threshold).
    function _storeAtLeastNCommitments(
        uint256 ruleId,
        bytes32[] calldata signerCommitments_
    ) private {
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
    ) private pure returns (bool) {
        if (releaseType_ == ReleaseType.AllSigned) {
            return true;
        }
        if (releaseType_ == ReleaseType.SpecificSigner) {
            return specificSignerCommitment_ != bytes32(0);
        }
        if (releaseType_ == ReleaseType.AtLeastN) {
            return thresholdN_ > 0 &&
                signerCommitments_.length > 0 &&
                thresholdN_ <= signerCommitments_.length;
        }
        return false;
    }

    function _releaseConditionsMet(
        uint256 ruleId,
        PaymentRule storage rule
    ) private view returns (bool) {
        bytes32 cidId = rule.cidId;
        if (rule.releaseType == ReleaseType.AllSigned) {
            return fileRegistry.allSigned(cidId);
        }
        if (rule.releaseType == ReleaseType.SpecificSigner) {
            return fileRegistry.hasSigned(cidId, rule.specificSignerCommitment);
        }
        bytes32[] storage commitments = _ruleSignerCommitments[ruleId];
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
