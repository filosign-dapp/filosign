import type { ReactNode } from "react";
import { DraftReviewShellLayout } from "@/src/routes/draft/review/-components/body";
import {
	type DraftReviewContextValue,
	DraftReviewProvider,
} from "@/src/routes/draft/review/-lib/context/context";

function DraftReviewRoot({
	value,
	children,
}: {
	value: DraftReviewContextValue;
	children: ReactNode;
}) {
	return <DraftReviewProvider value={value}>{children}</DraftReviewProvider>;
}

function DraftReviewShell({ children }: { children?: ReactNode }) {
	return <DraftReviewShellLayout>{children}</DraftReviewShellLayout>;
}

export const DraftReview = {
	Root: DraftReviewRoot,
	Shell: DraftReviewShell,
};
