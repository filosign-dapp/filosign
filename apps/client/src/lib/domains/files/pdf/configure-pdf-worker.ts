/** Vite resolves this to a same-origin URL (satisfies `worker-src 'self'`). */
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { pdfjs } from "react-pdf";

let configured = false;

/** Idempotent — safe to call from every `PdfJsPreview` mount. */
export function configurePdfWorker(): void {
	if (configured) return;
	configured = true;
	pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
}
