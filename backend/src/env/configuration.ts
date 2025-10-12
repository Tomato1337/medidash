import { Env } from "./env.schema"

const configuration = () => {
	return process.env as unknown as Env
}

export default configuration
