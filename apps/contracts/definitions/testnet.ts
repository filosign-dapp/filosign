export const definitions = {
  "0x14a34": {
    "FSManager": {
      "address": "0x13B7c847F5C69CB899fcDFf713BF42C3bF5516ea",
      "abi": [
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "treasury_",
              "type": "address"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "inputs": [],
          "name": "ApproveSignatureExpired",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "CannotApproveSelf",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidApproveNonce",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidApproveSignature",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidShortString",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "OnlyServer",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "SenderAlreadyApproved",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "SenderNotApproved",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "SenderNotRegistered",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "str",
              "type": "string"
            }
          ],
          "name": "StringTooLong",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "ZeroAddress",
          "type": "error"
        },
        {
          "anonymous": false,
          "inputs": [],
          "name": "EIP712DomainChanged",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "recipient",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "sender",
              "type": "address"
            }
          ],
          "name": "SenderApproved",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "recipient",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "sender",
              "type": "address"
            }
          ],
          "name": "SenderRevoked",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "name": "approveNonce",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "recipient_",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "nonce_",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "deadline_",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "signature_",
              "type": "bytes"
            }
          ],
          "name": "approveSender",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "name": "approvedSenders",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "eip712Domain",
          "outputs": [
            {
              "internalType": "bytes1",
              "name": "fields",
              "type": "bytes1"
            },
            {
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "version",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "chainId",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "verifyingContract",
              "type": "address"
            },
            {
              "internalType": "bytes32",
              "name": "salt",
              "type": "bytes32"
            },
            {
              "internalType": "uint256[]",
              "name": "extensions",
              "type": "uint256[]"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "fileRegistry",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "account_",
              "type": "address"
            }
          ],
          "name": "isRegistered",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "keyRegistry",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            }
          ],
          "name": "revokeSender",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "server",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint8",
              "name": "version_",
              "type": "uint8"
            }
          ],
          "name": "setActiveVersion",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "treasury",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "recipient_",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "nonce_",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "deadline_",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "signature_",
              "type": "bytes"
            }
          ],
          "name": "validateApproveSenderSignature",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "version",
          "outputs": [
            {
              "internalType": "uint8",
              "name": "",
              "type": "uint8"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ]
    },
    "FSFileRegistry": {
      "address": "0xffd23AE937143b9d3F38F5A33DeDE869190E148A",
      "abi": [
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "inputs": [],
          "name": "AlreadySigned",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "BadSignersLength",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "FileAlreadyRegistered",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "FileNotRegistered",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidSender",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidShortString",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidSignature",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidSigner",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "OnlyServer",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "SenderNotRegistered",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "SignatureExpired",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "str",
              "type": "string"
            }
          ],
          "name": "StringTooLong",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "UnsortedSigners",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "ZeroSigner",
          "type": "error"
        },
        {
          "anonymous": false,
          "inputs": [],
          "name": "EIP712DomainChanged",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "cidIdentifier",
              "type": "bytes32"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "sender",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint48",
              "name": "timestamp",
              "type": "uint48"
            }
          ],
          "name": "FileRegistered",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "cidIdentifier",
              "type": "bytes32"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "sender",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "signerWallet",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint48",
              "name": "timestamp",
              "type": "uint48"
            }
          ],
          "name": "FileSigned",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "cidId",
              "type": "bytes32"
            }
          ],
          "name": "allSigned",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "pieceCid_",
              "type": "string"
            }
          ],
          "name": "cidIdentifier",
          "outputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ],
          "stateMutability": "pure",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32[]",
              "name": "commitments_",
              "type": "bytes32[]"
            }
          ],
          "name": "computeEmailSignerCommitment",
          "outputs": [
            {
              "internalType": "bytes20",
              "name": "",
              "type": "bytes20"
            }
          ],
          "stateMutability": "pure",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "eip712Domain",
          "outputs": [
            {
              "internalType": "bytes1",
              "name": "fields",
              "type": "bytes1"
            },
            {
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "version",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "chainId",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "verifyingContract",
              "type": "address"
            },
            {
              "internalType": "bytes32",
              "name": "salt",
              "type": "bytes32"
            },
            {
              "internalType": "uint256[]",
              "name": "extensions",
              "type": "uint256[]"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "cidId",
              "type": "bytes32"
            }
          ],
          "name": "fileRegistrations",
          "outputs": [
            {
              "components": [
                {
                  "internalType": "bytes32",
                  "name": "cidIdentifier",
                  "type": "bytes32"
                },
                {
                  "internalType": "address",
                  "name": "sender",
                  "type": "address"
                },
                {
                  "internalType": "bytes20",
                  "name": "signersCommitment",
                  "type": "bytes20"
                },
                {
                  "internalType": "bytes20",
                  "name": "viewersCommitment",
                  "type": "bytes20"
                },
                {
                  "internalType": "bytes32",
                  "name": "placementCommitment",
                  "type": "bytes32"
                },
                {
                  "internalType": "bytes32",
                  "name": "senderEmailCommitment",
                  "type": "bytes32"
                },
                {
                  "internalType": "bytes32",
                  "name": "senderPrivySubjectCommitment",
                  "type": "bytes32"
                },
                {
                  "internalType": "uint8",
                  "name": "signersCount",
                  "type": "uint8"
                },
                {
                  "internalType": "uint8",
                  "name": "signaturesCount",
                  "type": "uint8"
                },
                {
                  "internalType": "uint256",
                  "name": "timestamp",
                  "type": "uint256"
                }
              ],
              "internalType": "struct FSFileRegistry.FileRegistrationView",
              "name": "",
              "type": "tuple"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "cidId",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "signerEmailCommitment_",
              "type": "bytes32"
            }
          ],
          "name": "hasSigned",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "cidId",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "signerEmailCommitment_",
              "type": "bytes32"
            }
          ],
          "name": "isSigner",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "manager",
          "outputs": [
            {
              "internalType": "contract IFSManager",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "name": "nonce",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "pieceCid_",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            },
            {
              "internalType": "bytes32[]",
              "name": "signerEmailCommitments_",
              "type": "bytes32[]"
            },
            {
              "internalType": "bytes32[]",
              "name": "viewerEmailCommitments_",
              "type": "bytes32[]"
            },
            {
              "internalType": "bytes32",
              "name": "senderEmailCommitment_",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "senderPrivySubjectCommitment_",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "orgIdCommitment_",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "timestamp_",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "signature_",
              "type": "bytes"
            },
            {
              "internalType": "bytes32",
              "name": "placementCommitment_",
              "type": "bytes32"
            }
          ],
          "name": "registerFile",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "pieceCid_",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "signerWallet_",
              "type": "address"
            },
            {
              "internalType": "bytes32",
              "name": "signerEmailCommitment_",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "privySubjectCommitment_",
              "type": "bytes32"
            },
            {
              "internalType": "bytes20",
              "name": "dl3SignatureCommitment_",
              "type": "bytes20"
            },
            {
              "internalType": "uint256",
              "name": "timestamp_",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "signature_",
              "type": "bytes"
            },
            {
              "internalType": "bytes32",
              "name": "completionsRoot_",
              "type": "bytes32"
            },
            {
              "internalType": "uint8",
              "name": "leafSchemaVersion_",
              "type": "uint8"
            }
          ],
          "name": "registerFileSignature",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "pieceCid_",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "viewerWallet_",
              "type": "address"
            },
            {
              "internalType": "bytes32",
              "name": "viewerEmailCommitment_",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "privySubjectCommitment_",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "timestamp_",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "signature_",
              "type": "bytes"
            }
          ],
          "name": "validateFileAckSignature",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "pieceCid_",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            },
            {
              "internalType": "bytes32[]",
              "name": "signerEmailCommitments_",
              "type": "bytes32[]"
            },
            {
              "internalType": "bytes32[]",
              "name": "viewerEmailCommitments_",
              "type": "bytes32[]"
            },
            {
              "internalType": "bytes32",
              "name": "senderEmailCommitment_",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "senderPrivySubjectCommitment_",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "orgIdCommitment_",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "timestamp_",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "signature_",
              "type": "bytes"
            },
            {
              "internalType": "bytes32",
              "name": "placementCommitment_",
              "type": "bytes32"
            }
          ],
          "name": "validateFileRegistrationSignature",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "pieceCid_",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "signerWallet_",
              "type": "address"
            },
            {
              "internalType": "bytes32",
              "name": "signerEmailCommitment_",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "privySubjectCommitment_",
              "type": "bytes32"
            },
            {
              "internalType": "bytes20",
              "name": "dl3SignatureCommitment_",
              "type": "bytes20"
            },
            {
              "internalType": "uint256",
              "name": "timestamp_",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "signature_",
              "type": "bytes"
            },
            {
              "internalType": "bytes32",
              "name": "completionsRoot_",
              "type": "bytes32"
            },
            {
              "internalType": "uint8",
              "name": "leafSchemaVersion_",
              "type": "uint8"
            }
          ],
          "name": "validateFileSigningSignature",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ]
    },
    "FSKeyRegistry": {
      "address": "0xAC6BAddD7d997cF302AF0375b87039fde5a1aB24",
      "abi": [
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "inputs": [],
          "name": "DataAlreadyRegistered",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidCommitmentDilithiumPk",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidCommitmentKyberPk",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidRegistrantSignature",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidSaltPin",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidSaltSeed",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidServer",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidShortString",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "str",
              "type": "string"
            }
          ],
          "name": "StringTooLong",
          "type": "error"
        },
        {
          "anonymous": false,
          "inputs": [],
          "name": "EIP712DomainChanged",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "user",
              "type": "address"
            }
          ],
          "name": "KeygenDataRegistered",
          "type": "event"
        },
        {
          "inputs": [],
          "name": "eip712Domain",
          "outputs": [
            {
              "internalType": "bytes1",
              "name": "fields",
              "type": "bytes1"
            },
            {
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "version",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "chainId",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "verifyingContract",
              "type": "address"
            },
            {
              "internalType": "bytes32",
              "name": "salt",
              "type": "bytes32"
            },
            {
              "internalType": "uint256[]",
              "name": "extensions",
              "type": "uint256[]"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "user_",
              "type": "address"
            }
          ],
          "name": "isRegistered",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "name": "keygenData",
          "outputs": [
            {
              "internalType": "bytes16",
              "name": "salt_pin",
              "type": "bytes16"
            },
            {
              "internalType": "bytes16",
              "name": "salt_seed",
              "type": "bytes16"
            },
            {
              "internalType": "bytes16",
              "name": "salt_challenge",
              "type": "bytes16"
            },
            {
              "internalType": "bytes20",
              "name": "commitment_kyber_pk",
              "type": "bytes20"
            },
            {
              "internalType": "bytes20",
              "name": "commitment_dilithium_pk",
              "type": "bytes20"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "manager",
          "outputs": [
            {
              "internalType": "contract IFSManager",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes16",
              "name": "salt_pin_",
              "type": "bytes16"
            },
            {
              "internalType": "bytes16",
              "name": "salt_seed_",
              "type": "bytes16"
            },
            {
              "internalType": "bytes16",
              "name": "salt_challenge_",
              "type": "bytes16"
            },
            {
              "internalType": "bytes20",
              "name": "commitment_kyber_pk_",
              "type": "bytes20"
            },
            {
              "internalType": "bytes20",
              "name": "commitment_dilithium_pk_",
              "type": "bytes20"
            },
            {
              "internalType": "bytes",
              "name": "signature_",
              "type": "bytes"
            },
            {
              "internalType": "address",
              "name": "walletAddress_",
              "type": "address"
            }
          ],
          "name": "registerKeygenData",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes16",
              "name": "salt_pin_",
              "type": "bytes16"
            },
            {
              "internalType": "bytes16",
              "name": "salt_seed_",
              "type": "bytes16"
            },
            {
              "internalType": "bytes16",
              "name": "salt_challenge_",
              "type": "bytes16"
            },
            {
              "internalType": "bytes20",
              "name": "commitment_kyber_pk_",
              "type": "bytes20"
            },
            {
              "internalType": "bytes20",
              "name": "commitment_dilithium_pk_",
              "type": "bytes20"
            },
            {
              "internalType": "bytes",
              "name": "signature_",
              "type": "bytes"
            },
            {
              "internalType": "address",
              "name": "walletAddress_",
              "type": "address"
            }
          ],
          "name": "validateKeygenDataRegistrationSignature",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ]
    }
  }
} as const;