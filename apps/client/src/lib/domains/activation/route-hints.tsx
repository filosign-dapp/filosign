import { useLocation } from "@tanstack/react-router";
import { ActivationHintBanner } from "./hint-banner";
import { useActivationHints } from "./use-hints";

type ActivationRouteHintsProps = {
	currentPieceCid?: string | null;
	className?: string;
};

export function ActivationRouteHints({
	currentPieceCid,
	className,
}: ActivationRouteHintsProps) {
	const { pathname } = useLocation();
	const { hints, dismissHint, analyticsForHint, isLoading } =
		useActivationHints({
			pathname,
			currentPieceCid,
		});

	if (isLoading || hints.length === 0) return null;

	return (
		<ActivationHintBanner
			hints={hints}
			onDismiss={dismissHint}
			analyticsForHint={analyticsForHint}
			className={className}
		/>
	);
}
