import { useFilosignContext } from "@filosign/react";
import {
	deriveRecoveryPhraseFromWallet,
	useStoredKeygenData,
} from "@filosign/react/auth";
import { KeyIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { RecoveryPhraseDialog } from "@/src/lib/auth/recovery-phrase-dialog";
import { Button } from "@/src/lib/components/ui/button";
import { showAppErrorToast } from "@/src/lib/errors";
import { ProfileSection } from "@/src/routes/dashboard/_shell/settings/profile/-components/profile-section";

export function RecoveryPhraseSection() {
	const { wallet, wasm } = useFilosignContext();
	const { data: storedKeygenData, isPending } = useStoredKeygenData();
	const [phrase, setPhrase] = useState<string | null>(null);
	const [isExporting, setIsExporting] = useState(false);

	const handleExport = async () => {
		if (!wallet || !storedKeygenData) return;
		setIsExporting(true);
		try {
			const derived = await deriveRecoveryPhraseFromWallet({
				wallet,
				wasm,
				storedKeygenData,
			});
			setPhrase(derived);
		} catch (error) {
			showAppErrorToast(error);
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<>
			<ProfileSection
				icon={<KeyIcon className="size-4" aria-hidden="true" />}
				title="Recovery phrase"
				description="Back up your 24-word recovery phrase if your wallet cannot unlock your session."
			>
				<p className="text-sm text-muted-foreground">
					Your phrase is derived from your wallet on this device. Filosign never
					stores it on our servers.
				</p>
				<Button
					type="button"
					variant="outline"
					className="mt-4"
					disabled={isPending || !storedKeygenData || isExporting}
					isLoading={isExporting}
					onClick={() => void handleExport()}
				>
					Export recovery phrase
				</Button>
			</ProfileSection>
			<RecoveryPhraseDialog
				variant="profile-export"
				phrase={phrase}
				onConfirmSaved={() => setPhrase(null)}
			/>
		</>
	);
}
