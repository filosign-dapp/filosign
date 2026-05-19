// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import "./errors/EFSFileRegistry.sol";
import "./interfaces/IFSManager.sol";

contract FSFileRegistry is EIP712 {
    using ECDSA for bytes32;

    uint256 constant SIGNATURE_VALIDITY_PERIOD = 2 minutes;

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

    event FileRegistered(
        bytes32 indexed cidIdentifier,
        address indexed sender,
        uint48 timestamp
    );
    event FileSigned(
        bytes32 indexed cidIdentifier,
        address indexed sender,
        address indexed signerWallet,
        uint48 timestamp
    );

    mapping(address => uint256) public nonce;
    mapping(bytes32 => FileRegistration) private _fileRegistrations;

    IFSManager public immutable manager;

    modifier onlyServer() {
        if (msg.sender != manager.server()) revert OnlyServer();
        _;
    }

    constructor() EIP712("FSFileRegistry", "1") {
        manager = IFSManager(msg.sender);
    }

    bytes32 private constant REGISTER_FILE_TYPEHASH =
        keccak256(
            "RegisterFile(bytes32 cidIdentifier,address sender,bytes20 signersCommitment,bytes20 viewersCommitment,bytes32 placementCommitment,bytes32 senderEmailCommitment,bytes32 senderPrivySubjectCommitment,uint256 timestamp,uint256 nonce)"
        );
    bytes32 private constant ACK_FILE_TYPEHASH =
        keccak256(
            "AckFile(bytes32 cidIdentifier,address sender,address viewerWallet,bytes32 viewerEmailCommitment,bytes32 privySubjectCommitment,uint256 timestamp)"
        );
    bytes32 private constant SIGN_FILE_TYPEHASH =
        keccak256(
            "SignFile(bytes32 cidIdentifier,address sender,address signerWallet,bytes32 signerEmailCommitment,bytes32 privySubjectCommitment,bytes20 dl3SignatureCommitment,bytes32 completionsRoot,uint8 leafSchemaVersion,uint256 timestamp,uint256 nonce)"
        );

    /// Sorted unique commitments (ascending); `ripemd160(packed)`; empty list => zero `bytes20`.
    function computeEmailSignerCommitment(
        bytes32[] calldata commitments_
    ) public pure returns (bytes20) {
        uint256 len = commitments_.length;
        if (len == 0) {
            return bytes20(0);
        }
        if (len > uint256(type(uint8).max)) revert BadSignersLength();
        for (uint256 i = 0; i < len; ) {
            if (commitments_[i] == bytes32(0)) revert ZeroSigner();
            if (i > 0 && commitments_[i] <= commitments_[i - 1])
                revert UnsortedSigners();
            unchecked {
                ++i;
            }
        }
        return ripemd160(abi.encodePacked(commitments_));
    }

    function fileRegistrations(
        bytes32 cidId
    ) external view returns (FileRegistrationView memory) {
        FileRegistration storage file = _fileRegistrations[cidId];
        return
            FileRegistrationView({
                cidIdentifier: file.cidIdentifier,
                sender: file.sender,
                signersCommitment: file.signersCommitment,
                viewersCommitment: file.viewersCommitment,
                placementCommitment: file.placementCommitment,
                senderEmailCommitment: file.senderEmailCommitment,
                senderPrivySubjectCommitment: file.senderPrivySubjectCommitment,
                signersCount: file.signersCount,
                signaturesCount: file.signaturesCount,
                timestamp: file.timestamp
            });
    }

    function registerFile(
        string calldata pieceCid_,
        address sender_,
        bytes32[] calldata signerEmailCommitments_,
        bytes32[] calldata viewerEmailCommitments_,
        bytes32 senderEmailCommitment_,
        bytes32 senderPrivySubjectCommitment_,
        uint256 timestamp_,
        bytes calldata signature_,
        bytes32 placementCommitment_
    ) external onlyServer {
        require(
            validateFileRegistrationSignature(
                pieceCid_,
                sender_,
                signerEmailCommitments_,
                viewerEmailCommitments_,
                senderEmailCommitment_,
                senderPrivySubjectCommitment_,
                timestamp_,
                signature_,
                placementCommitment_
            ),
            InvalidSignature()
        );
        require(
            signerEmailCommitments_.length > 0 &&
                signerEmailCommitments_.length <= type(uint8).max,
            BadSignersLength()
        );
        require(
            viewerEmailCommitments_.length <= type(uint8).max,
            BadSignersLength()
        );

        bytes32 cidId = cidIdentifier(pieceCid_);
        FileRegistration storage file = _fileRegistrations[cidId];
        if (file.timestamp != 0) revert FileAlreadyRegistered();

        bytes20 sc = computeEmailSignerCommitment(signerEmailCommitments_);
        bytes20 vc = computeEmailSignerCommitment(viewerEmailCommitments_);

        file.cidIdentifier = cidId;
        file.sender = sender_;
        file.signersCommitment = sc;
        file.viewersCommitment = vc;
        file.placementCommitment = placementCommitment_;
        file.senderEmailCommitment = senderEmailCommitment_;
        file.senderPrivySubjectCommitment = senderPrivySubjectCommitment_;
        file.signersCount = uint8(signerEmailCommitments_.length);
        file.timestamp = timestamp_;

        for (uint256 i = 0; i < signerEmailCommitments_.length; i++) {
            file.signerEmailRegistered[signerEmailCommitments_[i]] = true;
        }
        for (uint256 i = 0; i < viewerEmailCommitments_.length; i++) {
            file.viewerEmailRegistered[viewerEmailCommitments_[i]] = true;
        }

        nonce[sender_]++;
        emit FileRegistered(cidId, sender_, uint48(timestamp_));
    }

    function registerFileSignature(
        string calldata pieceCid_,
        address sender_,
        address signerWallet_,
        bytes32 signerEmailCommitment_,
        bytes32 privySubjectCommitment_,
        bytes20 dl3SignatureCommitment_,
        uint256 timestamp_,
        bytes calldata signature_,
        bytes32 completionsRoot_,
        uint8 leafSchemaVersion_
    ) external onlyServer {
        bytes32 cidId = cidIdentifier(pieceCid_);
        FileRegistration storage file = _fileRegistrations[cidId];

        if (file.timestamp == 0) revert FileNotRegistered();
        if (file.signatures[signerEmailCommitment_].length != 0)
            revert AlreadySigned();

        require(
            validateFileSigningSignature(
                pieceCid_,
                sender_,
                signerWallet_,
                signerEmailCommitment_,
                privySubjectCommitment_,
                dl3SignatureCommitment_,
                timestamp_,
                signature_,
                completionsRoot_,
                leafSchemaVersion_
            ),
            InvalidSignature()
        );

        file.signatures[signerEmailCommitment_] = signature_;
        file.signaturesCount++;

        nonce[signerWallet_]++;
        emit FileSigned(cidId, sender_, signerWallet_, uint48(block.timestamp));
    }

    /// Eligibility keyed by signer email commitment, not wallet address.
    function isSigner(
        bytes32 cidId,
        bytes32 signerEmailCommitment_
    ) external view returns (bool) {
        return
            _fileRegistrations[cidId].signerEmailRegistered[
                signerEmailCommitment_
            ];
    }

    function hasSigned(
        bytes32 cidId,
        bytes32 signerEmailCommitment_
    ) external view returns (bool) {
        return
            _fileRegistrations[cidId]
                .signatures[signerEmailCommitment_]
                .length != 0;
    }

    function validateFileRegistrationSignature(
        string calldata pieceCid_,
        address sender_,
        bytes32[] calldata signerEmailCommitments_,
        bytes32[] calldata viewerEmailCommitments_,
        bytes32 senderEmailCommitment_,
        bytes32 senderPrivySubjectCommitment_,
        uint256 timestamp_,
        bytes calldata signature_,
        bytes32 placementCommitment_
    ) public view returns (bool) {
        require(
            block.timestamp <= timestamp_ + SIGNATURE_VALIDITY_PERIOD,
            SignatureExpired()
        );

        if (!manager.isRegistered(sender_)) revert SenderNotRegistered();
        if (
            senderEmailCommitment_ == bytes32(0) ||
            senderPrivySubjectCommitment_ == bytes32(0)
        ) revert InvalidSignature();

        bytes20 signersCommitment = computeEmailSignerCommitment(
            signerEmailCommitments_
        );
        bytes20 viewersCommitment = computeEmailSignerCommitment(
            viewerEmailCommitments_
        );

        bytes32 cidId = cidIdentifier(pieceCid_);
        bytes32 structHash = keccak256(
            abi.encode(
                REGISTER_FILE_TYPEHASH,
                cidId,
                sender_,
                signersCommitment,
                viewersCommitment,
                placementCommitment_,
                senderEmailCommitment_,
                senderPrivySubjectCommitment_,
                timestamp_,
                nonce[sender_]
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature_);
        return recovered == sender_;
    }

    function validateFileSigningSignature(
        string calldata pieceCid_,
        address sender_,
        address signerWallet_,
        bytes32 signerEmailCommitment_,
        bytes32 privySubjectCommitment_,
        bytes20 dl3SignatureCommitment_,
        uint256 timestamp_,
        bytes calldata signature_,
        bytes32 completionsRoot_,
        uint8 leafSchemaVersion_
    ) public view returns (bool) {
        require(
            block.timestamp <= timestamp_ + SIGNATURE_VALIDITY_PERIOD,
            SignatureExpired()
        );

        FileRegistration storage file = _fileRegistrations[
            cidIdentifier(pieceCid_)
        ];
        if (!file.signerEmailRegistered[signerEmailCommitment_])
            revert InvalidSigner();
        if (file.sender != sender_) revert InvalidSender();

        bytes32 cidId = cidIdentifier(pieceCid_);
        bytes32 structHash = keccak256(
            abi.encode(
                SIGN_FILE_TYPEHASH,
                cidId,
                sender_,
                signerWallet_,
                signerEmailCommitment_,
                privySubjectCommitment_,
                dl3SignatureCommitment_,
                completionsRoot_,
                leafSchemaVersion_,
                timestamp_,
                nonce[signerWallet_]
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature_);
        return recovered == signerWallet_;
    }

    function validateFileAckSignature(
        string calldata pieceCid_,
        address sender_,
        address viewerWallet_,
        bytes32 viewerEmailCommitment_,
        bytes32 privySubjectCommitment_,
        uint256 timestamp_,
        bytes calldata signature_
    ) public view returns (bool) {
        require(
            block.timestamp <= timestamp_ + SIGNATURE_VALIDITY_PERIOD,
            SignatureExpired()
        );
        FileRegistration storage file = _fileRegistrations[
            cidIdentifier(pieceCid_)
        ];
        if (
            !file.viewerEmailRegistered[viewerEmailCommitment_] &&
            !file.signerEmailRegistered[viewerEmailCommitment_]
        ) revert InvalidSigner();
        if (file.sender != sender_) revert InvalidSender();

        bytes32 cidId = cidIdentifier(pieceCid_);
        bytes32 structHash = keccak256(
            abi.encode(
                ACK_FILE_TYPEHASH,
                cidId,
                sender_,
                viewerWallet_,
                viewerEmailCommitment_,
                privySubjectCommitment_,
                timestamp_
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature_);
        return recovered == viewerWallet_;
    }

    function cidIdentifier(
        string calldata pieceCid_
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(pieceCid_));
    }

    function allSigned(bytes32 cidId) external view returns (bool) {
        FileRegistration storage file = _fileRegistrations[cidId];
        return file.timestamp != 0 && file.signaturesCount == file.signersCount;
    }
}
