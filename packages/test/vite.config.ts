import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": "/src",
		},
	},
	server: {
		port: 3100,
		strictPort: true,
		host: true,
		fs: {
			strict: false,
		},
	},
	optimizeDeps: {
		include: ["dilithium-crystals-js"],
		exclude: [
			"@filosign/crypto-utils",
			"@filosign/react",
			"@filosign/contracts",
		],
	},
	build: {
		commonjsOptions: {
			exclude: [],
		},
	},
});
