import { SignHeaderSignedStatus } from "@/src/routes/dashboard/document/sign/-components/header/signed-status";
import { SettlementHeaderBadge } from "@/src/routes/dashboard/document/sign/-components/settlement-header-badge";
import { SettlementRevokeAllowanceButton } from "@/src/routes/dashboard/document/sign/-components/settlement-revoke-allowance-button";
import {
	useSignMeta,
	useSignSettlements,
	useSignSigning,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { useSignHeaderUi } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-header-ui";

type SignHeaderSettlementStripProps = {
	layout: "centered" | "inline";
};

export function SignHeaderSettlementStrip({
	layout,
}: SignHeaderSettlementStripProps) {
	const { alreadySigned } = useSignSigning();
	const { isSender } = useSignMeta();
	const {
		rules: settlementRules,
		revokePending,
		onRevokeAllowance,
	} = useSignSettlements();
	const { settlePending } = useSignHeaderUi();

	if (!alreadySigned && settlementRules.length === 0) return null;

	return (
		<div
			className={
				layout === "centered"
					? "flex flex-wrap items-center justify-center gap-2 px-3 py-2 border-b border-border bg-secondary/40"
					: "flex flex-wrap items-center gap-2 mt-2"
			}
		>
			<SettlementHeaderBadge rules={settlementRules} />
			{layout === "centered" ? (
				<SettlementRevokeAllowanceButton
					rules={settlementRules}
					isSender={isSender}
					revokePending={revokePending}
					settlePending={settlePending}
					onRevokeAllowance={onRevokeAllowance}
				/>
			) : null}
			<SignHeaderSignedStatus />
		</div>
	);
}
