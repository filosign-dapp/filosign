// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Auto-generated from src/FSFileRegistry.sol — DO NOT EDIT (regenerate with the script only)

interface IFSFileRegistry {
    enum RoutingMode { Parallel, Sequential }

    struct FileRegistration {
        bytes32 cidIdentifier;
        address sender;
        bytes20 signersCommitment;
        bytes20 viewersCommitment;
        bytes32 placementCommitment;
        bytes32 senderEmailCommitment;
        bytes32 senderPrivySubjectCommitment;
        mapping(bytes32 => bool) signerEmailRegistered;
        mapping(bytes32 => bool) viewerEmailRegistered;
        mapping(bytes32 => bool) isRequiredSigner;
        mapping(bytes32 => bool) isOptionalSigner;
        mapping(bytes32 => bytes) signatures;
        uint8 requiredSignersCount;
        uint8 requiredSignaturesCount;
        uint8 optionalSignersCount;
        uint8 optionalSignaturesCount;
        uint8 signersCount;
        uint8 signaturesCount;
        uint8 quorumN;
        RoutingMode routingMode;
        bytes32[] routingOrder;
        bytes32[] quorumSet;
        bytes32[] signerRoster;
        uint256 timestamp;
    }

    struct FileRegistrationView {
        bytes32 cidIdentifier;
        address sender;
        bytes20 signersCommitment;
        bytes20 viewersCommitment;
        bytes32 placementCommitment;
        bytes32 senderEmailCommitment;
        bytes32 senderPrivySubjectCommitment;
        uint8 requiredSignersCount;
        uint8 requiredSignaturesCount;
        uint8 optionalSignersCount;
        uint8 optionalSignaturesCount;
        uint8 signersCount;
        uint8 signaturesCount;
        uint8 quorumN;
        uint8 routingMode;
        uint256 timestamp;
    }

    event FileRegistered();
    event FileSigned();
    event SignerAmended();
    event ServerUpdated();
    function nonce(address key) external view returns (uint256);
    function server() external view returns (address);
    function setServer(address newServer_) external;
    function computeEmailSignerCommitment(bytes32[] calldata commitments_) external pure returns (bytes20);
    function hashCommitments(bytes32[] calldata commitments_) external pure returns (bytes32);
    function fileRegistrations(bytes32 cidId) external view returns (FileRegistrationView memory);
    struct RegisterFileSigInput {
        bytes32 cidId;
        address sender;
        bytes20 signersCommitment;
        bytes20 viewersCommitment;
        bytes32 placementCommitment;
        bytes32 senderEmailCommitment;
        bytes32 senderPrivySubjectCommitment;
        bytes32 orgIdCommitment;
        bytes32 requiredHash;
        bytes32 optionalHash;
        uint8 routingMode;
        bytes32 routingOrderHash;
        uint8 quorumN;
        bytes32 quorumSetHash;
        uint256 timestamp;
    }

    struct RegisterFileWriteInput {
        bytes32 cidId;
        address sender;
        bytes20 signersCommitment;
        bytes20 viewersCommitment;
        bytes32 placementCommitment;
        bytes32 senderEmailCommitment;
        bytes32 senderPrivySubjectCommitment;
        uint8 routingMode;
        uint8 quorumN;
        uint256 timestamp;
    }

    struct RegisterFileInput {
        string pieceCid;
        address sender;
        bytes32[] requiredCommitments;
        bytes32[] optionalCommitments;
        bytes32[] viewerEmailCommitments;
        bytes32 senderEmailCommitment;
        bytes32 senderPrivySubjectCommitment;
        bytes32 orgIdCommitment;
        uint8 routingMode;
        bytes32[] routingOrder;
        uint8 quorumN;
        bytes32[] quorumSet;
        uint256 timestamp;
        bytes signature;
        bytes32 placementCommitment;
    }

    function registerFile(RegisterFileInput calldata input) external;
    function amendSigner(string calldata pieceCid_, bytes32 oldCommitment_, bytes32 newCommitment_, uint256 timestamp_, bytes calldata signature_) external;
    function registerFileSignature(string calldata pieceCid_, address sender_, address signerWallet_, bytes32 signerEmailCommitment_, bytes32 privySubjectCommitment_, bytes20 dl3SignatureCommitment_, uint256 timestamp_, bytes calldata signature_, bytes32 completionsRoot_, uint8 leafSchemaVersion_) external;
    function isSigner(bytes32 cidId, bytes32 signerEmailCommitment_) external view returns (bool);
    function hasSigned(bytes32 cidId, bytes32 signerEmailCommitment_) external view returns (bool);
    function allRequiredSigned(bytes32 cidId) external view returns (bool);
    function allSigned(bytes32 cidId) external view returns (bool);
    function quorumMet(bytes32 cidId) external view returns (bool);
    function rosterSignedCount(bytes32 cidId) external view returns (uint8);
    function validateFileRegistrationSignature(RegisterFileInput calldata input) external view returns (bool);
    function validateFileSigningSignature(string calldata pieceCid_, address sender_, address signerWallet_, bytes32 signerEmailCommitment_, bytes32 privySubjectCommitment_, bytes20 dl3SignatureCommitment_, uint256 timestamp_, bytes calldata signature_, bytes32 completionsRoot_, uint8 leafSchemaVersion_) external view returns (bool);
    function validateFileAckSignature(string calldata pieceCid_, address sender_, address viewerWallet_, bytes32 viewerEmailCommitment_, bytes32 privySubjectCommitment_, uint256 timestamp_, bytes calldata signature_) external view returns (bool);
    function cidIdentifier(string calldata pieceCid_) external pure returns (bytes32);
}
