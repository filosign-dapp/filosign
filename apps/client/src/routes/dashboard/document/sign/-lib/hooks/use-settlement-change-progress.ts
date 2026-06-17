import type { SettlementChangeProgressReporter } from "@filosign/react/files";
import { formatSettlementSimError } from "@filosign/react/files";
import { useCallback, useRef, useState } from "react";
import {
	createInitialSettlementChangeProgressState,
	markSettlementChangeProgressSuccess,
	reduceSettlementChangeProgress,
	type SettlementChangeMode,
	type SettlementChangeProgressState,
	settlementChangeProgressFailureState,
} from "@/src/lib/domains/settlements";
import type { WorkflowProgressStep } from "@/src/lib/domains/workflow-progress";
import { showAppErrorToast } from "@/src/lib/errors";

const SUCCESS_DISMISS_MS = 600;

type RunSettlementChangeArgs = {
	mode: SettlementChangeMode;
	plan: WorkflowProgressStep[];
	run: (onProgress: SettlementChangeProgressReporter) => Promise<void>;
	onSuccess: () => void;
};

export function useSettlementChangeProgress() {
	const [open, setOpen] = useState(false);
	const [state, setState] = useState<SettlementChangeProgressState | null>(
		null,
	);
	const [mode, setMode] = useState<SettlementChangeMode>("update");
	const retryRef = useRef<(() => Promise<void>) | null>(null);
	const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const dismiss = useCallback(() => {
		if (dismissTimerRef.current) {
			clearTimeout(dismissTimerRef.current);
			dismissTimerRef.current = null;
		}
		setOpen(false);
		setState(null);
		retryRef.current = null;
	}, []);

	const run = useCallback(
		async (args: RunSettlementChangeArgs) => {
			setMode(args.mode);
			setState(createInitialSettlementChangeProgressState(args.plan));
			setOpen(true);

			const execute = async () => {
				setState(createInitialSettlementChangeProgressState(args.plan));
				try {
					await args.run((event) => {
						setState((current) =>
							current
								? reduceSettlementChangeProgress(current, event)
								: current,
						);
					});
					setState((current) =>
						current ? markSettlementChangeProgressSuccess(current) : current,
					);
					args.onSuccess();
					dismissTimerRef.current = setTimeout(dismiss, SUCCESS_DISMISS_MS);
				} catch (error) {
					const message = formatSettlementSimError(error);
					setState((current) =>
						current
							? settlementChangeProgressFailureState(current, message)
							: current,
					);
					showAppErrorToast(message);
					throw error;
				}
			};

			retryRef.current = execute;
			await execute();
		},
		[dismiss],
	);

	const retry = useCallback(() => {
		void retryRef.current?.();
	}, []);

	const isModeActive = useCallback(
		(activeMode: SettlementChangeMode) => open && mode === activeMode,
		[mode, open],
	);

	return {
		open,
		state,
		mode,
		run,
		dismiss,
		retry,
		isModeActive,
	};
}
