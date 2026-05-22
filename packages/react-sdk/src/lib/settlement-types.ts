import type { InferClientOutputs } from "@orpc/client";
import type { AppRouterClient } from "../orpc/app-router-types";

export type SettlementRuleRow =
	InferClientOutputs<AppRouterClient>["settlements"]["listByFile"][number];
