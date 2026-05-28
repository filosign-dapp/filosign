/** Default overlay size for placed fields on the add-sign canvas. */
export function signatureFieldBoxCssPx(isMobile: boolean): {
	width: number;
	height: number;
} {
	return isMobile ? { width: 100, height: 60 } : { width: 148, height: 76 };
}
