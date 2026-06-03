// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Auto-generated from src/FSEnvelopeRegistry.sol — DO NOT EDIT (regenerate with the script only)

interface IFSEnvelopeRegistry {
    enum RoutingMode { Parallel, Sequential }

    struct EnvelopeRegistration {
        bytes32 cidIdentifier;
        address sender;
        bytes20 signersCommitment;
        bytes20 viewersCommitment;
        bytes32 placementCommitment;
        bytes32 senderEmailCommitment;
        bytes32 senderAuthSubjectCommitment;
        mapping(bytes32 => bool) viewerEmailRegistered;
        mapping(bytes32 => bool) isRequiredSigner;
        mapping(bytes32 => bytes) signatures;
        bytes32[] signerRoster;
        uint256 timestamp;
        bytes32 orgIdCommitment;
        uint48 completedAt;
        uint48 revokedBeforeCompletedAt;
        address revokedBy;
        uint8 requiredSignersCount;
        uint8 requiredSignaturesCount;
        uint8 signaturesCount;
        uint8 quorumN;
        RoutingMode routingMode;
        bytes32 routingOrderHash;
        bytes32 quorumSetHash;
    }

    struct EnvelopeRegistrationView {
        bytes32 cidIdentifier;
        address sender;
        bytes20 signersCommitment;
        bytes20 viewersCommitment;
        bytes32 placementCommitment;
        bytes32 senderEmailCommitment;
        bytes32 senderAuthSubjectCommitment;
        uint8 requiredSignersCount;
        uint8 requiredSignaturesCount;
        uint8 signaturesCount;
        uint8 quorumN;
        uint8 routingMode;
        bytes32 routingOrderHash;
        bytes32 quorumSetHash;
        uint256 timestamp;
        bytes32 orgIdCommitment;
        uint48 completedAt;
        uint48 revokedBeforeCompletedAt;
        address revokedBy;
    }

    event EnvelopeRegistered();
    event EnvelopeSigned();
    event SignerAmended();
    event ServerUpdated();
    event EnvelopeRevokedBeforeComplete();
    event EnvelopeCompleted();
    event OrgControllersSet();
    function server() external view returns (address);
    function setServer(address newServer_) external;
    function isOrgController(bytes32 orgIdCommitment_, address wallet_) external view returns (bool);
    function getOrgControllers(bytes32 orgIdCommitment_) external view returns (address[] memory);
    function setOrgControllers(bytes32 orgIdCommitment_, address[] calldata wallets_) external;
    function computeEmailSignerCommitment(bytes32[] calldata commitments_) external pure returns (bytes20);
    function hashCommitments(bytes32[] calldata commitments_) external pure returns (bytes32);
    function envelopeRegistrations(bytes32 cidId) external view returns (EnvelopeRegistrationView memory);
    function isRevokedBeforeComplete(bytes32 cidId) external view returns (bool);
    function isEnvelopeComplete(bytes32 cidId) external view returns (bool);
    struct RegisterEnvelopeSigInput {
        bytes32 cidId;
        address sender;
        bytes20 signersCommitment;
        bytes20 viewersCommitment;
        bytes32 placementCommitment;
        bytes32 senderEmailCommitment;
        bytes32 senderAuthSubjectCommitment;
        bytes32 orgIdCommitment;
        bytes32 requiredHash;
        bytes32 optionalHash;
        uint8 routingMode;
        bytes32 routingOrderHash;
        uint8 quorumN;
        bytes32 quorumSetHash;
        uint256 timestamp;
    }

    struct RegisterEnvelopeWriteInput {
        bytes32 cidId;
        address sender;
        bytes20 signersCommitment;
        bytes20 viewersCommitment;
        bytes32 placementCommitment;
        bytes32 senderEmailCommitment;
        bytes32 senderAuthSubjectCommitment;
        uint8 routingMode;
        uint8 quorumN;
        bytes32 routingOrderHash;
        bytes32 quorumSetHash;
        uint256 timestamp;
    }

    struct RegisterEnvelopeInput {
        string pieceCid;
        address sender;
        bytes32[] requiredCommitments;
        bytes32[] optionalCommitments;
        bytes32[] viewerEmailCommitments;
        bytes32 senderEmailCommitment;
        bytes32 senderAuthSubjectCommitment;
        bytes32 orgIdCommitment;
        uint8 routingMode;
        bytes32[] routingOrder;
        uint8 quorumN;
        bytes32[] quorumSet;
        uint256 timestamp;
        bytes signature;
        bytes32 placementCommitment;
    }

    function registerEnvelope(RegisterEnvelopeInput calldata input) external;
    function amendSigner(string calldata pieceCid_, address recaller_, bytes32 oldCommitment_, bytes32 newCommitment_, uint256 timestamp_, bytes calldata signature_, bytes32[] calldata routingOrderBefore_, bytes32[] calldata routingOrderAfter_, bytes32[] calldata quorumSetBefore_, bytes32[] calldata quorumSetAfter_) external;
    function recallEnvelope(string calldata pieceCid_, address recaller_, uint256 timestamp_, bytes calldata signature_) external;
    function registerEnvelopeSignature(string calldata pieceCid_, address sender_, address signerWallet_, bytes32 signerEmailCommitment_, bytes32 authSubjectCommitment_, bytes20 dl3SignatureCommitment_, uint256 timestamp_, bytes calldata signature_, bytes32 completionsRoot_, uint8 leafSchemaVersion_, bytes32[] calldata routingOrder_, bytes32[] calldata quorumSet_) external;
    function isSigner(bytes32 cidId, bytes32 signerEmailCommitment_) external view returns (bool);
    function hasSigned(bytes32 cidId, bytes32 signerEmailCommitment_) external view returns (bool);
    function rosterSignedCount(bytes32 cidId) external view returns (uint8);
    function validateEnvelopeRegistrationSignature(RegisterEnvelopeInput calldata input) external view returns (bool);
    function validateEnvelopeSigningSignature(string calldata pieceCid_, address sender_, address signerWallet_, bytes32 signerEmailCommitment_, bytes32 authSubjectCommitment_, bytes20 dl3SignatureCommitment_, uint256 timestamp_, bytes calldata signature_, bytes32 completionsRoot_, uint8 leafSchemaVersion_) external view returns (bool);
    function validateEnvelopeAckSignature(string calldata pieceCid_, address sender_, address viewerWallet_, bytes32 viewerEmailCommitment_, bytes32 authSubjectCommitment_, uint256 timestamp_, bytes calldata signature_) external view returns (bool);
    function cidIdentifier(string calldata pieceCid_) external pure returns (bytes32);
}
