import { useEffect, useMemo, useRef } from "react";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	createSaveOrgTemplateDeps,
	type SaveOrgTemplateDeps,
} from "../../lib/save-org-template/save-org-template";
import { clearAllTemplateDekCache } from "../../lib/template-dek-cache";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type { SaveOrgTemplateDeps } from "../../lib/save-org-template/save-org-template";

export function useSaveOrgTemplateDeps(): SaveOrgTemplateDeps | null {
	const { wallet } = useFilosignContext();
	const { rpc } = useFilosignRpc();
	const prevWalletRef = useRef<string | undefined>(undefined);

	useEffect(() => {
		const addr = wallet?.account?.address;
		if (
			prevWalletRef.current &&
			addr &&
			prevWalletRef.current.toLowerCase() !== addr.toLowerCase()
		) {
			clearAllTemplateDekCache();
		}
		prevWalletRef.current = addr;
	}, [wallet?.account?.address]);

	return useMemo(() => {
		if (!wallet) return null;
		return createSaveOrgTemplateDeps({ wallet, rpc });
	}, [wallet, rpc]);
}
