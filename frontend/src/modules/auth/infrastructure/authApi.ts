import { client } from "@/shared/api/api"
import type { LoginInput, RegisterInput } from "../domain/types"

// =============================================================================
// AUTH API - Pure functions for API calls
// =============================================================================

/**
 * Login user with email and password
 */
export async function login(body: LoginInput) {
	const { data, error } = await client.POST("/api/auth/login", { body })
	if (error) throw error
	if (!data) throw new Error("Login failed - no data returned")
	return data
}

/**
 * Register new user
 */
export async function register(body: RegisterInput) {
	const { data, error } = await client.POST("/api/auth/register", { body })
	if (error) throw error
	if (!data) throw new Error("Registration failed - no data returned")
	return data
}

/**
 * Get current user profile
 */
export async function getUser() {
	const { data, response, error } = await client.GET("/api/user")
	if (!response?.ok || error) throw error
	if (!data) throw new Error("No user data returned")
	return data
}

/**
 * Logout current user session
 */
export async function logout() {
	const { data, error } = await client.POST("/api/auth/signout")
	if (error) throw error
	if (!data) throw new Error("Logout failed - no data returned")
	return data
}
