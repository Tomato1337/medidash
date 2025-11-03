import { Module } from "@nestjs/common"
import { DocumentProxyController } from "./document-proxy.controller"
import { SearchProxyController } from "./search-proxy.controller"
import { ProcessingProxyController } from "./processing-proxy.controller"

@Module({
	controllers: [
		DocumentProxyController,
		SearchProxyController,
		ProcessingProxyController,
	],
})
export class ProxyModule {}
