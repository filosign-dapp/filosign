import {
	billingEnabled,
	type Deployment,
	deploymentBannerMessage,
} from "@filosign/shared";
import env from "@/src/env";

export function clientDeployment(): Deployment {
	return env.VITE_DEPLOYMENT;
}

export function billingUiEnabled(): boolean {
	return billingEnabled(env.VITE_DEPLOYMENT);
}

export function deploymentBannerText(): string | null {
	return deploymentBannerMessage(env.VITE_DEPLOYMENT);
}
