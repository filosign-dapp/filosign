export const definitions = {
	"0x14a34": {
		FSEnvelopeRegistry: {
			address: "0x2F8b5913aA908F1Dd797a9F1e7ff0A02c8fc6139",
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
					name: "DuplicateCommitment",
					type: "error",
				},
				{
					inputs: [],
					name: "ExceedsMaxSigners",
					type: "error",
				},
				{
					inputs: [],
					name: "ExceedsMaxViewers",
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
					name: "InvalidQuorumConfig",
					type: "error",
				},
				{
					inputs: [],
					name: "InvalidRoutingConfig",
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
					name: "SequentialOrderViolation",
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
					inputs: [],
					name: "SignatureFuture",
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
					name: "EnvelopeRegistered",
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
					name: "EnvelopeSigned",
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
							internalType: "bytes32",
							name: "oldCommitment",
							type: "bytes32",
						},
						{
							indexed: false,
							internalType: "bytes32",
							name: "newCommitment",
							type: "bytes32",
						},
					],
					name: "SignerAmended",
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
					name: "allRequiredSigned",
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
						{
							internalType: "bytes32",
							name: "oldCommitment_",
							type: "bytes32",
						},
						{
							internalType: "bytes32",
							name: "newCommitment_",
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
					name: "amendSigner",
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
					name: "envelopeRegistrations",
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
									name: "senderAuthSubjectCommitment",
									type: "bytes32",
								},
								{
									internalType: "uint8",
									name: "requiredSignersCount",
									type: "uint8",
								},
								{
									internalType: "uint8",
									name: "requiredSignaturesCount",
									type: "uint8",
								},
								{
									internalType: "uint8",
									name: "optionalSignersCount",
									type: "uint8",
								},
								{
									internalType: "uint8",
									name: "optionalSignaturesCount",
									type: "uint8",
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
									internalType: "uint8",
									name: "quorumN",
									type: "uint8",
								},
								{
									internalType: "uint8",
									name: "routingMode",
									type: "uint8",
								},
								{
									internalType: "uint256",
									name: "timestamp",
									type: "uint256",
								},
							],
							internalType:
								"struct FSEnvelopeRegistry.EnvelopeRegistrationView",
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
							internalType: "bytes32[]",
							name: "commitments_",
							type: "bytes32[]",
						},
					],
					name: "hashCommitments",
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
							internalType: "bytes32",
							name: "cidId",
							type: "bytes32",
						},
					],
					name: "quorumMet",
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
							components: [
								{
									internalType: "string",
									name: "pieceCid",
									type: "string",
								},
								{
									internalType: "address",
									name: "sender",
									type: "address",
								},
								{
									internalType: "bytes32[]",
									name: "requiredCommitments",
									type: "bytes32[]",
								},
								{
									internalType: "bytes32[]",
									name: "optionalCommitments",
									type: "bytes32[]",
								},
								{
									internalType: "bytes32[]",
									name: "viewerEmailCommitments",
									type: "bytes32[]",
								},
								{
									internalType: "bytes32",
									name: "senderEmailCommitment",
									type: "bytes32",
								},
								{
									internalType: "bytes32",
									name: "senderAuthSubjectCommitment",
									type: "bytes32",
								},
								{
									internalType: "bytes32",
									name: "orgIdCommitment",
									type: "bytes32",
								},
								{
									internalType: "uint8",
									name: "routingMode",
									type: "uint8",
								},
								{
									internalType: "bytes32[]",
									name: "routingOrder",
									type: "bytes32[]",
								},
								{
									internalType: "uint8",
									name: "quorumN",
									type: "uint8",
								},
								{
									internalType: "bytes32[]",
									name: "quorumSet",
									type: "bytes32[]",
								},
								{
									internalType: "uint256",
									name: "timestamp",
									type: "uint256",
								},
								{
									internalType: "bytes",
									name: "signature",
									type: "bytes",
								},
								{
									internalType: "bytes32",
									name: "placementCommitment",
									type: "bytes32",
								},
							],
							internalType: "struct FSEnvelopeRegistry.RegisterEnvelopeInput",
							name: "input",
							type: "tuple",
						},
					],
					name: "registerEnvelope",
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
							name: "authSubjectCommitment_",
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
					name: "registerEnvelopeSignature",
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
					inputs: [
						{
							internalType: "bytes32",
							name: "cidId",
							type: "bytes32",
						},
					],
					name: "rosterSignedCount",
					outputs: [
						{
							internalType: "uint8",
							name: "",
							type: "uint8",
						},
					],
					stateMutability: "view",
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
							name: "authSubjectCommitment_",
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
					name: "validateEnvelopeAckSignature",
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
							components: [
								{
									internalType: "string",
									name: "pieceCid",
									type: "string",
								},
								{
									internalType: "address",
									name: "sender",
									type: "address",
								},
								{
									internalType: "bytes32[]",
									name: "requiredCommitments",
									type: "bytes32[]",
								},
								{
									internalType: "bytes32[]",
									name: "optionalCommitments",
									type: "bytes32[]",
								},
								{
									internalType: "bytes32[]",
									name: "viewerEmailCommitments",
									type: "bytes32[]",
								},
								{
									internalType: "bytes32",
									name: "senderEmailCommitment",
									type: "bytes32",
								},
								{
									internalType: "bytes32",
									name: "senderAuthSubjectCommitment",
									type: "bytes32",
								},
								{
									internalType: "bytes32",
									name: "orgIdCommitment",
									type: "bytes32",
								},
								{
									internalType: "uint8",
									name: "routingMode",
									type: "uint8",
								},
								{
									internalType: "bytes32[]",
									name: "routingOrder",
									type: "bytes32[]",
								},
								{
									internalType: "uint8",
									name: "quorumN",
									type: "uint8",
								},
								{
									internalType: "bytes32[]",
									name: "quorumSet",
									type: "bytes32[]",
								},
								{
									internalType: "uint256",
									name: "timestamp",
									type: "uint256",
								},
								{
									internalType: "bytes",
									name: "signature",
									type: "bytes",
								},
								{
									internalType: "bytes32",
									name: "placementCommitment",
									type: "bytes32",
								},
							],
							internalType: "struct FSEnvelopeRegistry.RegisterEnvelopeInput",
							name: "input",
							type: "tuple",
						},
					],
					name: "validateEnvelopeRegistrationSignature",
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
							name: "authSubjectCommitment_",
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
					name: "validateEnvelopeSigningSignature",
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
			address: "0x95266eC602342638fAE0Ae209723d136cF8568ed",
			abi: [
				{
					inputs: [
						{
							internalType: "address",
							name: "envelopeRegistry_",
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
					name: "ExceedsMaxCommitments",
					type: "error",
				},
				{
					inputs: [],
					name: "ExceedsMaxLegs",
					type: "error",
				},
				{
					inputs: [],
					name: "FileNotRegistered",
					type: "error",
				},
				{
					inputs: [],
					name: "InsufficientTransferReceived",
					type: "error",
				},
				{
					inputs: [],
					name: "InvalidAmount",
					type: "error",
				},
				{
					inputs: [],
					name: "InvalidLegIndex",
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
					name: "LegAlreadyPaid",
					type: "error",
				},
				{
					inputs: [],
					name: "PayerCannotBeRecipient",
					type: "error",
				},
				{
					inputs: [],
					name: "RecipientCannotBeToken",
					type: "error",
				},
				{
					inputs: [],
					name: "RecipientCannotBeValidator",
					type: "error",
				},
				{
					inputs: [],
					name: "ReentrancyGuardReentrantCall",
					type: "error",
				},
				{
					inputs: [],
					name: "RequiredSigningStarted",
					type: "error",
				},
				{
					inputs: [],
					name: "RuleAlreadyCancelled",
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
					],
					name: "PaymentRuleCancelled",
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
							name: "payer",
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
					],
					name: "PaymentRuleUpdated",
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
							indexed: false,
							internalType: "uint256",
							name: "legIndex",
							type: "uint256",
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
					name: "PayoutLegExecuted",
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
					inputs: [
						{
							internalType: "uint256",
							name: "ruleId",
							type: "uint256",
						},
					],
					name: "cancelPayoutRule",
					outputs: [],
					stateMutability: "nonpayable",
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
					inputs: [],
					name: "envelopeRegistry",
					outputs: [
						{
							internalType: "contract IFSEnvelopeRegistry",
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
					inputs: [
						{
							internalType: "uint256",
							name: "ruleId",
							type: "uint256",
						},
						{
							internalType: "uint256",
							name: "legIndex",
							type: "uint256",
						},
					],
					name: "executePayoutLeg",
					outputs: [],
					stateMutability: "nonpayable",
					type: "function",
				},
				{
					inputs: [
						{
							internalType: "uint256",
							name: "ruleId",
							type: "uint256",
						},
						{
							internalType: "uint256",
							name: "legIndex",
							type: "uint256",
						},
					],
					name: "isLegPaid",
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
							internalType: "uint256",
							name: "ruleId",
							type: "uint256",
						},
					],
					name: "legPaidBitmap",
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
							name: "token_",
							type: "address",
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
							internalType: "uint64",
							name: "expiresAt_",
							type: "uint64",
						},
						{
							internalType: "bytes32[]",
							name: "signerCommitments_",
							type: "bytes32[]",
						},
						{
							components: [
								{
									internalType: "address",
									name: "recipient",
									type: "address",
								},
								{
									internalType: "uint256",
									name: "amount",
									type: "uint256",
								},
							],
							internalType: "struct FSPaymentValidator.PayoutLeg[]",
							name: "legs_",
							type: "tuple[]",
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
					name: "ruleLegs",
					outputs: [
						{
							components: [
								{
									internalType: "address",
									name: "recipient",
									type: "address",
								},
								{
									internalType: "uint256",
									name: "amount",
									type: "uint256",
								},
							],
							internalType: "struct FSPaymentValidator.PayoutLeg[]",
							name: "",
							type: "tuple[]",
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
							name: "token",
							type: "address",
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
							internalType: "uint64",
							name: "expiresAt",
							type: "uint64",
						},
						{
							internalType: "bool",
							name: "executed",
							type: "bool",
						},
						{
							internalType: "bool",
							name: "cancelled",
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
				{
					inputs: [
						{
							internalType: "uint256",
							name: "ruleId",
							type: "uint256",
						},
					],
					name: "unpaidLegCount",
					outputs: [
						{
							internalType: "uint256",
							name: "count",
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
							internalType: "uint64",
							name: "expiresAt_",
							type: "uint64",
						},
						{
							internalType: "bytes32[]",
							name: "signerCommitments_",
							type: "bytes32[]",
						},
						{
							components: [
								{
									internalType: "address",
									name: "recipient",
									type: "address",
								},
								{
									internalType: "uint256",
									name: "amount",
									type: "uint256",
								},
							],
							internalType: "struct FSPaymentValidator.PayoutLeg[]",
							name: "legs_",
							type: "tuple[]",
						},
					],
					name: "updatePayoutRule",
					outputs: [],
					stateMutability: "nonpayable",
					type: "function",
				},
			],
		},
		FSAttachmentRelease: {
			address: "0xc7E68eC88713539cE24D88642DC6F372497271A2",
			abi: [
				{
					inputs: [
						{
							internalType: "address",
							name: "envelopeRegistry_",
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
					name: "ExceedsMaxCommitments",
					type: "error",
				},
				{
					inputs: [],
					name: "FileNotRegistered",
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
					name: "RequiredSigningStarted",
					type: "error",
				},
				{
					inputs: [],
					name: "RuleAlreadyCancelled",
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
							indexed: false,
							internalType: "bytes20",
							name: "recipientsCommitment",
							type: "bytes20",
						},
						{
							indexed: false,
							internalType: "bytes32",
							name: "packetContentHash",
							type: "bytes32",
						},
					],
					name: "AttachmentReleased",
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
					],
					name: "AttachmentRuleCancelled",
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
							name: "sender",
							type: "address",
						},
						{
							indexed: false,
							internalType: "bytes20",
							name: "recipientsCommitment",
							type: "bytes20",
						},
						{
							indexed: false,
							internalType: "bytes32",
							name: "packetContentHash",
							type: "bytes32",
						},
						{
							indexed: false,
							internalType: "enum FSAttachmentRelease.ReleaseType",
							name: "releaseType",
							type: "uint8",
						},
					],
					name: "AttachmentRuleRegistered",
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
					name: "canRelease",
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
							internalType: "uint256",
							name: "ruleId",
							type: "uint256",
						},
					],
					name: "cancelAttachmentRule",
					outputs: [],
					stateMutability: "nonpayable",
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
					inputs: [],
					name: "envelopeRegistry",
					outputs: [
						{
							internalType: "contract IFSEnvelopeRegistry",
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
							internalType: "uint256",
							name: "ruleId",
							type: "uint256",
						},
					],
					name: "executeAttachmentRelease",
					outputs: [],
					stateMutability: "nonpayable",
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
							internalType: "bytes32",
							name: "cidId_",
							type: "bytes32",
						},
						{
							internalType: "bytes32",
							name: "packetContentHash_",
							type: "bytes32",
						},
						{
							internalType: "enum FSAttachmentRelease.ReleaseType",
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
							internalType: "uint64",
							name: "expiresAt_",
							type: "uint64",
						},
						{
							internalType: "bytes32[]",
							name: "signerCommitments_",
							type: "bytes32[]",
						},
						{
							internalType: "bytes32[]",
							name: "recipientEmailCommitments_",
							type: "bytes32[]",
						},
					],
					name: "registerAttachmentRule",
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
							internalType: "bytes32",
							name: "cidId",
							type: "bytes32",
						},
						{
							internalType: "address",
							name: "sender",
							type: "address",
						},
						{
							internalType: "bytes32",
							name: "packetContentHash",
							type: "bytes32",
						},
						{
							internalType: "bytes20",
							name: "recipientsCommitment",
							type: "bytes20",
						},
						{
							internalType: "enum FSAttachmentRelease.ReleaseType",
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
							internalType: "uint64",
							name: "expiresAt",
							type: "uint64",
						},
						{
							internalType: "bool",
							name: "released",
							type: "bool",
						},
						{
							internalType: "bool",
							name: "cancelled",
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
