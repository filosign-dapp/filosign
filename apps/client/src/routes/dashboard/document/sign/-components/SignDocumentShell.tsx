import type { ReactNode } from "react";

export function SignDocumentShell({
	stickyHeader,
	body,
	children,
}: {
	stickyHeader: ReactNode;
	body: ReactNode;
	children?: ReactNode;
}) {
	return (
		<div className="fixed inset-0 bg-background flex flex-col">
			<div className="shrink-0 sticky top-0 z-50 bg-background border-b border-border">
				{stickyHeader}
			</div>
			<div className="flex-1 flex overflow-hidden bg-muted/5">{body}</div>
			{children}
		</div>
	);
}
