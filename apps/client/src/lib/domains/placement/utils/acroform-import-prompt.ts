export function shouldAutoOpenAcroformImport(args: {
	detectedCount: number;
	currentDocumentFieldCount: number;
	alreadyOfferedThisSession: boolean;
}): boolean {
	return (
		args.detectedCount > 0 &&
		args.currentDocumentFieldCount === 0 &&
		!args.alreadyOfferedThisSession
	);
}
