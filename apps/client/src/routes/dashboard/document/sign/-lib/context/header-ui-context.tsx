import { createContext, type ReactNode, useMemo, useState } from "react";
import {
	useSignFile,
	useSignMeta,
	useSignPlacement,
	useSignSettlements,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { canEnableSignSubmit } from "@/src/routes/dashboard/document/sign/-lib/utils/submit-eligibility";

export type SignHeaderUiContextValue = {
	canSubmitSign: boolean;
	settlePending: boolean;
	rotateInviteOpen: boolean;
	setRotateInviteOpen: (open: boolean) => void;
	signConfirmOpen: boolean;
	setSignConfirmOpen: (open: boolean) => void;
};

export const SignHeaderUiContext =
	createContext<SignHeaderUiContextValue | null>(null);

export function SignHeaderUiProvider({ children }: { children: ReactNode }) {
	const { file } = useSignFile();
	const { isSender } = useSignMeta();
	const { canSubmitPlacementSign } = useSignPlacement();
	const { fileData, docCanvasBusy } = useSignViewer();
	const { trySettlePending, manualSettlePending } = useSignSettlements();

	const [rotateInviteOpen, setRotateInviteOpen] = useState(false);
	const [signConfirmOpen, setSignConfirmOpen] = useState(false);

	const docReady = Boolean(fileData) && !docCanvasBusy;
	const canSubmitSign = canEnableSignSubmit({
		canSubmitPlacementSign,
		docReady,
		firstViewedAt: file?.participantAccess?.firstViewedAt,
		isSender,
		serverCanSign: file?.participantAccess?.canSign,
	});
	const settlePending = trySettlePending || manualSettlePending;

	const value = useMemo(
		() => ({
			canSubmitSign,
			settlePending,
			rotateInviteOpen,
			setRotateInviteOpen,
			signConfirmOpen,
			setSignConfirmOpen,
		}),
		[canSubmitSign, settlePending, rotateInviteOpen, signConfirmOpen],
	);

	return (
		<SignHeaderUiContext.Provider value={value}>
			{children}
		</SignHeaderUiContext.Provider>
	);
}
