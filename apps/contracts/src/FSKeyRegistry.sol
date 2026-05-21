// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import "./errors/EFSKeyRegistry.sol";
import "./interfaces/IFSManager.sol";
import "./libraries/FSSignatureValidation.sol";

contract FSKeyRegistry is EIP712 {
    struct KeygenData {
        bytes16 salt_pin;
        bytes16 salt_seed;
        bytes16 salt_challenge;
        bytes20 commitment_kyber_pk;
        bytes20 commitment_dilithium_pk;
    }

    mapping(address => KeygenData) public keygenData;
    IFSManager public immutable manager;

    event KeygenDataRegistered(address indexed user);

    modifier onlyServer() {
        if (!manager.isServer(msg.sender)) revert InvalidServer();
        _;
    }

    constructor() EIP712("FSKeyRegistry", "1") {
        manager = IFSManager(msg.sender); // expect msg.sender to be fsmanager
    }

    function isRegistered(address user_) public view returns (bool) {
        return
            keygenData[user_].commitment_kyber_pk != bytes20(0) ||
            keygenData[user_].commitment_dilithium_pk != bytes20(0);
    }

    bytes32 private constant REGISTER_KEYGEN_DATA_TYPEHASH =
        keccak256(
            "RegisterKeygenData(address from,bytes16 salt_pin,bytes16 salt_seed,bytes16 salt_challenge,bytes20 commitment_kyber_pk,bytes20 commitment_dilithium_pk)"
        );

    function registerKeygenData(
        bytes16 salt_pin_,
        bytes16 salt_seed_,
        bytes16 salt_challenge_,
        bytes20 commitment_kyber_pk_,
        bytes20 commitment_dilithium_pk_,
        bytes calldata signature_,
        address walletAddress_
    ) external onlyServer {
        if (salt_pin_ == bytes16(0)) revert InvalidSaltPin();
        if (salt_seed_ == bytes16(0)) revert InvalidSaltSeed();
        if (commitment_kyber_pk_ == bytes20(0))
            revert InvalidCommitmentKyberPk();
        if (commitment_dilithium_pk_ == bytes20(0))
            revert InvalidCommitmentDilithiumPk();
        if (isRegistered(walletAddress_)) revert DataAlreadyRegistered();

        require(
            validateKeygenDataRegistrationSignature(
                salt_pin_,
                salt_seed_,
                salt_challenge_,
                commitment_kyber_pk_,
                commitment_dilithium_pk_,
                signature_,
                walletAddress_
            ),
            InvalidRegistrantSignature()
        );

        keygenData[walletAddress_] = KeygenData({
            salt_pin: salt_pin_,
            salt_seed: salt_seed_,
            salt_challenge: salt_challenge_,
            commitment_kyber_pk: commitment_kyber_pk_,
            commitment_dilithium_pk: commitment_dilithium_pk_
        });

        emit KeygenDataRegistered(walletAddress_);
    }

    function validateKeygenDataRegistrationSignature(
        bytes16 salt_pin_,
        bytes16 salt_seed_,
        bytes16 salt_challenge_,
        bytes20 commitment_kyber_pk_,
        bytes20 commitment_dilithium_pk_,
        bytes calldata signature_,
        address walletAddress_
    ) public view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(
                REGISTER_KEYGEN_DATA_TYPEHASH,
                walletAddress_,
                salt_pin_,
                salt_seed_,
                salt_challenge_,
                commitment_kyber_pk_,
                commitment_dilithium_pk_
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        return
            FSSignatureValidation.isValid(walletAddress_, digest, signature_);
    }
}
