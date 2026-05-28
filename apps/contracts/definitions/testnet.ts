export const definitions = {
	"0x14a34": {
		FSFileRegistry: {
			address: "0x5CcFe00A2703B66A30b498a20c3c5c33C88CfAF9",
			abi: [
				{
					inputs: [
						{
							internalType: "address",
							name: "server_",
							type: "address",
						},
					],
					stateMutability: "nonpayable",
					type: "constructor",
				},
				{
					inputs: [],
					name: "AlreadySigned",
					type: "error",
				},
				{
					inputs: [],
					name: "BadSignersLength",
					type: "error",
				},
				{
					inputs: [],
					name: "FileAlreadyRegistered",
					type: "error",
				},
				{
					inputs: [],
					name: "FileNotRegistered",
					type: "error",
				},
				{
					inputs: [],
					name: "InvalidSender",
					type: "error",
				},
				{
					inputs: [],
					name: "InvalidShortString",
					type: "error",
				},
				{
					inputs: [],
					name: "InvalidSignature",
					type: "error",
				},
				{
					inputs: [],
					name: "InvalidSigner",
					type: "error",
				},
				{
					inputs: [],
					name: "OnlyServer",
					type: "error",
				},
				{
					inputs: [
						{
							internalType: "address",
							name: "owner",
							type: "address",
						},
					],
					name: "OwnableInvalidOwner",
					type: "error",
				},
				{
					inputs: [
						{
							internalType: "address",
							name: "account",
							type: "address",
						},
					],
					name: "OwnableUnauthorizedAccount",
					type: "error",
				},
				{
					inputs: [],
					name: "ServerUnchanged",
					type: "error",
				},
				{
					inputs: [],
					name: "SignatureExpired",
					type: "error",
				},
				{
					inputs: [
						{
							internalType: "string",
							name: "str",
							type: "string",
						},
					],
					name: "StringTooLong",
					type: "error",
				},
				{
					inputs: [],
					name: "UnsortedSigners",
					type: "error",
				},
				{
					inputs: [],
					name: "ZeroAddress",
					type: "error",
				},
				{
					inputs: [],
					name: "ZeroSigner",
					type: "error",
				},
				{
					anonymous: false,
					inputs: [],
					name: "EIP712DomainChanged",
					type: "event",
				},
				{
					anonymous: false,
					inputs: [
						{
							indexed: true,
							internalType: "bytes32",
							name: "cidIdentifier",
							type: "bytes32",
						},
						{
							indexed: true,
							internalType: "address",
							name: "sender",
							type: "address",
						},
						{
							indexed: false,
							internalType: "uint48",
							name: "timestamp",
							type: "uint48",
						},
					],
					name: "FileRegistered",
					type: "event",
				},
				{
					anonymous: false,
					inputs: [
						{
							indexed: true,
							internalType: "bytes32",
							name: "cidIdentifier",
							type: "bytes32",
						},
						{
							indexed: true,
							internalType: "address",
							name: "sender",
							type: "address",
						},
						{
							indexed: true,
							internalType: "address",
							name: "signerWallet",
							type: "address",
						},
						{
							indexed: false,
							internalType: "uint48",
							name: "timestamp",
							type: "uint48",
						},
					],
					name: "FileSigned",
					type: "event",
				},
				{
					anonymous: false,
					inputs: [
						{
							indexed: true,
							internalType: "address",
							name: "previousOwner",
							type: "address",
						},
						{
							indexed: true,
							internalType: "address",
							name: "newOwner",
							type: "address",
						},
					],
					name: "OwnershipTransferStarted",
					type: "event",
				},
				{
					anonymous: false,
					inputs: [
						{
							indexed: true,
							internalType: "address",
							name: "previousOwner",
							type: "address",
						},
						{
							indexed: true,
							internalType: "address",
							name: "newOwner",
							type: "address",
						},
					],
					name: "OwnershipTransferred",
					type: "event",
				},
				{
					anonymous: false,
					inputs: [
						{
							indexed: true,
							internalType: "address",
							name: "previousServer",
							type: "address",
						},
						{
							indexed: true,
							internalType: "address",
							name: "newServer",
							type: "address",
						},
						{
							indexed: true,
							internalType: "address",
							name: "changedBy",
							type: "address",
						},
					],
					name: "ServerUpdated",
					type: "event",
				},
				{
					inputs: [],
					name: "acceptOwnership",
					outputs: [],
					stateMutability: "nonpayable",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "bytes32",
							name: "cidId",
							type: "bytes32",
						},
					],
					name: "allSigned",
					outputs: [
						{
							internalType: "bool",
							name: "",
							type: "bool",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "string",
							name: "pieceCid_",
							type: "string",
						},
					],
					name: "cidIdentifier",
					outputs: [
						{
							internalType: "bytes32",
							name: "",
							type: "bytes32",
						},
					],
					stateMutability: "pure",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "bytes32[]",
							name: "commitments_",
							type: "bytes32[]",
						},
					],
					name: "computeEmailSignerCommitment",
					outputs: [
						{
							internalType: "bytes20",
							name: "",
							type: "bytes20",
						},
					],
					stateMutability: "pure",
					type: "function",
				},
				{
					inputs: [],
					name: "eip712Domain",
					outputs: [
						{
							internalType: "bytes1",
							name: "fields",
							type: "bytes1",
						},
						{
							internalType: "string",
							name: "name",
							type: "string",
						},
						{
							internalType: "string",
							name: "version",
							type: "string",
						},
						{
							internalType: "uint256",
							name: "chainId",
							type: "uint256",
						},
						{
							internalType: "address",
							name: "verifyingContract",
							type: "address",
						},
						{
							internalType: "bytes32",
							name: "salt",
							type: "bytes32",
						},
						{
							internalType: "uint256[]",
							name: "extensions",
							type: "uint256[]",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "bytes32",
							name: "cidId",
							type: "bytes32",
						},
					],
					name: "fileRegistrations",
					outputs: [
						{
							components: [
								{
									internalType: "bytes32",
									name: "cidIdentifier",
									type: "bytes32",
								},
								{
									internalType: "address",
									name: "sender",
									type: "address",
								},
								{
									internalType: "bytes20",
									name: "signersCommitment",
									type: "bytes20",
								},
								{
									internalType: "bytes20",
									name: "viewersCommitment",
									type: "bytes20",
								},
								{
									internalType: "bytes32",
									name: "placementCommitment",
									type: "bytes32",
								},
								{
									internalType: "bytes32",
									name: "senderEmailCommitment",
									type: "bytes32",
								},
								{
									internalType: "bytes32",
									name: "senderPrivySubjectCommitment",
									type: "bytes32",
								},
								{
									internalType: "uint8",
									name: "signersCount",
									type: "uint8",
								},
								{
									internalType: "uint8",
									name: "signaturesCount",
									type: "uint8",
								},
								{
									internalType: "uint256",
									name: "timestamp",
									type: "uint256",
								},
							],
							internalType: "struct FSFileRegistry.FileRegistrationView",
							name: "",
							type: "tuple",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "bytes32",
							name: "cidId",
							type: "bytes32",
						},
						{
							internalType: "bytes32",
							name: "signerEmailCommitment_",
							type: "bytes32",
						},
					],
					name: "hasSigned",
					outputs: [
						{
							internalType: "bool",
							name: "",
							type: "bool",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "bytes32",
							name: "cidId",
							type: "bytes32",
						},
						{
							internalType: "bytes32",
							name: "signerEmailCommitment_",
							type: "bytes32",
						},
					],
					name: "isSigner",
					outputs: [
						{
							internalType: "bool",
							name: "",
							type: "bool",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "address",
							name: "",
							type: "address",
						},
					],
					name: "nonce",
					outputs: [
						{
							internalType: "uint256",
							name: "",
							type: "uint256",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [],
					name: "owner",
					outputs: [
						{
							internalType: "address",
							name: "",
							type: "address",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [],
					name: "pendingOwner",
					outputs: [
						{
							internalType: "address",
							name: "",
							type: "address",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "string",
							name: "pieceCid_",
							type: "string",
						},
						{
							internalType: "address",
							name: "sender_",
							type: "address",
						},
						{
							internalType: "bytes32[]",
							name: "signerEmailCommitments_",
							type: "bytes32[]",
						},
						{
							internalType: "bytes32[]",
							name: "viewerEmailCommitments_",
							type: "bytes32[]",
						},
						{
							internalType: "bytes32",
							name: "senderEmailCommitment_",
							type: "bytes32",
						},
						{
							internalType: "bytes32",
							name: "senderPrivySubjectCommitment_",
							type: "bytes32",
						},
						{
							internalType: "bytes32",
							name: "orgIdCommitment_",
							type: "bytes32",
						},
						{
							internalType: "uint256",
							name: "timestamp_",
							type: "uint256",
						},
						{
							internalType: "bytes",
							name: "signature_",
							type: "bytes",
						},
						{
							internalType: "bytes32",
							name: "placementCommitment_",
							type: "bytes32",
						},
					],
					name: "registerFile",
					outputs: [],
					stateMutability: "nonpayable",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "string",
							name: "pieceCid_",
							type: "string",
						},
						{
							internalType: "address",
							name: "sender_",
							type: "address",
						},
						{
							internalType: "address",
							name: "signerWallet_",
							type: "address",
						},
						{
							internalType: "bytes32",
							name: "signerEmailCommitment_",
							type: "bytes32",
						},
						{
							internalType: "bytes32",
							name: "privySubjectCommitment_",
							type: "bytes32",
						},
						{
							internalType: "bytes20",
							name: "dl3SignatureCommitment_",
							type: "bytes20",
						},
						{
							internalType: "uint256",
							name: "timestamp_",
							type: "uint256",
						},
						{
							internalType: "bytes",
							name: "signature_",
							type: "bytes",
						},
						{
							internalType: "bytes32",
							name: "completionsRoot_",
							type: "bytes32",
						},
						{
							internalType: "uint8",
							name: "leafSchemaVersion_",
							type: "uint8",
						},
					],
					name: "registerFileSignature",
					outputs: [],
					stateMutability: "nonpayable",
					type: "function",
				},
				{
					inputs: [],
					name: "renounceOwnership",
					outputs: [],
					stateMutability: "nonpayable",
					type: "function",
				},
				{
					inputs: [],
					name: "server",
					outputs: [
						{
							internalType: "address",
							name: "",
							type: "address",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "address",
							name: "newServer_",
							type: "address",
						},
					],
					name: "setServer",
					outputs: [],
					stateMutability: "nonpayable",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "address",
							name: "newOwner",
							type: "address",
						},
					],
					name: "transferOwnership",
					outputs: [],
					stateMutability: "nonpayable",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "string",
							name: "pieceCid_",
							type: "string",
						},
						{
							internalType: "address",
							name: "sender_",
							type: "address",
						},
						{
							internalType: "address",
							name: "viewerWallet_",
							type: "address",
						},
						{
							internalType: "bytes32",
							name: "viewerEmailCommitment_",
							type: "bytes32",
						},
						{
							internalType: "bytes32",
							name: "privySubjectCommitment_",
							type: "bytes32",
						},
						{
							internalType: "uint256",
							name: "timestamp_",
							type: "uint256",
						},
						{
							internalType: "bytes",
							name: "signature_",
							type: "bytes",
						},
					],
					name: "validateFileAckSignature",
					outputs: [
						{
							internalType: "bool",
							name: "",
							type: "bool",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "string",
							name: "pieceCid_",
							type: "string",
						},
						{
							internalType: "address",
							name: "sender_",
							type: "address",
						},
						{
							internalType: "bytes32[]",
							name: "signerEmailCommitments_",
							type: "bytes32[]",
						},
						{
							internalType: "bytes32[]",
							name: "viewerEmailCommitments_",
							type: "bytes32[]",
						},
						{
							internalType: "bytes32",
							name: "senderEmailCommitment_",
							type: "bytes32",
						},
						{
							internalType: "bytes32",
							name: "senderPrivySubjectCommitment_",
							type: "bytes32",
						},
						{
							internalType: "bytes32",
							name: "orgIdCommitment_",
							type: "bytes32",
						},
						{
							internalType: "uint256",
							name: "timestamp_",
							type: "uint256",
						},
						{
							internalType: "bytes",
							name: "signature_",
							type: "bytes",
						},
						{
							internalType: "bytes32",
							name: "placementCommitment_",
							type: "bytes32",
						},
					],
					name: "validateFileRegistrationSignature",
					outputs: [
						{
							internalType: "bool",
							name: "",
							type: "bool",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "string",
							name: "pieceCid_",
							type: "string",
						},
						{
							internalType: "address",
							name: "sender_",
							type: "address",
						},
						{
							internalType: "address",
							name: "signerWallet_",
							type: "address",
						},
						{
							internalType: "bytes32",
							name: "signerEmailCommitment_",
							type: "bytes32",
						},
						{
							internalType: "bytes32",
							name: "privySubjectCommitment_",
							type: "bytes32",
						},
						{
							internalType: "bytes20",
							name: "dl3SignatureCommitment_",
							type: "bytes20",
						},
						{
							internalType: "uint256",
							name: "timestamp_",
							type: "uint256",
						},
						{
							internalType: "bytes",
							name: "signature_",
							type: "bytes",
						},
						{
							internalType: "bytes32",
							name: "completionsRoot_",
							type: "bytes32",
						},
						{
							internalType: "uint8",
							name: "leafSchemaVersion_",
							type: "uint8",
						},
					],
					name: "validateFileSigningSignature",
					outputs: [
						{
							internalType: "bool",
							name: "",
							type: "bool",
						},
					],
					stateMutability: "view",
					type: "function",
				},
			],
		},
		FSPaymentValidator: {
			address: "0xD5762E443498AcC9060de3bc00458Cea5B4A43b5",
			abi: [
				{
					inputs: [
						{
							internalType: "address",
							name: "fileRegistry_",
							type: "address",
						},
						{
							internalType: "uint256",
							name: "deploymentChainId_",
							type: "uint256",
						},
					],
					stateMutability: "nonpayable",
					type: "constructor",
				},
				{
					inputs: [],
					name: "InvalidAmount",
					type: "error",
				},
				{
					inputs: [],
					name: "InvalidPayer",
					type: "error",
				},
				{
					inputs: [],
					name: "InvalidReleaseConfig",
					type: "error",
				},
				{
					inputs: [],
					name: "ReentrancyGuardReentrantCall",
					type: "error",
				},
				{
					inputs: [],
					name: "RuleAlreadyExecuted",
					type: "error",
				},
				{
					inputs: [],
					name: "RuleNotExecutable",
					type: "error",
				},
				{
					inputs: [
						{
							internalType: "address",
							name: "token",
							type: "address",
						},
					],
					name: "SafeERC20FailedOperation",
					type: "error",
				},
				{
					inputs: [],
					name: "UnauthorizedRuleRegistration",
					type: "error",
				},
				{
					anonymous: false,
					inputs: [
						{
							indexed: true,
							internalType: "uint256",
							name: "ruleId",
							type: "uint256",
						},
						{
							indexed: true,
							internalType: "bytes32",
							name: "cidId",
							type: "bytes32",
						},
						{
							indexed: true,
							internalType: "address",
							name: "payer",
							type: "address",
						},
						{
							indexed: false,
							internalType: "address",
							name: "recipient",
							type: "address",
						},
						{
							indexed: false,
							internalType: "address",
							name: "token",
							type: "address",
						},
						{
							indexed: false,
							internalType: "uint256",
							name: "amount",
							type: "uint256",
						},
						{
							indexed: false,
							internalType: "enum FSPaymentValidator.ReleaseType",
							name: "releaseType",
							type: "uint8",
						},
					],
					name: "PaymentRuleRegistered",
					type: "event",
				},
				{
					anonymous: false,
					inputs: [
						{
							indexed: true,
							internalType: "uint256",
							name: "ruleId",
							type: "uint256",
						},
						{
							indexed: true,
							internalType: "bytes32",
							name: "cidId",
							type: "bytes32",
						},
						{
							indexed: true,
							internalType: "address",
							name: "recipient",
							type: "address",
						},
						{
							indexed: false,
							internalType: "uint256",
							name: "amount",
							type: "uint256",
						},
					],
					name: "PayoutExecuted",
					type: "event",
				},
				{
					inputs: [
						{
							internalType: "uint256",
							name: "ruleId",
							type: "uint256",
						},
					],
					name: "canExecute",
					outputs: [
						{
							internalType: "bool",
							name: "",
							type: "bool",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [],
					name: "deploymentChainId",
					outputs: [
						{
							internalType: "uint256",
							name: "",
							type: "uint256",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "uint256",
							name: "ruleId",
							type: "uint256",
						},
					],
					name: "executePayout",
					outputs: [],
					stateMutability: "nonpayable",
					type: "function",
				},
				{
					inputs: [],
					name: "fileRegistry",
					outputs: [
						{
							internalType: "contract IFSFileRegistry",
							name: "",
							type: "address",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [],
					name: "nextRuleId",
					outputs: [
						{
							internalType: "uint256",
							name: "",
							type: "uint256",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "address",
							name: "payer_",
							type: "address",
						},
						{
							internalType: "address",
							name: "recipient_",
							type: "address",
						},
						{
							internalType: "address",
							name: "token_",
							type: "address",
						},
						{
							internalType: "uint256",
							name: "amount_",
							type: "uint256",
						},
						{
							internalType: "bytes32",
							name: "cidId_",
							type: "bytes32",
						},
						{
							internalType: "enum FSPaymentValidator.ReleaseType",
							name: "releaseType_",
							type: "uint8",
						},
						{
							internalType: "bytes32",
							name: "specificSignerCommitment_",
							type: "bytes32",
						},
						{
							internalType: "uint8",
							name: "thresholdN_",
							type: "uint8",
						},
						{
							internalType: "bytes32[]",
							name: "signerCommitments_",
							type: "bytes32[]",
						},
					],
					name: "registerRule",
					outputs: [
						{
							internalType: "uint256",
							name: "ruleId",
							type: "uint256",
						},
					],
					stateMutability: "nonpayable",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "bytes32",
							name: "cidId_",
							type: "bytes32",
						},
					],
					name: "ruleIdsForCid",
					outputs: [
						{
							internalType: "uint256[]",
							name: "",
							type: "uint256[]",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "uint256",
							name: "ruleId",
							type: "uint256",
						},
					],
					name: "rules",
					outputs: [
						{
							internalType: "address",
							name: "payer",
							type: "address",
						},
						{
							internalType: "address",
							name: "recipient",
							type: "address",
						},
						{
							internalType: "address",
							name: "token",
							type: "address",
						},
						{
							internalType: "uint256",
							name: "amount",
							type: "uint256",
						},
						{
							internalType: "bytes32",
							name: "cidId",
							type: "bytes32",
						},
						{
							internalType: "enum FSPaymentValidator.ReleaseType",
							name: "releaseType",
							type: "uint8",
						},
						{
							internalType: "bytes32",
							name: "specificSignerCommitment",
							type: "bytes32",
						},
						{
							internalType: "uint8",
							name: "thresholdN",
							type: "uint8",
						},
						{
							internalType: "bool",
							name: "executed",
							type: "bool",
						},
					],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "uint256",
							name: "ruleId",
							type: "uint256",
						},
					],
					name: "signerCommitments",
					outputs: [
						{
							internalType: "bytes32[]",
							name: "",
							type: "bytes32[]",
						},
					],
					stateMutability: "view",
					type: "function",
				},
			],
		},
	},
} as const;
