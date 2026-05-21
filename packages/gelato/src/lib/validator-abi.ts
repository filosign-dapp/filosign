export const validatorAbi = [
	{
		type: "function",
		name: "canExecute",
		inputs: [{ name: "ruleId", type: "uint256" }],
		outputs: [{ type: "bool" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "executePayout",
		inputs: [{ name: "ruleId", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "ruleIdsForCid",
		inputs: [{ name: "cidId_", type: "bytes32" }],
		outputs: [{ type: "uint256[]" }],
		stateMutability: "view",
	},
] as const;
