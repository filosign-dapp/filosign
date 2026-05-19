// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "./EFSCommon.sol";

error OnlyServer();
error SignatureExpired();
error SenderNotRegistered();
error BadSignersLength();
error DuplicateSigner(address signer);
error ZeroSigner();
error UnsortedSigners();
error FileAlreadyRegistered();
error FileNotRegistered();
error InvalidSigner();
error InvalidSender();
error AlreadySigned();
error InvalidSignature();
error InvalidSignersCommitment();
