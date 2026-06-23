export const ALLOWED_SPONSOR_METHODS = new Set([
	"pm_sponsorUserOperation",
	"pm_getPaymasterData",
	"pm_getPaymasterStubData",
	"eth_sendUserOperation",
	"eth_estimateUserOperationGas",
]);

export const ALLOWED_READ_METHODS = new Set([
	"eth_getUserOperationReceipt",
	"eth_getUserOperationByHash",
	"eth_supportedEntryPoints",
	"pimlico_getUserOperationGasPrice",
	"pimlico_getUserOperationStatus",
	"eth_chainId",
]);

export type PimlicoMethodKind = "sponsor" | "read";

export function classifyPimlicoMethod(
	method: string,
): PimlicoMethodKind | null {
	if (ALLOWED_SPONSOR_METHODS.has(method)) return "sponsor";
	if (ALLOWED_READ_METHODS.has(method)) return "read";
	return null;
}
