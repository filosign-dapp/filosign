import type { ReactNode } from "react";
import { SignHeaderDialogs } from "@/src/routes/dashboard/document/sign/-components/header";
import { SignChromeHeader } from "@/src/routes/dashboard/document/sign/-components/header/sign-chrome";
import { SignDocumentWorkspace } from "@/src/routes/dashboard/document/sign/-components/workspace";
import { SignHeaderUiProvider } from "@/src/routes/dashboard/document/sign/-lib/context/header-ui-context";
import { SignDocumentShell } from "./shell";

export function SignDocumentBody() {
	return <SignDocumentWorkspace />;
}

export function SignDocumentStickyHeader() {
	return (
		<>
			<SignChromeHeader />
			<SignHeaderDialogs />
		</>
	);
}

export function SignShellLayout({ children }: { children?: ReactNode }) {
	return (
		<SignHeaderUiProvider>
			<SignDocumentShell>
				<SignDocumentStickyHeader />
				<SignDocumentBody />
				{children}
			</SignDocumentShell>
		</SignHeaderUiProvider>
	);
}
