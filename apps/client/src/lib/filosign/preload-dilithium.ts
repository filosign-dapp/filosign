import { loadBrowserDilithium } from "@filosign/crypto-utils/browser/dilithium";

/** Started at module load so WASM fetch overlaps React bootstrap. */
export const dilithiumLoadPromise = loadBrowserDilithium();
