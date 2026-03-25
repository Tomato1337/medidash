import swc from "unplugin-swc"
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		setupFiles: ["./src/test/setup.ts"],
		root: "./",
		include: ["src/**/*.spec.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/**/*.ts"],
			exclude: [
				"src/**/*.spec.ts",
				"src/**/*.d.ts",
				"src/main.ts",
				"src/test/**",
			],
		},
		clearMocks: true,
		restoreMocks: true,
	},
	resolve: {
		alias: {
			src: path.resolve(__dirname, "./src"),
			"generated/prisma": path.resolve(__dirname, "./generated/prisma/client/client"),
			"@shared-types": path.resolve(__dirname, "../shared-types"),
		},
	},
	plugins: [swc.vite()],
})
