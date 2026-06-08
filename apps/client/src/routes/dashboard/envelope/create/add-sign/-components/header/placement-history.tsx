import {
	ArrowClockwiseIcon,
	ArrowCounterClockwiseIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { DisabledTooltip } from "@/src/lib/components/ui/disabled-tooltip";
import { useAddSignChrome } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";

function HistoryButton({
	icon: Icon,
	label,
	disabled,
	disabledReason,
	onClick,
}: {
	icon: typeof ArrowCounterClockwiseIcon;
	label: string;
	disabled: boolean;
	disabledReason: string;
	onClick: () => void;
}) {
	const [spinning, setSpinning] = useState(false);
	const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
		};
	}, []);

	return (
		<DisabledTooltip disabled={disabled} reason={disabledReason} side="bottom">
			<Button
				type="button"
				variant="ghost"
				size="icon-lg"
				disabled={disabled}
				aria-label={label}
				title={disabled ? undefined : label}
				onClick={() => {
					if (disabled) return;
					onClick();
					setSpinning(true);
					if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
					spinTimerRef.current = setTimeout(() => {
						setSpinning(false);
						spinTimerRef.current = null;
					}, 200);
				}}
			>
				<motion.span
					initial={false}
					animate={{ rotate: spinning ? -90 : 0 }}
					transition={{ type: "spring", stiffness: 380, damping: 22 }}
					className="inline-flex"
				>
					<Icon className="size-4" />
				</motion.span>
			</Button>
		</DisabledTooltip>
	);
}

export function PlacementHistoryButtons() {
	const { undo, redo, canUndo, canRedo } = useAddSignChrome();
	const [liveMessage, setLiveMessage] = useState("");

	return (
		<div className="flex h-10.5 rounded-md items-center border border-border/50 bg-background/50">
			<span className="sr-only" aria-live="polite">
				{liveMessage}
			</span>
			<HistoryButton
				icon={ArrowCounterClockwiseIcon}
				label="Undo"
				disabled={!canUndo}
				disabledReason="Nothing to undo"
				onClick={() => {
					undo();
					setLiveMessage("Undone");
				}}
			/>
			<HistoryButton
				icon={ArrowClockwiseIcon}
				label="Redo"
				disabled={!canRedo}
				disabledReason="Nothing to redo"
				onClick={() => {
					redo();
					setLiveMessage("Redone");
				}}
			/>
		</div>
	);
}
