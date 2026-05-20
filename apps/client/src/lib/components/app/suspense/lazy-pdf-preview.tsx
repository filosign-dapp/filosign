import { lazy } from "react";

/** Single code-split entry for PDF.js preview (sign, add-sign, file-viewer). */
export const LazyPdfJsPreview = lazy(
	() => import("@/src/lib/domains/files/pdf/pdf-js-preview.lazy"),
);
