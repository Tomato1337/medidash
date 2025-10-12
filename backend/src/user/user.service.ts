/*
https://docs.nestjs.com/providers#services
*/

import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "src/prisma.service"
import { User } from "generated/prisma"

@Injectable()
export class UserService {
	constructor(private readonly prisma: PrismaService) {}

	async getUserByEmail(email: string): Promise<User> {
		const user = await this.prisma.user.findUnique({
			where: { email },
		})

		if (!user) {
			throw new NotFoundException("User not found")
		}

		return user
	}

	async getUserById(id: string): Promise<User> {
		const user = await this.prisma.user.findUnique({
			where: { id },
		})

		if (!user) {
			throw new NotFoundException("User not found")
		}

		return user
	}

	async createUser(data: {
		email: string
		password: string
		name?: string
	}): Promise<User> {
		return this.prisma.user.create({
			data,
		})
	}
}
