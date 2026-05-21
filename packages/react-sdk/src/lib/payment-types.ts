import type { InferClientOutputs } from "@orpc/client";
import type { AppRouterClient } from "../orpc/app-router-types";

export type PaymentRuleRow =
	InferClientOutputs<AppRouterClient>["payments"]["listByFile"][number];
