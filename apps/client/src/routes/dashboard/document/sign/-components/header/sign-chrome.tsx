import { ArrowLeftIcon } from "@phosphor-icons/react";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Button } from "@/src/lib/components/ui/button";
import { Skeleton } from "@/src/lib/components/ui/skeleton";
import { SignHeaderSignButton } from "@/src/routes/dashboard/document/sign/-components/header/sign-button";
import { SignHeaderActions } from "@/src/routes/dashboard/document/sign/-components/header/sign-header-actions";
import {
	useSignFile,
	useSignMeta,
	useSignNavigation,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";

function documentTitle(
	fileData: ReturnType<typeof useSignViewer>["fileData"],
	pieceCid: string,
): string {
	const name = fileData?.metadata.name ?? fileData?.documents[0]?.name;
	if (name?.trim()) return name.trim();
	return pieceCid.length > 12 ? `${pieceCid.slice(0, 8)}…` : pieceCid;
}

export function SignChromeHeader() {
	const { navigate } = useSignNavigation();
	const { pieceCid, file } = useSignFile();
	const { formatAddress } = useSignMeta();
	const { fileData } = useSignViewer();

	const title = documentTitle(fileData, pieceCid);

	return (
		<header className="glass z-50 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/50 px-4 md:px-8">
			<div className="flex min-w-0 items-center gap-3 md:gap-4">
				<Logo className="px-0" textClassName="text-foreground" iconOnly />
				<div className="min-w-0">
					<h3
						className="truncate text-base font-semibold text-foreground"
						title={title}
					>
						{title}
					</h3>
					{file ? (
						<div className="flex min-w-0 items-center gap-2">
							<Button
								type="button"
								variant="link"
								size="sm"
								className="h-auto shrink-0 gap-1.5 px-0 text-xs text-muted-foreground"
								onClick={() => navigate({ to: "/dashboard" })}
							>
								<ArrowLeftIcon className="size-3.5" weight="bold" />
								Dashboard
							</Button>
							<span className="truncate text-xs text-muted-foreground">
								From {formatAddress(file.sender)}
							</span>
						</div>
					) : (
						<Skeleton className="mt-0.5 h-3 w-36" />
					)}
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-2 md:gap-3">
				<SignHeaderActions />
				<SignHeaderSignButton label="Sign envelope" density="comfortable" />
			</div>
		</header>
	);
}
