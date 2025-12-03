import { validateEnv } from "./env.schema"

const configuration = () => {
	return validateEnv(process.env)
}

export default configuration
