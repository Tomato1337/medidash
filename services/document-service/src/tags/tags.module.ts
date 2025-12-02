import { TagsController } from "./tags.controller"
/*
https://docs.nestjs.com/modules
*/

import { Module } from "@nestjs/common"

@Module({
	imports: [],
	controllers: [TagsController],
	providers: [],
})
export class TagsModule {}
