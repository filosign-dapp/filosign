import { MotionReveal } from "@filosign/motion";
import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import type { EvaluatedActivationHint } from "@filosign/shared";
import { XIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Button, buttonVariants } from "@/src/lib/components/ui/button";

type ActivationHintBannerProps = {
	hints: EvaluatedActivationHint[];
	onDismiss: (hintId: EvaluatedActivationHint["id"]) => void;
	analyticsForHint: (
		hintId: EvaluatedActivationHint["id"],
	) => Record<string, string | number>;
	className?: string;
};

export function ActivationHintBanner({
	hints,
	onDismiss,
	analyticsForHint,
	className,
}: ActivationHintBannerProps) {
	const captureAppEvent = useCaptureAppEvent();
	const shownRef = useRef<Set<string>>(new Set());
	const hint = hints[0];

	useEffect(() => {
		if (!hint || shownRef.current.has(hint.id)) return;
		shownRef.current.add(hint.id);
		captureAppEvent(
			CLIENT_ANALYTICS_EVENTS.activationHintShown,
			analyticsForHint(hint.id),
		);
	}, [analyticsForHint, captureAppEvent, hint]);

	if (!hint) return null;

	const href = hint.resolvedHref;
	const isExternal = href?.startsWith("http");

	return (
		<MotionReveal preset="smooth" delay={0.05} onlyOnce className={className}>
			<div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-muted/40 px-4 py-3">
				<div className="min-w-0 space-y-1">
					<p className="text-sm font-medium text-foreground">{hint.title}</p>
					<p className="text-sm text-muted-foreground">{hint.body}</p>
					{href ? (
						<div className="pt-1">
							{isExternal ? (
								<a
									href={href}
									target="_blank"
									rel="noreferrer"
									className={buttonVariants({
										variant: "secondary",
										size: "sm",
									})}
								>
									Learn more
								</a>
							) : (
								<Link
									to={href}
									className={buttonVariants({
										variant: "secondary",
										size: "sm",
									})}
								>
									Learn more
								</Link>
							)}
						</div>
					) : null}
				</div>
				{hint.dismissible ? (
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label="Dismiss hint"
						onClick={() => {
							captureAppEvent(
								CLIENT_ANALYTICS_EVENTS.activationHintDismissed,
								analyticsForHint(hint.id),
							);
							onDismiss(hint.id);
						}}
					>
						<XIcon className="size-4" />
					</Button>
				) : null}
			</div>
		</MotionReveal>
	);
}
