// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import "./errors/EFSCommon.sol";
import "./errors/EFSEnvelopeRegistry.sol";
import "./libraries/FSCommitmentLib.sol";
import "./libraries/FSEnvelopeRoutingLib.sol";
import "./libraries/FSSignatureValidation.sol";

contract FSEnvelopeRegistry is EIP712, Ownable2Step {
    uint256 internal constant SIGNATURE_VALIDITY_PERIOD = 24 hours;
    uint256 internal constant SIGNATURE_CLOCK_DRIFT_TOLERANCE = 5 minutes;

    uint8 internal constant MAX_SIGNERS_PER_ENVELOPE = 99;
    uint8 internal constant MAX_VIEWERS_PER_ENVELOPE = 99;

    enum RoutingMode {
        Parallel,
        Sequential
    }

    struct EnvelopeRegistration {
        bytes32 cidIdentifier;
        address sender;
        bytes20 signersCommitment;
        bytes20 viewersCommitment;
        bytes32 placementCommitment;
        bytes32 senderEmailCommitment;
        bytes32 senderAuthSubjectCommitment;
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
        bytes32 orgIdCommitment;
        address orgWallet;
        uint48 completedAt;
        uint48 revokedBeforeCompletedAt;
        address revokedBy;
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
        uint8 optionalSignersCount;
        uint8 optionalSignaturesCount;
        uint8 signersCount;
        uint8 signaturesCount;
        uint8 quorumN;
        uint8 routingMode;
        uint256 timestamp;
        bytes32 orgIdCommitment;
        address orgWallet;
        uint48 completedAt;
        uint48 revokedBeforeCompletedAt;
        address revokedBy;
    }

    event EnvelopeRegistered(
        bytes32 indexed cidIdentifier,
        address indexed sender,
        uint48 timestamp
    );
    event EnvelopeSigned(
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
    event EnvelopeRevokedBeforeComplete(
        bytes32 indexed cidIdentifier,
        address indexed revokedBy,
        uint48 revokedAt
    );
    event EnvelopeCompleted(
        bytes32 indexed cidIdentifier,
        uint48 completedAt
    );

    mapping(address => uint256) public nonce;
    mapping(bytes32 => EnvelopeRegistration) private _envelopeRegistrations;

    address public server;

    modifier onlyServer() {
        if (msg.sender != server) revert OnlyServer();
        _;
    }

    constructor(
        address server_
    ) EIP712("FSEnvelopeRegistry", "2") Ownable(msg.sender) {
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

    bytes32 private constant REGISTER_ENVELOPE_TYPEHASH =
        keccak256(
            "RegisterEnvelope(bytes32 cidIdentifier,address sender,bytes20 signersCommitment,bytes20 viewersCommitment,bytes32 placementCommitment,bytes32 senderEmailCommitment,bytes32 senderAuthSubjectCommitment,bytes32 orgIdCommitment,address orgWallet,bytes32 requiredCommitmentsHash,bytes32 optionalCommitmentsHash,uint8 routingMode,bytes32 routingOrderHash,uint8 quorumN,bytes32 quorumSetHash,uint256 timestamp,uint256 nonce)"
        );
    bytes32 private constant AMEND_SIGNER_TYPEHASH =
        keccak256(
            "AmendSigner(bytes32 cidIdentifier,address recaller,bytes32 oldCommitment,bytes32 newCommitment,uint256 timestamp,uint256 nonce)"
        );
    bytes32 private constant RECALL_ENVELOPE_TYPEHASH =
        keccak256(
            "RecallEnvelope(bytes32 cidIdentifier,address recaller,bytes32 orgIdCommitment,uint256 timestamp,uint256 nonce)"
        );
    bytes32 private constant ACK_ENVELOPE_TYPEHASH =
        keccak256(
            "AckEnvelope(bytes32 cidIdentifier,address sender,address viewerWallet,bytes32 viewerEmailCommitment,bytes32 authSubjectCommitment,uint256 timestamp)"
        );
    bytes32 private constant SIGN_ENVELOPE_TYPEHASH =
        keccak256(
            "SignEnvelope(bytes32 cidIdentifier,address sender,address signerWallet,bytes32 signerEmailCommitment,bytes32 authSubjectCommitment,bytes20 dl3SignatureCommitment,bytes32 completionsRoot,uint8 leafSchemaVersion,uint256 timestamp,uint256 nonce)"
        );

    /// Sorted unique commitments (ascending); `ripemd160(packed)`; empty list => zero `bytes20`.
    function computeEmailSignerCommitment(
        bytes32[] calldata commitments_
    ) public pure returns (bytes20) {
        return FSCommitmentLib.computeEmailSignerCommitment(commitments_);
    }

    function hashCommitments(
        bytes32[] calldata commitments_
    ) public pure returns (bytes32) {
        return FSCommitmentLib.hashCommitments(commitments_);
    }

    function envelopeRegistrations(
        bytes32 cidId
    ) external view returns (EnvelopeRegistrationView memory) {
        EnvelopeRegistration storage file = _envelopeRegistrations[cidId];
        return
            EnvelopeRegistrationView({
                cidIdentifier: file.cidIdentifier,
                sender: file.sender,
                signersCommitment: file.signersCommitment,
                viewersCommitment: file.viewersCommitment,
                placementCommitment: file.placementCommitment,
                senderEmailCommitment: file.senderEmailCommitment,
                senderAuthSubjectCommitment: file.senderAuthSubjectCommitment,
                requiredSignersCount: file.requiredSignersCount,
                requiredSignaturesCount: file.requiredSignaturesCount,
                optionalSignersCount: file.optionalSignersCount,
                optionalSignaturesCount: file.optionalSignaturesCount,
                signersCount: file.signersCount,
                signaturesCount: file.signaturesCount,
                quorumN: file.quorumN,
                routingMode: uint8(file.routingMode),
                timestamp: file.timestamp,
                orgIdCommitment: file.orgIdCommitment,
                orgWallet: file.orgWallet,
                completedAt: file.completedAt,
                revokedBeforeCompletedAt: file.revokedBeforeCompletedAt,
                revokedBy: file.revokedBy
            });
    }

    function isRevokedBeforeComplete(bytes32 cidId) external view returns (bool) {
        return _envelopeRegistrations[cidId].revokedBeforeCompletedAt != 0;
    }

    function isEnvelopeComplete(bytes32 cidId) external view returns (bool) {
        return _envelopeRegistrations[cidId].completedAt != 0;
    }

    struct RegisterEnvelopeSigInput {
        bytes32 cidId;
        address sender;
        bytes20 signersCommitment;
        bytes20 viewersCommitment;
        bytes32 placementCommitment;
        bytes32 senderEmailCommitment;
        bytes32 senderAuthSubjectCommitment;
        bytes32 orgIdCommitment;
        address orgWallet;
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
        address orgWallet;
        uint8 routingMode;
        bytes32[] routingOrder;
        uint8 quorumN;
        bytes32[] quorumSet;
        uint256 timestamp;
        bytes signature;
        bytes32 placementCommitment;
    }

    function registerEnvelope(
        RegisterEnvelopeInput calldata input
    ) external onlyServer {
        FSEnvelopeRoutingLib.validateRegisterRouting(
            input.requiredCommitments,
            input.optionalCommitments,
            input.routingMode,
            input.routingOrder,
            input.quorumN,
            input.quorumSet
        );

        if (input.requiredCommitments.length == 0) revert BadSignersLength();
        if (input.viewerEmailCommitments.length > MAX_VIEWERS_PER_ENVELOPE)
            revert ExceedsMaxViewers();

        bytes32 cidId = FSCommitmentLib.cidIdentifier(input.pieceCid);
        bytes32[] memory roster = FSCommitmentLib.mergeSortedCommitments(
            input.requiredCommitments,
            input.optionalCommitments
        );

        RegisterEnvelopeSigInput memory sigInput = RegisterEnvelopeSigInput({
            cidId: cidId,
            sender: input.sender,
            signersCommitment: FSCommitmentLib
                .computeEmailSignerCommitmentMemory(roster, roster.length),
            viewersCommitment: FSCommitmentLib.computeEmailSignerCommitment(
                input.viewerEmailCommitments
            ),
            placementCommitment: input.placementCommitment,
            senderEmailCommitment: input.senderEmailCommitment,
            senderAuthSubjectCommitment: input.senderAuthSubjectCommitment,
            orgIdCommitment: input.orgIdCommitment,
            orgWallet: input.orgWallet,
            requiredHash: hashCommitments(input.requiredCommitments),
            optionalHash: hashCommitments(input.optionalCommitments),
            routingMode: input.routingMode,
            routingOrderHash: hashCommitments(input.routingOrder),
            quorumN: input.quorumN,
            quorumSetHash: hashCommitments(input.quorumSet),
            timestamp: input.timestamp
        });

        if (!_verifyRegisterEnvelopeSignature(sigInput, input.signature))
            revert InvalidSignature();

        RegisterEnvelopeWriteInput
            memory writeInput = RegisterEnvelopeWriteInput({
                cidId: cidId,
                sender: input.sender,
                signersCommitment: sigInput.signersCommitment,
                viewersCommitment: sigInput.viewersCommitment,
                placementCommitment: input.placementCommitment,
                senderEmailCommitment: input.senderEmailCommitment,
                senderAuthSubjectCommitment: input.senderAuthSubjectCommitment,
                routingMode: input.routingMode,
                quorumN: input.quorumN,
                timestamp: input.timestamp
            });

        _writeEnvelopeRegistration(
            writeInput,
            input.orgIdCommitment,
            input.orgWallet,
            input.requiredCommitments,
            input.optionalCommitments,
            input.viewerEmailCommitments,
            input.routingOrder,
            input.quorumSet,
            roster
        );
    }

    function _writeEnvelopeRegistration(
        RegisterEnvelopeWriteInput memory input,
        bytes32 orgIdCommitment_,
        address orgWallet_,
        bytes32[] calldata requiredCommitments_,
        bytes32[] calldata optionalCommitments_,
        bytes32[] calldata viewerEmailCommitments_,
        bytes32[] calldata routingOrder_,
        bytes32[] calldata quorumSet_,
        bytes32[] memory roster
    ) private {
        EnvelopeRegistration storage file = _envelopeRegistrations[input.cidId];
        if (file.timestamp != 0) revert FileAlreadyRegistered();

        file.cidIdentifier = input.cidId;
        file.sender = input.sender;
        file.signersCommitment = input.signersCommitment;
        file.viewersCommitment = input.viewersCommitment;
        file.placementCommitment = input.placementCommitment;
        file.senderEmailCommitment = input.senderEmailCommitment;
        file.senderAuthSubjectCommitment = input.senderAuthSubjectCommitment;
        file.requiredSignersCount = uint8(requiredCommitments_.length);
        file.optionalSignersCount = uint8(optionalCommitments_.length);
        file.signersCount = uint8(roster.length);
        file.quorumN = input.quorumN;
        file.routingMode = RoutingMode(input.routingMode);
        file.timestamp = input.timestamp;
        file.orgIdCommitment = orgIdCommitment_;
        file.orgWallet = orgWallet_;
        file.completedAt = 0;
        file.revokedBeforeCompletedAt = 0;
        file.revokedBy = address(0);

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
        emit EnvelopeRegistered(
            input.cidId,
            input.sender,
            uint48(input.timestamp)
        );
    }

    function _verifyRegisterEnvelopeSignature(
        RegisterEnvelopeSigInput memory input,
        bytes calldata signature_
    ) private view returns (bool) {
        _assertSignatureTimestamp(input.timestamp);
        if (
            input.senderEmailCommitment == bytes32(0) ||
            input.senderAuthSubjectCommitment == bytes32(0)
        ) revert InvalidSignature();

        bytes32 structHash = keccak256(
            abi.encode(
                REGISTER_ENVELOPE_TYPEHASH,
                input.cidId,
                input.sender,
                input.signersCommitment,
                input.viewersCommitment,
                input.placementCommitment,
                input.senderEmailCommitment,
                input.senderAuthSubjectCommitment,
                input.orgIdCommitment,
                input.orgWallet,
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
        return
            FSSignatureValidation.isValid(
                input.sender,
                _hashTypedDataV4(structHash),
                signature_
            );
    }

    function amendSigner(
        string calldata pieceCid_,
        address recaller_,
        bytes32 oldCommitment_,
        bytes32 newCommitment_,
        uint256 timestamp_,
        bytes calldata signature_
    ) external onlyServer {
        if (oldCommitment_ == bytes32(0) || newCommitment_ == bytes32(0))
            revert ZeroSigner();

        bytes32 cidId = FSCommitmentLib.cidIdentifier(pieceCid_);
        EnvelopeRegistration storage file = _envelopeRegistrations[cidId];
        if (file.timestamp == 0) revert FileNotRegistered();
        _assertNotRevoked(file);
        _assertNotComplete(file);
        if (file.signatures[oldCommitment_].length != 0) revert AlreadySigned();
        if (!file.signerEmailRegistered[oldCommitment_]) revert InvalidSigner();
        if (file.signerEmailRegistered[newCommitment_])
            revert DuplicateCommitment();

        _assertRecallerAuthorized(file, recaller_);
        _assertSignatureTimestamp(timestamp_);

        bytes32 structHash = keccak256(
            abi.encode(
                AMEND_SIGNER_TYPEHASH,
                cidId,
                recaller_,
                oldCommitment_,
                newCommitment_,
                timestamp_,
                nonce[recaller_]
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        if (!FSSignatureValidation.isValid(recaller_, digest, signature_))
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
        FSCommitmentLib.sortCommitments(roster);
        file.signersCommitment = FSCommitmentLib
            .computeEmailSignerCommitmentMemory(roster, roster.length);
        for (uint256 i = 0; i < roster.length; i++) {
            file.signerRoster[i] = roster[i];
        }

        nonce[recaller_]++;
        emit SignerAmended(cidId, recaller_, oldCommitment_, newCommitment_);
    }

    function recallEnvelope(
        string calldata pieceCid_,
        address recaller_,
        uint256 timestamp_,
        bytes calldata signature_
    ) external onlyServer {
        bytes32 cidId = FSCommitmentLib.cidIdentifier(pieceCid_);
        EnvelopeRegistration storage file = _envelopeRegistrations[cidId];
        if (file.timestamp == 0) revert FileNotRegistered();
        _assertNotRevoked(file);
        _assertNotComplete(file);

        _assertRecallerAuthorized(file, recaller_);
        _assertSignatureTimestamp(timestamp_);

        bytes32 structHash = keccak256(
            abi.encode(
                RECALL_ENVELOPE_TYPEHASH,
                cidId,
                recaller_,
                file.orgIdCommitment,
                timestamp_,
                nonce[recaller_]
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        if (!FSSignatureValidation.isValid(recaller_, digest, signature_))
            revert InvalidSignature();

        file.revokedBeforeCompletedAt = uint48(timestamp_);
        file.revokedBy = recaller_;
        nonce[recaller_]++;
        emit EnvelopeRevokedBeforeComplete(
            cidId,
            recaller_,
            file.revokedBeforeCompletedAt
        );
    }

    function registerEnvelopeSignature(
        string calldata pieceCid_,
        address sender_,
        address signerWallet_,
        bytes32 signerEmailCommitment_,
        bytes32 authSubjectCommitment_,
        bytes20 dl3SignatureCommitment_,
        uint256 timestamp_,
        bytes calldata signature_,
        bytes32 completionsRoot_,
        uint8 leafSchemaVersion_
    ) external onlyServer {
        bytes32 cidId = FSCommitmentLib.cidIdentifier(pieceCid_);
        EnvelopeRegistration storage file = _envelopeRegistrations[cidId];

        if (file.timestamp == 0) revert FileNotRegistered();
        _assertNotRevoked(file);
        _assertNotComplete(file);
        if (file.signatures[signerEmailCommitment_].length != 0)
            revert AlreadySigned();

        if (
            !validateEnvelopeSigningSignature(
                pieceCid_,
                sender_,
                signerWallet_,
                signerEmailCommitment_,
                authSubjectCommitment_,
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
        emit EnvelopeSigned(
            cidId,
            sender_,
            signerWallet_,
            uint48(block.timestamp)
        );

        _markCompleteIfNeeded(file, cidId);
    }

    function isSigner(
        bytes32 cidId,
        bytes32 signerEmailCommitment_
    ) external view returns (bool) {
        return
            _envelopeRegistrations[cidId].signerEmailRegistered[
                signerEmailCommitment_
            ];
    }

    function hasSigned(
        bytes32 cidId,
        bytes32 signerEmailCommitment_
    ) external view returns (bool) {
        return
            _envelopeRegistrations[cidId]
                .signatures[signerEmailCommitment_]
                .length != 0;
    }

    /// @dev Signed count across the full signer roster.
    function rosterSignedCount(bytes32 cidId) external view returns (uint8) {
        EnvelopeRegistration storage file = _envelopeRegistrations[cidId];
        if (file.timestamp == 0) return 0;
        uint8 signed;
        for (uint256 i = 0; i < file.signerRoster.length; i++) {
            if (file.signatures[file.signerRoster[i]].length != 0) {
                signed++;
            }
        }
        return signed;
    }

    function validateEnvelopeRegistrationSignature(
        RegisterEnvelopeInput calldata input
    ) public view returns (bool) {
        bytes32[] memory roster = FSCommitmentLib.mergeSortedCommitments(
            input.requiredCommitments,
            input.optionalCommitments
        );
        RegisterEnvelopeSigInput memory sigInput = RegisterEnvelopeSigInput({
            cidId: FSCommitmentLib.cidIdentifier(input.pieceCid),
            sender: input.sender,
            signersCommitment: FSCommitmentLib
                .computeEmailSignerCommitmentMemory(roster, roster.length),
            viewersCommitment: FSCommitmentLib.computeEmailSignerCommitment(
                input.viewerEmailCommitments
            ),
            placementCommitment: input.placementCommitment,
            senderEmailCommitment: input.senderEmailCommitment,
            senderAuthSubjectCommitment: input.senderAuthSubjectCommitment,
            orgIdCommitment: input.orgIdCommitment,
            orgWallet: input.orgWallet,
            requiredHash: hashCommitments(input.requiredCommitments),
            optionalHash: hashCommitments(input.optionalCommitments),
            routingMode: input.routingMode,
            routingOrderHash: hashCommitments(input.routingOrder),
            quorumN: input.quorumN,
            quorumSetHash: hashCommitments(input.quorumSet),
            timestamp: input.timestamp
        });
        return _verifyRegisterEnvelopeSignature(sigInput, input.signature);
    }

    function validateEnvelopeSigningSignature(
        string calldata pieceCid_,
        address sender_,
        address signerWallet_,
        bytes32 signerEmailCommitment_,
        bytes32 authSubjectCommitment_,
        bytes20 dl3SignatureCommitment_,
        uint256 timestamp_,
        bytes calldata signature_,
        bytes32 completionsRoot_,
        uint8 leafSchemaVersion_
    ) public view returns (bool) {
        _assertSignatureTimestamp(timestamp_);

        EnvelopeRegistration storage file = _envelopeRegistrations[
            FSCommitmentLib.cidIdentifier(pieceCid_)
        ];
        if (!file.signerEmailRegistered[signerEmailCommitment_])
            revert InvalidSigner();
        if (file.sender != sender_) revert InvalidSender();
        _assertNotRevoked(file);
        _assertNotComplete(file);

        bytes32 cidId = FSCommitmentLib.cidIdentifier(pieceCid_);
        bytes32 structHash = keccak256(
            abi.encode(
                SIGN_ENVELOPE_TYPEHASH,
                cidId,
                sender_,
                signerWallet_,
                signerEmailCommitment_,
                authSubjectCommitment_,
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

    function validateEnvelopeAckSignature(
        string calldata pieceCid_,
        address sender_,
        address viewerWallet_,
        bytes32 viewerEmailCommitment_,
        bytes32 authSubjectCommitment_,
        uint256 timestamp_,
        bytes calldata signature_
    ) public view returns (bool) {
        _assertSignatureTimestamp(timestamp_);
        EnvelopeRegistration storage file = _envelopeRegistrations[
            FSCommitmentLib.cidIdentifier(pieceCid_)
        ];
        if (
            !file.viewerEmailRegistered[viewerEmailCommitment_] &&
            !file.signerEmailRegistered[viewerEmailCommitment_]
        ) revert InvalidSigner();
        if (file.sender != sender_) revert InvalidSender();
        _assertNotRevoked(file);
        _assertNotComplete(file);

        bytes32 cidId = FSCommitmentLib.cidIdentifier(pieceCid_);
        bytes32 structHash = keccak256(
            abi.encode(
                ACK_ENVELOPE_TYPEHASH,
                cidId,
                sender_,
                viewerWallet_,
                viewerEmailCommitment_,
                authSubjectCommitment_,
                timestamp_
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        return FSSignatureValidation.isValid(viewerWallet_, digest, signature_);
    }

    function cidIdentifier(
        string calldata pieceCid_
    ) public pure returns (bytes32) {
        return FSCommitmentLib.cidIdentifier(pieceCid_);
    }

    function _assertRecallerAuthorized(
        EnvelopeRegistration storage file,
        address recaller_
    ) private view {
        if (recaller_ == file.sender) return;
        if (file.orgWallet != address(0) && recaller_ == file.orgWallet) return;
        revert UnauthorizedRecaller();
    }

    function _assertNotRevoked(
        EnvelopeRegistration storage file
    ) private view {
        if (file.revokedBeforeCompletedAt != 0) revert EnvelopeRecalled();
    }

    function _assertNotComplete(
        EnvelopeRegistration storage file
    ) private view {
        if (file.completedAt != 0) revert EnvelopeAlreadyComplete();
    }

    function _routingComplete(
        EnvelopeRegistration storage file
    ) private view returns (bool) {
        if (file.quorumN > 0) {
            uint8 signed;
            for (uint256 i = 0; i < file.quorumSet.length; i++) {
                if (file.signatures[file.quorumSet[i]].length != 0) {
                    signed++;
                    if (signed >= file.quorumN) return true;
                }
            }
            return false;
        }
        return
            file.requiredSignaturesCount == file.requiredSignersCount &&
            file.requiredSignersCount > 0;
    }

    function _markCompleteIfNeeded(
        EnvelopeRegistration storage file,
        bytes32 cidId
    ) private {
        if (file.completedAt != 0) return;
        if (!_routingComplete(file)) return;
        file.completedAt = uint48(block.timestamp);
        emit EnvelopeCompleted(cidId, file.completedAt);
    }

    function _assertSignatureTimestamp(uint256 timestamp_) private view {
        if (timestamp_ > block.timestamp + SIGNATURE_CLOCK_DRIFT_TOLERANCE)
            revert SignatureFuture();
        if (block.timestamp > timestamp_ + SIGNATURE_VALIDITY_PERIOD)
            revert SignatureExpired();
    }

    function _rebuildRoster(
        EnvelopeRegistration storage file
    ) private view returns (bytes32[] memory roster) {
        roster = new bytes32[](file.signerRoster.length);
        for (uint256 i = 0; i < file.signerRoster.length; i++) {
            roster[i] = file.signerRoster[i];
        }
    }

    function _enforceSequentialOrder(
        EnvelopeRegistration storage file,
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
