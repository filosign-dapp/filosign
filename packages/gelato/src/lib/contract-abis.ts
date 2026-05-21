import type { ContractInterface } from "@ethersproject/contracts";
import { getContractAbi } from "@filosign/contracts";

/** Canonical ABIs from deployed definitions (local entry; selectors are chain-agnostic). */
export const validatorAbi = getContractAbi(
	"FSPaymentValidator",
	"local",
) as ContractInterface;
export const fileRegistryAbi = getContractAbi(
	"FSFileRegistry",
	"local",
) as ContractInterface;
/** ERC-20 balance/allowance interface (MockUSDC artifact; works for USDC). */
export const erc20BalanceAllowanceAbi = getContractAbi(
	"MockUSDC",
	"local",
) as ContractInterface;
