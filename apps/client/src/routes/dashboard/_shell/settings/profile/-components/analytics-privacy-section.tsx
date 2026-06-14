import { useFilosignContext } from "@filosign/react";
import { ChartLineUpIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import env from "@/src/env";
import { Switch } from "@/src/lib/components/ui/switch";
import { clientAnalyticsConsentRequired } from "@/src/lib/deployment";
import { showAppErrorToast } from "@/src/lib/errors";
import { useAnalyticsConsent } from "@/src/lib/privacy-consent/consent-context";
import { clearPostHogClientStorage } from "@/src/lib/privacy-consent/consent-storage";
import {
	ANALYTICS_PRIVACY_POLICY_VERSION,
	analyticsPrivacyPolicyUrl,
} from "@/src/lib/privacy-consent/policy";
import { recordAnalyticsConsentOnServer } from "@/src/lib/privacy-consent/record-consent";
import { safeAsync } from "@/src/lib/utils/safe";
import { ProfileSection } from "./profile-section";

export function AnalyticsPrivacySection() {
	const posthogEnabled = env.VITE_POSTHOG_ENABLED === true;
	const consentRequired = clientAnalyticsConsentRequired();
	const { rpc, rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();
	const { analyticsAllowed, acceptAnalytics, withdrawAnalytics } =
		useAnalyticsConsent();
	const [pending, setPending] = useState(false);

	const privacyQuery = useQuery({
		...rpcQuery.users.privacyState.queryOptions(),
		enabled: posthogEnabled && consentRequired,
	});

	if (!posthogEnabled || !consentRequired) {
		return null;
	}

	const privacyUrl = analyticsPrivacyPolicyUrl(env.VITE_ASTRO_URL);

	const persistMutation = useMutation({
		meta: { suppressErrorToast: true },
		mutationFn: async (enabled: boolean) => {
			setPending(true);
			const [, err] = await safeAsync(async () => {
				if (enabled) {
					acceptAnalytics();
					await recordAnalyticsConsentOnServer(rpc, "granted");
					return;
				}
				withdrawAnalytics();
				clearPostHogClientStorage();
				await recordAnalyticsConsentOnServer(rpc, "withdrawn");
			});
			setPending(false);
			if (err) {
				showAppErrorToast(err);
				throw err;
			}
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.users.privacyState.key(),
			});
		},
	});

	return (
		<ProfileSection
			icon={<ChartLineUpIcon className="size-4" aria-hidden="true" />}
			title="Product analytics"
			description="Optional usage analytics to improve Filosign. Document contents are never included."
		>
			<div className="flex items-center justify-between gap-4">
				<div className="space-y-1 text-sm">
					<p className="text-foreground">
						{analyticsAllowed ? "Analytics enabled" : "Analytics disabled"}
					</p>
					<p className="text-pretty text-muted-foreground">
						Policy version {ANALYTICS_PRIVACY_POLICY_VERSION}.{" "}
						<a
							href={privacyUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="underline underline-offset-2 hover:text-foreground"
						>
							Privacy Policy
						</a>
					</p>
				</div>
				<Switch
					checked={analyticsAllowed}
					disabled={
						pending || privacyQuery.isPending || persistMutation.isPending
					}
					onCheckedChange={(checked) => {
						void persistMutation.mutateAsync(checked);
					}}
					aria-label="Toggle product analytics"
				/>
			</div>
		</ProfileSection>
	);
}
