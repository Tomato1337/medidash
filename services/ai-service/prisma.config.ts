import { config } from "dotenv"
import { join } from "path"

config()
config({ path: join(process.cwd(), "../../.env") })

import { defineConfig, env } from "prisma/config"

export default defineConfig({
	schema: "./prisma/schema.prisma",
	migrations: {
		path: "migrations",
	},
	datasource: {
		url: env("DATABASE_URL"),
	},
})
