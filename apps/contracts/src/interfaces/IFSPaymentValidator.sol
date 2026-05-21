// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Auto-generated from src/FSPaymentValidator.sol — DO NOT EDIT (regenerate with the script only)

import "./IFSFileRegistry.sol";
import "./IFSManager.sol";

interface IFSPaymentValidator {
    enum ReleaseType { AllSigned, SpecificSigner, AtLeastN }

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

    function fileRegistry() external view returns (address);
    function manager() external view returns (address);
    function deploymentChainId() external view returns (uint256);
    function allowedTokens(address key) external view returns (bool);
    function nextRuleId() external view returns (uint256);
    function rules(uint256 key) external view returns (PaymentRule memory);
    event TokenAllowed();
    event TokenRemoved();
    event PaymentRuleRegistered();
    event PaymentRuleCancelled();
    event PayoutExecuted();
    function addAllowedToken(address token_) external;
    function removeAllowedToken(address token_) external;
    function registerRule(address payer_, address recipient_, address token_, uint256 amount_, bytes32 cidId_, ReleaseType releaseType_, bytes32 specificSignerCommitment_, uint8 thresholdN_, bytes32[] calldata signerCommitments_, uint256 expiresAt_) external returns (uint256 ruleId);
    function cancelRule(uint256 ruleId) external;
    function executePayout(uint256 ruleId) external;
    function canExecute(uint256 ruleId) external view returns (bool);
    function signerCommitments(uint256 ruleId) external view returns (bytes32[] memory);
    function ruleIdsForCid(bytes32 cidId_) external view returns (uint256[] memory);
}
