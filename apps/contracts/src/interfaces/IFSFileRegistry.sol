// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Auto-generated from src/FSFileRegistry.sol — DO NOT EDIT (regenerate with the script only)

import "./IFSManager.sol";

interface IFSFileRegistry {
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
        uint8 signersCount;
        uint8 signaturesCount;
        mapping(bytes32 => bytes) signatures;
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
        uint8 signersCount;
        uint8 signaturesCount;
        uint256 timestamp;
    }

    event FileRegistered();
    event FileSigned();
    function nonce(address key) external view returns (uint256);
    function manager() external view returns (address);
    function computeEmailSignerCommitment(bytes32[] calldata commitments_) external pure returns (bytes20);
    function fileRegistrations(bytes32 cidId) external view returns (FileRegistrationView memory);
    function registerFile(string calldata pieceCid_, address sender_, bytes32[] calldata signerEmailCommitments_, bytes32[] calldata viewerEmailCommitments_, bytes32 senderEmailCommitment_, bytes32 senderPrivySubjectCommitment_, bytes32 orgIdCommitment_, uint256 timestamp_, bytes calldata signature_, bytes32 placementCommitment_) external;
    function registerFileSignature(string calldata pieceCid_, address sender_, address signerWallet_, bytes32 signerEmailCommitment_, bytes32 privySubjectCommitment_, bytes20 dl3SignatureCommitment_, uint256 timestamp_, bytes calldata signature_, bytes32 completionsRoot_, uint8 leafSchemaVersion_) external;
    function isSigner(bytes32 cidId, bytes32 signerEmailCommitment_) external view returns (bool);
    function hasSigned(bytes32 cidId, bytes32 signerEmailCommitment_) external view returns (bool);
    function validateFileRegistrationSignature(string calldata pieceCid_, address sender_, bytes32[] calldata signerEmailCommitments_, bytes32[] calldata viewerEmailCommitments_, bytes32 senderEmailCommitment_, bytes32 senderPrivySubjectCommitment_, bytes32 orgIdCommitment_, uint256 timestamp_, bytes calldata signature_, bytes32 placementCommitment_) external view returns (bool);
    function validateFileSigningSignature(string calldata pieceCid_, address sender_, address signerWallet_, bytes32 signerEmailCommitment_, bytes32 privySubjectCommitment_, bytes20 dl3SignatureCommitment_, uint256 timestamp_, bytes calldata signature_, bytes32 completionsRoot_, uint8 leafSchemaVersion_) external view returns (bool);
    function validateFileAckSignature(string calldata pieceCid_, address sender_, address viewerWallet_, bytes32 viewerEmailCommitment_, bytes32 privySubjectCommitment_, uint256 timestamp_, bytes calldata signature_) external view returns (bool);
    function cidIdentifier(string calldata pieceCid_) external pure returns (bytes32);
    function allSigned(bytes32 cidId) external view returns (bool);
}
