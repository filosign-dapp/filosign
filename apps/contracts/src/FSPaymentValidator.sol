// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./errors/EFSPaymentValidator.sol";
import "./interfaces/IFSFileRegistry.sol";
import "./interfaces/IFSManager.sol";

/// @notice Pull-payment rules: token transferFrom payer when release conditions hold (any relayer may execute).
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
        bool cancelled;
        uint256 expiresAt;
    }

    IFSFileRegistry public immutable fileRegistry;
    IFSManager public immutable manager;
    uint256 public immutable deploymentChainId;

    mapping(address => bool) public allowedTokens;
    uint256 public nextRuleId;
    mapping(uint256 ruleId => PaymentRule) public rules;
    mapping(uint256 ruleId => bytes32[]) private _ruleSignerCommitments;
    mapping(bytes32 cidId => uint256[]) private _ruleIdsByCid;

    event TokenAllowed(address indexed token);
    event TokenRemoved(address indexed token);

    event PaymentRuleRegistered(
        uint256 indexed ruleId,
        bytes32 indexed cidId,
        address indexed payer,
        address recipient,
        address token,
        uint256 amount,
        ReleaseType releaseType,
        uint256 expiresAt
    );

    event PaymentRuleCancelled(
        uint256 indexed ruleId,
        bytes32 indexed cidId,
        address indexed payer
    );

    event PayoutExecuted(
        uint256 indexed ruleId,
        bytes32 indexed cidId,
        address indexed recipient,
        address payer,
        uint256 amount
    );

    modifier onlyServer() {
        if (!manager.isServer(msg.sender)) revert OnlyServer();
        _;
    }

    constructor(address fileRegistry_, uint256 deploymentChainId_) {
        if (fileRegistry_ == address(0)) {
            revert InvalidReleaseConfig();
        }
        fileRegistry = IFSFileRegistry(fileRegistry_);
        manager = IFSManager(IFSFileRegistry(fileRegistry_).manager());
        deploymentChainId = deploymentChainId_;
        if (block.chainid != deploymentChainId_) {
            revert InvalidReleaseConfig();
        }
    }

    function addAllowedToken(address token_) external onlyServer {
        if (token_ == address(0)) revert InvalidToken();
        allowedTokens[token_] = true;
        emit TokenAllowed(token_);
    }

    function removeAllowedToken(address token_) external onlyServer {
        allowedTokens[token_] = false;
        emit TokenRemoved(token_);
    }

    function registerRule(
        address payer_,
        address recipient_,
        address token_,
        uint256 amount_,
        bytes32 cidId_,
        ReleaseType releaseType_,
        bytes32 specificSignerCommitment_,
        uint8 thresholdN_,
        bytes32[] calldata signerCommitments_,
        uint256 expiresAt_
    ) external returns (uint256 ruleId) {
        if (msg.sender != payer_) revert UnauthorizedRuleRegistration();
        if (
            payer_ == address(0) ||
            recipient_ == address(0) ||
            token_ == address(0)
        ) {
            revert InvalidPayer();
        }
        if (!allowedTokens[token_]) revert TokenNotAllowed();
        if (amount_ == 0) revert InvalidAmount();
        if (expiresAt_ != 0 && expiresAt_ <= block.timestamp)
            revert InvalidExpiry();
        if (
            !_validateReleaseConfig(
                releaseType_,
                specificSignerCommitment_,
                thresholdN_,
                signerCommitments_
            )
        ) {
            revert InvalidReleaseConfig();
        }
        if (fileRegistry.fileRegistrations(cidId_).timestamp == 0)
            revert FileNotRegistered();

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
        rule.expiresAt = expiresAt_;

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
            releaseType_,
            expiresAt_
        );
    }

    function cancelRule(uint256 ruleId) external {
        PaymentRule storage rule = rules[ruleId];
        if (rule.payer == address(0)) revert RuleNotExecutable();
        if (msg.sender != rule.payer) revert UnauthorizedRuleRegistration();
        if (rule.executed) revert RuleAlreadyExecuted();
        if (rule.cancelled) revert RuleAlreadyCancelled();
        rule.cancelled = true;
        emit PaymentRuleCancelled(ruleId, rule.cidId, rule.payer);
    }

    function executePayout(uint256 ruleId) external nonReentrant {
        PaymentRule storage rule = rules[ruleId];
        if (rule.executed) revert RuleAlreadyExecuted();
        if (rule.cancelled) revert RuleAlreadyCancelled();
        if (rule.expiresAt != 0 && block.timestamp > rule.expiresAt)
            revert RuleExpired();
        if (!_releaseConditionsMet(ruleId, rule)) revert RuleNotExecutable();

        rule.executed = true;

        IERC20(rule.token).safeTransferFrom(
            rule.payer,
            rule.recipient,
            rule.amount
        );

        emit PayoutExecuted(
            ruleId,
            rule.cidId,
            rule.recipient,
            rule.payer,
            rule.amount
        );
    }

    function canExecute(uint256 ruleId) external view returns (bool) {
        PaymentRule storage rule = rules[ruleId];
        if (rule.executed || rule.cancelled || rule.payer == address(0))
            return false;
        if (rule.expiresAt != 0 && block.timestamp > rule.expiresAt)
            return false;
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
            return
                thresholdN_ > 0 &&
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
