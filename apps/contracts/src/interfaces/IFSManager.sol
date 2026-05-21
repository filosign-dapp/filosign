// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Auto-generated from src/FSManager.sol — DO NOT EDIT (regenerate with the script only)

interface IFSManager {
    function fileRegistry() external view returns (address);
    function keyRegistry() external view returns (address);
    function treasury() external view returns (address);
    function version() external view returns (uint8);
    function isServer(address key) external view returns (bool);
    function approvedSenders(address key, address key1) external view returns (bool);
    function approveNonce(address key) external view returns (uint256);
    event ServerAdded();
    event ServerRemoved();
    event SenderApproved();
    event SenderRevoked();
    function addServer(address server_) external;
    function removeServer(address server_) external;
    function setActiveVersion(uint8 version_) external;
    function isRegistered(address account_) external view returns (bool);
    function approveSender(address recipient_, address sender_, uint256 nonce_, uint256 deadline_, bytes calldata signature_) external;
    function validateApproveSenderSignature(address recipient_, address sender_, uint256 nonce_, uint256 deadline_, bytes calldata signature_) external view returns (bool);
    function revokeSender(address sender_) external;
}
