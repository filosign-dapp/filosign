import { createRequire } from "node:module";

const requireFromSupport = createRequire(import.meta.url);

/**
 * Load a module's runtime exports for spread-into `mock.module`.
 * Prefer partial overrides over replacing entire packages (see TESTING.md).
 */
export function loadImplementation<T>(pathFromTestsSupport: string): T {
	return requireFromSupport(pathFromTestsSupport) as T;
}
