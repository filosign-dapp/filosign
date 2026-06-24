const GAS_SETUP_MESSAGE =
	"Not enough ETH for network fees. Add a small amount of ETH to your paying account on Base, then try again.";

const GAS_ERROR_PATTERNS = [
	"insufficient funds for gas",
	"not enough funds for gas",
	"gas required exceeds allowance",
	"intrinsic gas too low",
	"max fee per gas less than block base fee",
	"exceeds block gas limit",
	"cannot afford gas",
	"fee cap less than block base fee",
] as const;

function errorMessage(err: unknown): string {
	if (err instanceof Error) return err.message;
	if (typeof err === "string") return err;
	return "";
}

export function formatGasSetupError(err: unknown): string | null {
	const message = errorMessage(err);
	if (!message) return null;

	const lower = message.toLowerCase();

	for (const pattern of GAS_ERROR_PATTERNS) {
		if (lower.includes(pattern)) return GAS_SETUP_MESSAGE;
	}

	if (
		lower.includes("insufficient funds") &&
		!lower.includes("allowance") &&
		!lower.includes("usdc") &&
		!lower.includes("erc20")
	) {
		return GAS_SETUP_MESSAGE;
	}

	if (
		lower.includes("insufficient") &&
		(lower.includes("gas") ||
			lower.includes("native") ||
			lower.includes("eth balance"))
	) {
		return GAS_SETUP_MESSAGE;
	}

	return null;
}
