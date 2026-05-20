import type { RefObject } from "react";
import type { SignDocumentFileContentProps } from "./SignDocumentFileContent";
import { SignDocumentFileContent } from "./SignDocumentFileContent";

export type SignDocumentBodyProps = {
	containerRef: RefObject<HTMLDivElement | null>;
	documentRef: RefObject<HTMLDivElement | null>;
	fileContent: SignDocumentFileContentProps;
};

export function SignDocumentBody({
	containerRef,
	documentRef,
	fileContent,
}: SignDocumentBodyProps) {
	return (
		<div ref={containerRef} className="flex-1 h-full overflow-auto">
			<div ref={documentRef} className="relative w-full h-full bg-background">
				<SignDocumentFileContent {...fileContent} />
			</div>
		</div>
	);
}
