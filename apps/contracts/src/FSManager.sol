// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import "./FSFileRegistry.sol";
import "./FSKeyRegistry.sol";
import "./errors/EFSCommon.sol";
import "./errors/EFSFileRegistry.sol";
import "./errors/EFSManager.sol";

contract FSManager is EIP712 {
    using ECDSA for bytes32;

    address public fileRegistry;
    address public keyRegistry;

    address public immutable server;
    address public immutable treasury;

    uint8 public version = 2;

    mapping(address => mapping(address => bool)) public approvedSenders;
    mapping(address => uint256) public approveNonce;

    bytes32 private constant APPROVE_SENDER_TYPEHASH =
        keccak256(
            "ApproveSender(address recipient,address sender,uint256 nonce,uint256 deadline)"
        );

    event SenderApproved(address indexed recipient, address indexed sender);
    event SenderRevoked(address indexed recipient, address indexed sender);

    modifier onlyServer() {
        if (msg.sender != server) revert OnlyServer();
        _;
    }

    constructor(address treasury_) EIP712("FSManager", "1") {
        if (treasury_ == address(0)) revert ZeroAddress();
        server = msg.sender;
        treasury = treasury_;
        fileRegistry = address(new FSFileRegistry());
        keyRegistry = address(new FSKeyRegistry());
    }

    function setActiveVersion(uint8 version_) external onlyServer {
        version = version_;
    }

    function isRegistered(address account_) public view returns (bool) {
        return FSKeyRegistry(keyRegistry).isRegistered(account_);
    }

    function approveSender(
        address recipient_,
        address sender_,
        uint256 nonce_,
        uint256 deadline_,
        bytes calldata signature_
    ) external onlyServer {
        if (block.timestamp > deadline_) revert ApproveSignatureExpired();
        if (nonce_ != approveNonce[recipient_]) revert InvalidApproveNonce();

        if (!isRegistered(sender_)) revert SenderNotRegistered();
        if (approvedSenders[recipient_][sender_])
            revert SenderAlreadyApproved();
        if (recipient_ == sender_) revert CannotApproveSelf();

        if (
            !validateApproveSenderSignature(
                recipient_,
                sender_,
                nonce_,
                deadline_,
                signature_
            )
        ) revert InvalidApproveSignature();

        approveNonce[recipient_] = nonce_ + 1;
        approvedSenders[recipient_][sender_] = true;
        emit SenderApproved(recipient_, sender_);
    }

    function validateApproveSenderSignature(
        address recipient_,
        address sender_,
        uint256 nonce_,
        uint256 deadline_,
        bytes calldata signature_
    ) public view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(
                APPROVE_SENDER_TYPEHASH,
                recipient_,
                sender_,
                nonce_,
                deadline_
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature_);
        return recovered == recipient_;
    }

    function revokeSender(address sender_) external {
        if (!approvedSenders[msg.sender][sender_]) revert SenderNotApproved();
        approvedSenders[msg.sender][sender_] = false;
        emit SenderRevoked(msg.sender, sender_);
    }
}
