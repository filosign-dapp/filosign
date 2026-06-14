import { MotionReveal } from "@filosign/motion";
import { XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { BackdropImage } from "@/src/lib/components/app/chrome/page-backdrop";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils";

export function FloatingPromptShell({
	children,
	titleId,
	headerImage,
	bodyBackdrop = "/images/stock_3.webp",
	onDismiss,
	className,
}: {
	children: ReactNode;
	titleId: string;
	headerImage?: string | null;
	bodyBackdrop?: string | null;
	onDismiss?: () => void;
	className?: string;
}) {
	return (
		<MotionReveal
			preset="smooth"
			delay={0.15}
			onlyOnce
			className={cn(
				"pointer-events-none fixed bottom-6 right-6 z-40 w-min(100vw-2rem,96)",
				className,
			)}
		>
			<article
				className="pointer-events-auto overflow-hidden rounded-large border border-border/50 bg-card text-card-foreground shadow-2xl ring-1 ring-foreground/5"
				aria-labelledby={titleId}
			>
				{headerImage ? (
					<div className="relative h-36 overflow-hidden">
						<img
							src={headerImage}
							alt=""
							className="absolute inset-0 size-full object-cover object-center"
						/>
						<div
							className="absolute inset-0 bg-linear-to-b from-black/10 via-transparent to-card opacity-30"
							aria-hidden
						/>
						{onDismiss ? (
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								className="absolute top-3 right-3 rounded-full bg-background/70 backdrop-blur-xs"
								onClick={onDismiss}
								aria-label="Dismiss"
							>
								<XIcon className="size-4" />
							</Button>
						) : null}
					</div>
				) : null}
				<div className="relative overflow-hidden">
					{bodyBackdrop ? <BackdropImage src={bodyBackdrop} /> : null}
					<div className="relative z-10">
						{!headerImage && onDismiss ? (
							<div className="flex justify-end px-4 pt-4">
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									className="rounded-full"
									onClick={onDismiss}
									aria-label="Dismiss"
								>
									<XIcon className="size-4" />
								</Button>
							</div>
						) : null}
						{children}
					</div>
				</div>
			</article>
		</MotionReveal>
	);
}
