import type { ReactNode } from "react";
import { DraftChromeHeader } from "@/src/routes/draft/review/-components/header/draft-chrome";
import { DraftReviewWorkspace } from "@/src/routes/draft/review/-components/workspace";
import { DraftReviewShell } from "./shell";

export function DraftReviewBody() {
	return <DraftReviewWorkspace />;
}

export function DraftReviewStickyHeader() {
	return <DraftChromeHeader />;
}

export function DraftReviewShellLayout({ children }: { children?: ReactNode }) {
	return (
		<DraftReviewShell>
			<DraftReviewStickyHeader />
			<DraftReviewBody />
			{children}
		</DraftReviewShell>
	);
}
