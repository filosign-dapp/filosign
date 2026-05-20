import { useSignRefs } from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { SignDocumentFileContent } from "./file-content";

export function SignDocumentBody() {
	const { containerRef, documentRef } = useSignRefs();
	return (
		<div ref={containerRef} className="flex-1 h-full overflow-auto">
			<div ref={documentRef} className="relative w-full h-full bg-background">
				<SignDocumentFileContent />
			</div>
		</div>
	);
}
