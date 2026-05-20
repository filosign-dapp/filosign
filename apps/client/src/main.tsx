import { Buffer as BufferI } from "buffer";
import { createRoot } from "react-dom/client";
import { AppProviders } from "@/src/lib/app-providers";
import { configurePdfWorker } from "@/src/lib/domains/files/pdf/configure-pdf-worker";
import "./lib/filosign/preload-dilithium";
import { hydrationMark } from "@/src/lib/utils/hydration-lifecycle";
import "./globals.css";

hydrationMark("main:module-evaluated");
configurePdfWorker();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

window.Buffer = window.Buffer || BufferI;

if (!("toJSON" in BigInt.prototype)) {
	Object.defineProperty(BigInt.prototype, "toJSON", {
		value() {
			return this.toString();
		},
		configurable: true,
		writable: true,
	});
}

hydrationMark("main:createRoot-start");
createRoot(rootElement).render(<AppProviders />);
hydrationMark("main:createRoot-render-scheduled");
requestAnimationFrame(() => {
	hydrationMark("main:first-animation-frame");
});
