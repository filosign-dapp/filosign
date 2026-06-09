import Logo from "@/src/lib/components/app/chrome/logo";
import { Skeleton } from "@/src/lib/components/ui/skeleton";
import {
	useDraftReviewMeta,
	useDraftReviewWarmSlice,
} from "@/src/routes/draft/review/-lib/context/context";

export function DraftChromeHeader() {
	const { displayTitle, payload, isWarm } = useDraftReviewMeta();
	const warm = useDraftReviewWarmSlice();

	const inviteEmail =
		payload.data?.accessKind === "warm" || payload.data?.accessKind === "cold"
			? payload.data.email
			: null;

	return (
		<header className="glass z-50 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/50 px-4 md:px-8">
			<div className="flex min-w-0 items-center gap-3 md:gap-4">
				<Logo className="px-0" textClassName="text-foreground" iconOnly />
				<div className="min-w-0">
					{displayTitle == null ? (
						<Skeleton className="h-5 w-48" />
					) : (
						<h3
							className="truncate text-base font-semibold text-foreground"
							title={displayTitle}
						>
							{displayTitle}
						</h3>
					)}
					<div className="flex min-w-0 items-center gap-2">
						<span className="truncate text-xs text-muted-foreground">
							View-only draft · not sent yet
						</span>
						{inviteEmail ? (
							<>
								<span className="text-xs text-muted-foreground">·</span>
								<span
									className="truncate text-xs text-muted-foreground"
									title={inviteEmail}
								>
									For {inviteEmail}
								</span>
							</>
						) : null}
					</div>
				</div>
			</div>

			{isWarm && warm.warmPanel === "wrongAccount" ? (
				<p className="hidden text-xs text-amber-700 dark:text-amber-300 sm:block">
					Switch to the invited account to unlock
				</p>
			) : null}
		</header>
	);
}
