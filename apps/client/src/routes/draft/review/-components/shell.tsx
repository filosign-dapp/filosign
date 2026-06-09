import type { ReactNode } from "react";

export function DraftReviewShell({ children }: { children: ReactNode }) {
	return (
		<div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
			{children}
		</div>
	);
}
