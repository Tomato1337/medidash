import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@shared-types": path.resolve(
				__dirname,
				"../services/shared-types/index.ts",
			),
		},
	},
	plugins: [
		{
			name: "service-worker-allowed-header",
			configureServer(server) {
				server.middlewares.use((_req, res, next) => {
					res.setHeader("Service-Worker-Allowed", "/")
					next()
				})
			},
		},
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
			routesDirectory: "./src/app/routes",
			generatedRouteTree: "./src/shared/router/routeTree.gen.ts",
		}),
		react({
			babel: {
				plugins: [["babel-plugin-react-compiler"]],
			},
		}),
		tailwindcss(),
	],
	build: {
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, "index.html"),
				sw: path.resolve(
					__dirname,
					"src/modules/offline/infrastructure/sw.serviceWorker.ts",
				),
			},
			output: {
				entryFileNames: (assetInfo) => {
					return assetInfo.name === "sw"
						? "sw.js"
						: "assets/[name]-[hash].js"
				},
			},
		},
	},
})
