import type { ReactNode } from "react";

export function SignDocumentShell({ children }: { children: ReactNode }) {
	return (
		<div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
			{children}
		</div>
	);
}
