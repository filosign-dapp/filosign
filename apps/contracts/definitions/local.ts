export const definitions = {
  "0x7a69": {
    "FSManager": {
      "address": "0x73511669fd4dE447feD18BB79bAFeAC93aB7F31f",
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
          "name": "ECDSAInvalidSignature",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "length",
              "type": "uint256"
            }
          ],
          "name": "ECDSAInvalidSignatureLength",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "s",
              "type": "bytes32"
            }
          ],
          "name": "ECDSAInvalidSignatureS",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "ExceedsPlatformFeeBps",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "FileAlreadyFullySigned",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "FundOperationPaused",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "IncentiveAlreadyClaimed",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "IncentiveNotAttached",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "IncentiveRefundSignerAlreadySigned",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "IncentiveRefundTooEarly",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "IncentiveReleaseLengthMismatch",
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
          "name": "InvalidPayoutWallet",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidShortString",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "NotAllSigned",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "OnlyServer",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "OnlyServerOrFileRegistry",
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
              "internalType": "bytes32",
              "name": "cidId",
              "type": "bytes32"
            },
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "signerEmailCommitment",
              "type": "bytes32"
            },
            {
              "indexed": false,
              "internalType": "address",
              "name": "token",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "bytes32",
              "name": "memoHash",
              "type": "bytes32"
            }
          ],
          "name": "IncentiveAttached",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "cidId",
              "type": "bytes32"
            },
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "signerEmailCommitment",
              "type": "bytes32"
            },
            {
              "indexed": false,
              "internalType": "address",
              "name": "token",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "IncentiveRefunded",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "cidId",
              "type": "bytes32"
            }
          ],
          "name": "IncentivesReleased",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint8",
              "name": "oldFlags",
              "type": "uint8"
            },
            {
              "indexed": false,
              "internalType": "uint8",
              "name": "newFlags",
              "type": "uint8"
            }
          ],
          "name": "PauseFlagsUpdated",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint16",
              "name": "oldBps",
              "type": "uint16"
            },
            {
              "indexed": false,
              "internalType": "uint16",
              "name": "newBps",
              "type": "uint16"
            }
          ],
          "name": "PlatformFeeBpsUpdated",
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
          "inputs": [],
          "name": "BPS_DENOMINATOR",
          "outputs": [
            {
              "internalType": "uint16",
              "name": "",
              "type": "uint16"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "MAX_PLATFORM_FEE_BPS",
          "outputs": [
            {
              "internalType": "uint16",
              "name": "",
              "type": "uint16"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "PAUSE_ADMIN",
          "outputs": [
            {
              "internalType": "uint8",
              "name": "",
              "type": "uint8"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "PAUSE_ATTACH",
          "outputs": [
            {
              "internalType": "uint8",
              "name": "",
              "type": "uint8"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "PAUSE_PLATFORM_WITHDRAW",
          "outputs": [
            {
              "internalType": "uint8",
              "name": "",
              "type": "uint8"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "PAUSE_REFUND",
          "outputs": [
            {
              "internalType": "uint8",
              "name": "",
              "type": "uint8"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "PAUSE_RELEASE",
          "outputs": [
            {
              "internalType": "uint8",
              "name": "",
              "type": "uint8"
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
          "inputs": [
            {
              "internalType": "string",
              "name": "pieceCid_",
              "type": "string"
            },
            {
              "internalType": "bytes32",
              "name": "signerEmailCommitment_",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "token_",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount_",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "memoHash_",
              "type": "bytes32"
            }
          ],
          "name": "attachIncentive",
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
              "internalType": "bytes32",
              "name": "signerEmailCommitment_",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "token_",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount_",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "memoHash_",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "deadline_",
              "type": "uint256"
            },
            {
              "internalType": "uint8",
              "name": "v_",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "r_",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "s_",
              "type": "bytes32"
            }
          ],
          "name": "attachIncentiveWithPermit",
          "outputs": [],
          "stateMutability": "nonpayable",
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
          "name": "escrow",
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
              "internalType": "uint256",
              "name": "max_",
              "type": "uint256"
            }
          ],
          "name": "escrowSetDefaultMaxDepositPerTx",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "token_",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "maxAmount_",
              "type": "uint256"
            }
          ],
          "name": "escrowSetMaxDepositOverride",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "account_",
              "type": "address"
            },
            {
              "internalType": "bool",
              "name": "blacklisted_",
              "type": "bool"
            }
          ],
          "name": "escrowSetPayoutBlacklisted",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "account_",
              "type": "address"
            },
            {
              "internalType": "bool",
              "name": "blacklisted_",
              "type": "bool"
            }
          ],
          "name": "escrowSetSenderBlacklisted",
          "outputs": [],
          "stateMutability": "nonpayable",
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
              "internalType": "uint8",
              "name": "flag",
              "type": "uint8"
            }
          ],
          "name": "isFundOperationPaused",
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
          "inputs": [],
          "name": "pauseFlags",
          "outputs": [
            {
              "internalType": "uint8",
              "name": "",
              "type": "uint8"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "platformFeeBps",
          "outputs": [
            {
              "internalType": "uint16",
              "name": "",
              "type": "uint16"
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
              "internalType": "bytes32",
              "name": "signerEmailCommitment_",
              "type": "bytes32"
            }
          ],
          "name": "refundSignerIncentive",
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
              "internalType": "bytes32[]",
              "name": "signerEmailCommitments_",
              "type": "bytes32[]"
            },
            {
              "internalType": "address[]",
              "name": "payoutWallets_",
              "type": "address[]"
            }
          ],
          "name": "releaseIncentives",
          "outputs": [],
          "stateMutability": "nonpayable",
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
          "inputs": [
            {
              "internalType": "uint8",
              "name": "flags_",
              "type": "uint8"
            }
          ],
          "name": "setPauseFlags",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint16",
              "name": "bps_",
              "type": "uint16"
            }
          ],
          "name": "setPlatformFeeBps",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "token_",
              "type": "address"
            },
            {
              "internalType": "bool",
              "name": "allowed_",
              "type": "bool"
            }
          ],
          "name": "setTokenAllowed",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "token_",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount_",
              "type": "uint256"
            }
          ],
          "name": "sweepStrayToken",
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
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "token_",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount_",
              "type": "uint256"
            }
          ],
          "name": "withdrawPlatformRevenue",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ]
    },
    "FSFileRegistry": {
      "address": "0x3C2F631C8a3Cf09421976d8E8f847bbD1d2dCC39",
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
          "name": "ECDSAInvalidSignature",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "length",
              "type": "uint256"
            }
          ],
          "name": "ECDSAInvalidSignatureLength",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "s",
              "type": "bytes32"
            }
          ],
          "name": "ECDSAInvalidSignatureS",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "FileAlreadyFullySigned",
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
          "name": "IncentiveAlreadyAttached",
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
          "name": "InvalidSignersCommitment",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "OnlyManager",
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
          "inputs": [],
          "name": "INCENTIVE_REFUND_DELAY",
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
          "name": "clearSignerIncentive",
          "outputs": [],
          "stateMutability": "nonpayable",
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
          "name": "getIncentiveMemoHash",
          "outputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
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
          "name": "getIncentiveRefundNotBefore",
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
          "name": "getSignerIncentive",
          "outputs": [
            {
              "internalType": "address",
              "name": "token",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "claimed",
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
          "name": "markIncentiveClaimed",
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
              "internalType": "bytes32[]",
              "name": "allSignerEmailCommitments_",
              "type": "bytes32[]"
            },
            {
              "internalType": "address[]",
              "name": "payoutWallets_",
              "type": "address[]"
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
              "internalType": "bytes32",
              "name": "cidId",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "signerEmailCommitment_",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "token",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "memoHash_",
              "type": "bytes32"
            }
          ],
          "name": "setSignerIncentive",
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
      "address": "0x75CbAd88b8aE2e577B9d38567590b15D378Ad4f0",
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
          "name": "ECDSAInvalidSignature",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "length",
              "type": "uint256"
            }
          ],
          "name": "ECDSAInvalidSignatureLength",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "s",
              "type": "bytes32"
            }
          ],
          "name": "ECDSAInvalidSignatureS",
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
    },
    "FSEscrow": {
      "address": "0xe7b0A2f0A741e2Fb70Dd09a7A2d5B1ee36A7F3D9",
      "abi": [
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "inputs": [],
          "name": "DepositBalanceInvariantBroken",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "ExceedsMaxDeposit",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "ExceedsStrayBalance",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InsufficientBalance",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "OnlyManager",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "PayoutBlacklisted",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "ReentrancyGuardReentrantCall",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "token",
              "type": "address"
            }
          ],
          "name": "SafeERC20FailedOperation",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "SenderDepositBlacklisted",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "TokenNotSupported",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "ZeroAddress",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "ZeroAmount",
          "type": "error"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "token",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "Deposited",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "token",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "sender",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "fee",
              "type": "uint256"
            }
          ],
          "name": "PlatformFeeAccrued",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "token",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "PlatformRevenueWithdrawn",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "token",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "recipient",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "Released",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "token",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "StrayTokenSwept",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "token",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "bool",
              "name": "allowed",
              "type": "bool"
            }
          ],
          "name": "TokenAllowedUpdated",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "token",
              "type": "address"
            }
          ],
          "name": "accountedAssets",
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
              "name": "token",
              "type": "address"
            }
          ],
          "name": "allowedToken",
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
              "name": "account",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "token",
              "type": "address"
            }
          ],
          "name": "balances",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "defaultMaxDepositPerTx",
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
              "name": "token",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "deposit",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "token",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "deadline",
              "type": "uint256"
            },
            {
              "internalType": "uint8",
              "name": "v",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "r",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "s",
              "type": "bytes32"
            }
          ],
          "name": "depositWithPermit",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "manager",
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
              "name": "sender",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "token",
              "type": "address"
            }
          ],
          "name": "maxDepositOverride",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "maxAmount",
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
              "name": "account",
              "type": "address"
            }
          ],
          "name": "payoutBlacklisted",
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
              "name": "token",
              "type": "address"
            }
          ],
          "name": "platformRevenue",
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
              "name": "token",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "recipient",
              "type": "address"
            }
          ],
          "name": "release",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            }
          ],
          "name": "senderDepositBlacklisted",
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
              "name": "token_",
              "type": "address"
            },
            {
              "internalType": "bool",
              "name": "allowed_",
              "type": "bool"
            }
          ],
          "name": "setAllowedToken",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "max_",
              "type": "uint256"
            }
          ],
          "name": "setDefaultMaxDepositPerTx",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "token_",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "maxAmount_",
              "type": "uint256"
            }
          ],
          "name": "setMaxDepositOverride",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "account_",
              "type": "address"
            },
            {
              "internalType": "bool",
              "name": "blacklisted_",
              "type": "bool"
            }
          ],
          "name": "setPayoutBlacklisted",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "account_",
              "type": "address"
            },
            {
              "internalType": "bool",
              "name": "blacklisted_",
              "type": "bool"
            }
          ],
          "name": "setSenderDepositBlacklisted",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "token",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "payout",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "gross",
              "type": "uint256"
            },
            {
              "internalType": "uint16",
              "name": "feeBps",
              "type": "uint16"
            }
          ],
          "name": "settleIncentiveRelease",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "fee",
              "type": "uint256"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "token",
              "type": "address"
            }
          ],
          "name": "strayBalance",
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
              "name": "token",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "sweepStrayToken",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "token",
              "type": "address"
            }
          ],
          "name": "totalLiabilities",
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
              "name": "token",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "withdrawPlatformRevenue",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ]
    },
    "MockUSDC": {
      "address": "0xB581C9264f59BF0289fA76D61B2D0746dCE3C30D",
      "abi": [
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "initialOwner",
              "type": "address"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "inputs": [],
          "name": "ECDSAInvalidSignature",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "length",
              "type": "uint256"
            }
          ],
          "name": "ECDSAInvalidSignatureLength",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "s",
              "type": "bytes32"
            }
          ],
          "name": "ECDSAInvalidSignatureS",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "spender",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "allowance",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "needed",
              "type": "uint256"
            }
          ],
          "name": "ERC20InsufficientAllowance",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "sender",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "balance",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "needed",
              "type": "uint256"
            }
          ],
          "name": "ERC20InsufficientBalance",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "approver",
              "type": "address"
            }
          ],
          "name": "ERC20InvalidApprover",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "receiver",
              "type": "address"
            }
          ],
          "name": "ERC20InvalidReceiver",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "sender",
              "type": "address"
            }
          ],
          "name": "ERC20InvalidSender",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "spender",
              "type": "address"
            }
          ],
          "name": "ERC20InvalidSpender",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "deadline",
              "type": "uint256"
            }
          ],
          "name": "ERC2612ExpiredSignature",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "signer",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "owner",
              "type": "address"
            }
          ],
          "name": "ERC2612InvalidSigner",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "currentNonce",
              "type": "uint256"
            }
          ],
          "name": "InvalidAccountNonce",
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
              "internalType": "address",
              "name": "owner",
              "type": "address"
            }
          ],
          "name": "OwnableInvalidOwner",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            }
          ],
          "name": "OwnableUnauthorizedAccount",
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
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "owner",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "spender",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            }
          ],
          "name": "Approval",
          "type": "event"
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
              "name": "previousOwner",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "newOwner",
              "type": "address"
            }
          ],
          "name": "OwnershipTransferred",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "from",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            }
          ],
          "name": "Transfer",
          "type": "event"
        },
        {
          "inputs": [],
          "name": "DOMAIN_SEPARATOR",
          "outputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "owner",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "spender",
              "type": "address"
            }
          ],
          "name": "allowance",
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
              "name": "spender",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            }
          ],
          "name": "approve",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            }
          ],
          "name": "balanceOf",
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
          "inputs": [],
          "name": "decimals",
          "outputs": [
            {
              "internalType": "uint8",
              "name": "",
              "type": "uint8"
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
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "mint",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "name",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "owner",
              "type": "address"
            }
          ],
          "name": "nonces",
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
          "inputs": [],
          "name": "owner",
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
              "name": "owner",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "spender",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "deadline",
              "type": "uint256"
            },
            {
              "internalType": "uint8",
              "name": "v",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "r",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "s",
              "type": "bytes32"
            }
          ],
          "name": "permit",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "renounceOwnership",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "symbol",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "totalSupply",
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
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            }
          ],
          "name": "transfer",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "from",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            }
          ],
          "name": "transferFrom",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "newOwner",
              "type": "address"
            }
          ],
          "name": "transferOwnership",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ]
    }
  }
} as const;