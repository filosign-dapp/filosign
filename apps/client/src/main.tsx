import { RouterProvider } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ProfileEmailSync from "./lib/auth/profile-email-sync";
import { ErrorBoundary } from "./lib/components/app/errors/error-boundary";
import { Toaster } from "./lib/components/ui/sonner";
import { QueryClientProvider } from "./lib/filosign/query-client";
import router from "./router";
import "./globals.css";
import { FilosignAnalyticsProvider } from "@filosign/react/analytics";
import { IconContext } from "@phosphor-icons/react";
import { Buffer as BufferI } from "buffer";
import env from "./env";
import { configurePdfWorker } from "./lib/domains/files/pdf/configure-pdf-worker";
import { FilosignProvider } from "./lib/filosign/filosign-provider";
import { ThirdwebRootProvider } from "./lib/web3/providers/thirdweb-provider";
import { WagmiProvider } from "./lib/web3/providers/wagmi-provider";

configurePdfWorker();

// Root element
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

// App
const App = () => {
	return (
		<StrictMode>
			<ErrorBoundary>
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					enableSystem
					storageKey="theme"
				>
					<QueryClientProvider>
						<FilosignAnalyticsProvider
							apiKey={env.VITE_POSTHOG_KEY ?? ""}
							apiHost={env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com"}
							enabled={env.VITE_POSTHOG_ENABLED === true}
						>
							<ThirdwebRootProvider>
								<WagmiProvider>
									<FilosignProvider>
										<IconContext.Provider
											value={{
												mirrored: false,
												weight: "regular",
											}}
										>
											<ProfileEmailSync />
											<RouterProvider router={router} />
											<Toaster position="bottom-right" richColors />
										</IconContext.Provider>
									</FilosignProvider>
								</WagmiProvider>
							</ThirdwebRootProvider>
						</FilosignAnalyticsProvider>
					</QueryClientProvider>
				</ThemeProvider>
			</ErrorBoundary>
		</StrictMode>
	);
};

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

createRoot(rootElement).render(<App />);
