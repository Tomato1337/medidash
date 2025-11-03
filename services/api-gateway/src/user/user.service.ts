/*
https://docs.nestjs.com/providers#services
*/

import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "src/prisma.service"
import { User } from "@prisma/client"
import { UserResponseDto } from "./dto/user.dto"

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

	async getUserById(id: string): Promise<UserResponseDto> {
		const user = await this.prisma.user.findUnique({
			where: { id },
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true,
				updatedAt: true,
			},
		})

		if (!user) {
			throw new NotFoundException("User not found")
		}

		return user
	}

	async createUser(data: {
		email: string
		password: string
		name: string
	}): Promise<User> {
		return this.prisma.user.create({
			data: {
				email: data.email,
				password: data.password,
				name: data.name,
			},
		})
	}
}
