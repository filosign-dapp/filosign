// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import "./errors/EFSCommon.sol";
import "./errors/EFSFileRegistry.sol";
import "./libraries/FSSignatureValidation.sol";

contract FSFileRegistry is EIP712, Ownable2Step {
    uint256 internal constant SIGNATURE_VALIDITY_PERIOD = 2 minutes;
    uint256 internal constant SIGNATURE_CLOCK_DRIFT_TOLERANCE = 5 minutes;

    uint8 internal constant MAX_SIGNERS_PER_FILE = 128;
    uint8 internal constant MAX_VIEWERS_PER_FILE = 128;

    enum RoutingMode {
        Parallel,
        Sequential
    }

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
    event SignerAmended(
        bytes32 indexed cidIdentifier,
        address indexed sender,
        bytes32 indexed oldCommitment,
        bytes32 newCommitment
    );
    event ServerUpdated(
        address indexed previousServer,
        address indexed newServer,
        address indexed changedBy
    );

    mapping(address => uint256) public nonce;
    mapping(bytes32 => FileRegistration) private _fileRegistrations;

    address public server;

    modifier onlyServer() {
        if (msg.sender != server) revert OnlyServer();
        _;
    }

    constructor(address server_) EIP712("FSFileRegistry", "2") Ownable(msg.sender) {
        if (server_ == address(0)) revert ZeroAddress();
        server = server_;
    }

    function setServer(address newServer_) external onlyOwner {
        if (newServer_ == address(0)) revert ZeroAddress();
        if (newServer_ == server) revert ServerUnchanged();

        address previousServer = server;
        server = newServer_;
        emit ServerUpdated(previousServer, newServer_, msg.sender);
    }

    bytes32 private constant REGISTER_FILE_TYPEHASH =
        keccak256(
            "RegisterFile(bytes32 cidIdentifier,address sender,bytes20 signersCommitment,bytes20 viewersCommitment,bytes32 placementCommitment,bytes32 senderEmailCommitment,bytes32 senderPrivySubjectCommitment,bytes32 orgIdCommitment,bytes32 requiredCommitmentsHash,bytes32 optionalCommitmentsHash,uint8 routingMode,bytes32 routingOrderHash,uint8 quorumN,bytes32 quorumSetHash,uint256 timestamp,uint256 nonce)"
        );
    bytes32 private constant AMEND_SIGNER_TYPEHASH =
        keccak256(
            "AmendSigner(bytes32 cidIdentifier,address sender,bytes32 oldCommitment,bytes32 newCommitment,uint256 timestamp,uint256 nonce)"
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
        return _computeEmailSignerCommitment(commitments_, commitments_.length);
    }

    function _computeEmailSignerCommitment(
        bytes32[] memory commitments_,
        uint256 len
    ) private pure returns (bytes20) {
        if (len == 0) {
            return bytes20(0);
        }
        if (len > MAX_SIGNERS_PER_FILE) revert ExceedsMaxSigners();
        for (uint256 i = 0; i < len; ) {
            if (commitments_[i] == bytes32(0)) revert ZeroSigner();
            if (i > 0 && commitments_[i] <= commitments_[i - 1])
                revert UnsortedSigners();
            unchecked {
                ++i;
            }
        }
        bytes32[] memory slice = new bytes32[](len);
        for (uint256 i = 0; i < len; i++) {
            slice[i] = commitments_[i];
        }
        return ripemd160(abi.encodePacked(slice));
    }

    function hashCommitments(bytes32[] calldata commitments_) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(commitments_));
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
                requiredSignersCount: file.requiredSignersCount,
                requiredSignaturesCount: file.requiredSignaturesCount,
                optionalSignersCount: file.optionalSignersCount,
                optionalSignaturesCount: file.optionalSignaturesCount,
                signersCount: file.signersCount,
                signaturesCount: file.signaturesCount,
                quorumN: file.quorumN,
                routingMode: uint8(file.routingMode),
                timestamp: file.timestamp
            });
    }

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

    function registerFile(RegisterFileInput calldata input) external onlyServer {
        _validateRegisterRouting(
            input.requiredCommitments,
            input.optionalCommitments,
            input.routingMode,
            input.routingOrder,
            input.quorumN,
            input.quorumSet
        );

        if (input.requiredCommitments.length == 0) revert BadSignersLength();
        if (input.viewerEmailCommitments.length > MAX_VIEWERS_PER_FILE)
            revert ExceedsMaxViewers();

        bytes32 cidId = cidIdentifier(input.pieceCid);
        bytes32[] memory roster = _mergeSortedCommitments(
            input.requiredCommitments,
            input.optionalCommitments
        );

        RegisterFileSigInput memory sigInput = RegisterFileSigInput({
            cidId: cidId,
            sender: input.sender,
            signersCommitment: _computeEmailSignerCommitment(roster, roster.length),
            viewersCommitment: computeEmailSignerCommitment(input.viewerEmailCommitments),
            placementCommitment: input.placementCommitment,
            senderEmailCommitment: input.senderEmailCommitment,
            senderPrivySubjectCommitment: input.senderPrivySubjectCommitment,
            orgIdCommitment: input.orgIdCommitment,
            requiredHash: hashCommitments(input.requiredCommitments),
            optionalHash: hashCommitments(input.optionalCommitments),
            routingMode: input.routingMode,
            routingOrderHash: hashCommitments(input.routingOrder),
            quorumN: input.quorumN,
            quorumSetHash: hashCommitments(input.quorumSet),
            timestamp: input.timestamp
        });

        if (!_verifyRegisterFileSignature(sigInput, input.signature))
            revert InvalidSignature();

        RegisterFileWriteInput memory writeInput = RegisterFileWriteInput({
            cidId: cidId,
            sender: input.sender,
            signersCommitment: sigInput.signersCommitment,
            viewersCommitment: sigInput.viewersCommitment,
            placementCommitment: input.placementCommitment,
            senderEmailCommitment: input.senderEmailCommitment,
            senderPrivySubjectCommitment: input.senderPrivySubjectCommitment,
            routingMode: input.routingMode,
            quorumN: input.quorumN,
            timestamp: input.timestamp
        });

        _writeFileRegistration(
            writeInput,
            input.requiredCommitments,
            input.optionalCommitments,
            input.viewerEmailCommitments,
            input.routingOrder,
            input.quorumSet,
            roster
        );
    }

    function _writeFileRegistration(
        RegisterFileWriteInput memory input,
        bytes32[] calldata requiredCommitments_,
        bytes32[] calldata optionalCommitments_,
        bytes32[] calldata viewerEmailCommitments_,
        bytes32[] calldata routingOrder_,
        bytes32[] calldata quorumSet_,
        bytes32[] memory roster
    ) private {
        FileRegistration storage file = _fileRegistrations[input.cidId];
        if (file.timestamp != 0) revert FileAlreadyRegistered();

        file.cidIdentifier = input.cidId;
        file.sender = input.sender;
        file.signersCommitment = input.signersCommitment;
        file.viewersCommitment = input.viewersCommitment;
        file.placementCommitment = input.placementCommitment;
        file.senderEmailCommitment = input.senderEmailCommitment;
        file.senderPrivySubjectCommitment = input.senderPrivySubjectCommitment;
        file.requiredSignersCount = uint8(requiredCommitments_.length);
        file.optionalSignersCount = uint8(optionalCommitments_.length);
        file.signersCount = uint8(roster.length);
        file.quorumN = input.quorumN;
        file.routingMode = RoutingMode(input.routingMode);
        file.timestamp = input.timestamp;

        for (uint256 i = 0; i < requiredCommitments_.length; i++) {
            bytes32 c = requiredCommitments_[i];
            file.signerEmailRegistered[c] = true;
            file.isRequiredSigner[c] = true;
        }
        for (uint256 i = 0; i < optionalCommitments_.length; i++) {
            bytes32 c = optionalCommitments_[i];
            file.signerEmailRegistered[c] = true;
            file.isOptionalSigner[c] = true;
        }
        for (uint256 i = 0; i < viewerEmailCommitments_.length; i++) {
            file.viewerEmailRegistered[viewerEmailCommitments_[i]] = true;
        }
        for (uint256 i = 0; i < routingOrder_.length; i++) {
            file.routingOrder.push(routingOrder_[i]);
        }
        for (uint256 i = 0; i < quorumSet_.length; i++) {
            file.quorumSet.push(quorumSet_[i]);
        }
        for (uint256 i = 0; i < roster.length; i++) {
            file.signerRoster.push(roster[i]);
        }

        nonce[input.sender]++;
        emit FileRegistered(input.cidId, input.sender, uint48(input.timestamp));
    }

    function _verifyRegisterFileSignature(
        RegisterFileSigInput memory input,
        bytes calldata signature_
    ) private view returns (bool) {
        _assertSignatureTimestamp(input.timestamp);
        if (
            input.senderEmailCommitment == bytes32(0) ||
            input.senderPrivySubjectCommitment == bytes32(0)
        ) revert InvalidSignature();

        bytes32 structHash = keccak256(
            abi.encode(
                REGISTER_FILE_TYPEHASH,
                input.cidId,
                input.sender,
                input.signersCommitment,
                input.viewersCommitment,
                input.placementCommitment,
                input.senderEmailCommitment,
                input.senderPrivySubjectCommitment,
                input.orgIdCommitment,
                input.requiredHash,
                input.optionalHash,
                input.routingMode,
                input.routingOrderHash,
                input.quorumN,
                input.quorumSetHash,
                input.timestamp,
                nonce[input.sender]
            )
        );
        return FSSignatureValidation.isValid(
            input.sender,
            _hashTypedDataV4(structHash),
            signature_
        );
    }

    function amendSigner(
        string calldata pieceCid_,
        bytes32 oldCommitment_,
        bytes32 newCommitment_,
        uint256 timestamp_,
        bytes calldata signature_
    ) external onlyServer {
        if (oldCommitment_ == bytes32(0) || newCommitment_ == bytes32(0))
            revert ZeroSigner();

        bytes32 cidId = cidIdentifier(pieceCid_);
        FileRegistration storage file = _fileRegistrations[cidId];
        if (file.timestamp == 0) revert FileNotRegistered();
        if (file.signatures[oldCommitment_].length != 0) revert AlreadySigned();
        if (!file.signerEmailRegistered[oldCommitment_]) revert InvalidSigner();
        if (file.signerEmailRegistered[newCommitment_]) revert DuplicateCommitment();

        _assertSignatureTimestamp(timestamp_);

        bytes32 structHash = keccak256(
            abi.encode(
                AMEND_SIGNER_TYPEHASH,
                cidId,
                file.sender,
                oldCommitment_,
                newCommitment_,
                timestamp_,
                nonce[file.sender]
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        if (!FSSignatureValidation.isValid(file.sender, digest, signature_))
            revert InvalidSignature();

        bool wasRequired = file.isRequiredSigner[oldCommitment_];
        bool wasOptional = file.isOptionalSigner[oldCommitment_];
        if (!wasRequired && !wasOptional) revert InvalidSigner();

        file.signerEmailRegistered[oldCommitment_] = false;
        file.isRequiredSigner[oldCommitment_] = false;
        file.isOptionalSigner[oldCommitment_] = false;
        file.signerEmailRegistered[newCommitment_] = true;
        if (wasRequired) file.isRequiredSigner[newCommitment_] = true;
        if (wasOptional) file.isOptionalSigner[newCommitment_] = true;

        for (uint256 i = 0; i < file.routingOrder.length; i++) {
            if (file.routingOrder[i] == oldCommitment_) {
                file.routingOrder[i] = newCommitment_;
            }
        }
        for (uint256 i = 0; i < file.quorumSet.length; i++) {
            if (file.quorumSet[i] == oldCommitment_) {
                file.quorumSet[i] = newCommitment_;
            }
        }

        for (uint256 i = 0; i < file.signerRoster.length; i++) {
            if (file.signerRoster[i] == oldCommitment_) {
                file.signerRoster[i] = newCommitment_;
            }
        }

        bytes32[] memory roster = _rebuildRoster(file);
        _sortCommitments(roster);
        file.signersCommitment = _computeEmailSignerCommitment(roster, roster.length);
        for (uint256 i = 0; i < roster.length; i++) {
            file.signerRoster[i] = roster[i];
        }

        nonce[file.sender]++;
        emit SignerAmended(cidId, file.sender, oldCommitment_, newCommitment_);
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

        if (
            !validateFileSigningSignature(
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
            )
        ) {
            revert InvalidSignature();
        }

        if (file.routingMode == RoutingMode.Sequential) {
            _enforceSequentialOrder(file, signerEmailCommitment_);
        }

        file.signatures[signerEmailCommitment_] = signature_;
        file.signaturesCount++;

        if (file.isRequiredSigner[signerEmailCommitment_]) {
            file.requiredSignaturesCount++;
        } else if (file.isOptionalSigner[signerEmailCommitment_]) {
            file.optionalSignaturesCount++;
        } else {
            revert InvalidSigner();
        }

        nonce[signerWallet_]++;
        emit FileSigned(cidId, sender_, signerWallet_, uint48(block.timestamp));
    }

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

    function allRequiredSigned(bytes32 cidId) external view returns (bool) {
        FileRegistration storage file = _fileRegistrations[cidId];
        if (file.timestamp == 0) return false;
        return
            file.requiredSignaturesCount == file.requiredSignersCount &&
            file.requiredSignersCount > 0;
    }

    function allSigned(bytes32 cidId) external view returns (bool) {
        FileRegistration storage file = _fileRegistrations[cidId];
        if (file.timestamp == 0) return false;
        if (
            file.requiredSignaturesCount != file.requiredSignersCount ||
            file.requiredSignersCount == 0
        ) return false;
        if (file.optionalSignersCount == 0) return true;
        return file.optionalSignaturesCount == file.optionalSignersCount;
    }

    function quorumMet(bytes32 cidId) external view returns (bool) {
        FileRegistration storage file = _fileRegistrations[cidId];
        if (file.timestamp == 0 || file.quorumN == 0) return false;
        uint8 signed;
        for (uint256 i = 0; i < file.quorumSet.length; i++) {
            if (file.signatures[file.quorumSet[i]].length != 0) {
                signed++;
                if (signed >= file.quorumN) return true;
            }
        }
        return false;
    }

    /// @dev Signed count across the full required + optional roster.
    function rosterSignedCount(bytes32 cidId) external view returns (uint8) {
        FileRegistration storage file = _fileRegistrations[cidId];
        if (file.timestamp == 0) return 0;
        uint8 signed;
        for (uint256 i = 0; i < file.signerRoster.length; i++) {
            if (file.signatures[file.signerRoster[i]].length != 0) {
                signed++;
            }
        }
        return signed;
    }

    function validateFileRegistrationSignature(
        RegisterFileInput calldata input
    ) public view returns (bool) {
        bytes32[] memory roster = _mergeSortedCommitments(
            input.requiredCommitments,
            input.optionalCommitments
        );
        RegisterFileSigInput memory sigInput = RegisterFileSigInput({
            cidId: cidIdentifier(input.pieceCid),
            sender: input.sender,
            signersCommitment: _computeEmailSignerCommitment(roster, roster.length),
            viewersCommitment: computeEmailSignerCommitment(input.viewerEmailCommitments),
            placementCommitment: input.placementCommitment,
            senderEmailCommitment: input.senderEmailCommitment,
            senderPrivySubjectCommitment: input.senderPrivySubjectCommitment,
            orgIdCommitment: input.orgIdCommitment,
            requiredHash: hashCommitments(input.requiredCommitments),
            optionalHash: hashCommitments(input.optionalCommitments),
            routingMode: input.routingMode,
            routingOrderHash: hashCommitments(input.routingOrder),
            quorumN: input.quorumN,
            quorumSetHash: hashCommitments(input.quorumSet),
            timestamp: input.timestamp
        });
        return _verifyRegisterFileSignature(sigInput, input.signature);
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
        _assertSignatureTimestamp(timestamp_);

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
        return FSSignatureValidation.isValid(signerWallet_, digest, signature_);
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
        _assertSignatureTimestamp(timestamp_);
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
        return FSSignatureValidation.isValid(viewerWallet_, digest, signature_);
    }

    function cidIdentifier(
        string calldata pieceCid_
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(pieceCid_));
    }

    function _validateRegisterRouting(
        bytes32[] calldata requiredCommitments_,
        bytes32[] calldata optionalCommitments_,
        uint8 routingMode_,
        bytes32[] calldata routingOrder_,
        uint8 quorumN_,
        bytes32[] calldata quorumSet_
    ) private pure {
        if (requiredCommitments_.length > MAX_SIGNERS_PER_FILE)
            revert ExceedsMaxSigners();
        if (optionalCommitments_.length > MAX_SIGNERS_PER_FILE)
            revert ExceedsMaxSigners();
        if (
            requiredCommitments_.length + optionalCommitments_.length >
            MAX_SIGNERS_PER_FILE
        ) revert ExceedsMaxSigners();
        if (routingOrder_.length > MAX_SIGNERS_PER_FILE)
            revert ExceedsMaxSigners();
        if (quorumSet_.length > MAX_SIGNERS_PER_FILE) revert ExceedsMaxSigners();

        _assertSortedUnique(requiredCommitments_);
        _assertSortedUnique(optionalCommitments_);
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

        if (routingMode_ > uint8(RoutingMode.Sequential))
            revert InvalidRoutingConfig();

        if (routingMode_ == uint8(RoutingMode.Sequential)) {
            if (routingOrder_.length == 0) revert InvalidRoutingConfig();
            if (
                routingOrder_.length !=
                requiredCommitments_.length + optionalCommitments_.length
            ) revert InvalidRoutingConfig();
            _assertMultisetEqual(routingOrder_, requiredCommitments_, optionalCommitments_);
        } else if (routingOrder_.length > 0) {
            revert InvalidRoutingConfig();
        }

        if (quorumSet_.length > 0) {
            _assertSortedUnique(quorumSet_);
            if (quorumN_ == 0 || quorumN_ > quorumSet_.length)
                revert InvalidQuorumConfig();
            bytes32[] memory roster = _mergeSortedCommitments(
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

    function _assertMultisetEqual(
        bytes32[] calldata order_,
        bytes32[] calldata required_,
        bytes32[] calldata optional_
    ) private pure {
        bytes32[] memory roster = _mergeSortedCommitments(required_, optional_);
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

    function _assertSortedUnique(bytes32[] calldata commitments_) private pure {
        for (uint256 i = 0; i < commitments_.length; i++) {
            if (commitments_[i] == bytes32(0)) revert ZeroSigner();
            if (i > 0 && commitments_[i] <= commitments_[i - 1])
                revert UnsortedSigners();
        }
    }

    function _mergeSortedCommitments(
        bytes32[] calldata required_,
        bytes32[] calldata optional_
    ) private pure returns (bytes32[] memory merged) {
        merged = new bytes32[](required_.length + optional_.length);
        uint256 i;
        uint256 j;
        uint256 k;
        while (i < required_.length && j < optional_.length) {
            if (required_[i] < optional_[j]) {
                merged[k++] = required_[i++];
            } else {
                merged[k++] = optional_[j++];
            }
        }
        while (i < required_.length) merged[k++] = required_[i++];
        while (j < optional_.length) merged[k++] = optional_[j++];
    }

    function _rebuildRoster(
        FileRegistration storage file
    ) private view returns (bytes32[] memory roster) {
        roster = new bytes32[](file.signerRoster.length);
        for (uint256 i = 0; i < file.signerRoster.length; i++) {
            roster[i] = file.signerRoster[i];
        }
    }

    function _assertSignatureTimestamp(uint256 timestamp_) private view {
        if (timestamp_ > block.timestamp + SIGNATURE_CLOCK_DRIFT_TOLERANCE)
            revert SignatureFuture();
        if (block.timestamp > timestamp_ + SIGNATURE_VALIDITY_PERIOD)
            revert SignatureExpired();
    }

    function _sortCommitments(bytes32[] memory commitments_) private pure {
        for (uint256 i = 1; i < commitments_.length; ) {
            bytes32 key = commitments_[i];
            uint256 j = i;
            while (j > 0 && commitments_[j - 1] > key) {
                commitments_[j] = commitments_[j - 1];
                unchecked {
                    --j;
                }
            }
            commitments_[j] = key;
            unchecked {
                ++i;
            }
        }
    }

    function _enforceSequentialOrder(
        FileRegistration storage file,
        bytes32 signerEmailCommitment_
    ) private view {
        for (uint256 i = 0; i < file.routingOrder.length; i++) {
            bytes32 c = file.routingOrder[i];
            if (c == signerEmailCommitment_) {
                for (uint256 j = 0; j < i; j++) {
                    if (file.signatures[file.routingOrder[j]].length == 0)
                        revert SequentialOrderViolation();
                }
                return;
            }
        }
        revert InvalidSigner();
    }
}
