import {
	SignHeaderDesktop,
	SignHeaderDialogs,
	SignHeaderMobile,
} from "@/src/routes/dashboard/document/sign/-components/header";
import { SignHeaderUiProvider } from "@/src/routes/dashboard/document/sign/-lib/context/header-ui-context";

export function SignDocumentStickyHeader() {
	return (
		<SignHeaderUiProvider>
			<SignHeaderMobile />
			<SignHeaderDesktop />
			<SignHeaderDialogs />
		</SignHeaderUiProvider>
	);
}
