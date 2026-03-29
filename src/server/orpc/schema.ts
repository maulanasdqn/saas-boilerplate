import { z } from "zod"

// ─── Shared field definitions ───────────────────────────────────────────────

const userId = z.string().min(1, "User ID is required")
const userName = z.string().min(1, "Name is required").max(100, "Name too long").trim()
const userEmail = z
	.string()
	.email("Invalid email address")
	.max(254, "Email too long")
	.trim()
	.toLowerCase()
const userPassword = z
	.string()
	.min(8, "Password must be at least 8 characters")
	.max(72, "Password too long") // bcrypt effective limit
const userRole = z.enum(["member", "admin", "owner"])

// ─── Schemas ────────────────────────────────────────────────────────────────

export const banUserSchema = z.object({
	userId,
	banReason: z.string().max(500, "Reason too long").trim().optional(),
})

export const unbanUserSchema = z.object({ userId })

export const setRoleSchema = z.object({
	userId,
	role: userRole,
})

export const createUserSchema = z.object({
	name: userName,
	email: userEmail,
	password: userPassword,
	role: userRole.default("member"),
})

export const updateUserSchema = z
	.object({
		userId,
		name: userName.optional(),
		email: userEmail.optional(),
	})
	.refine((data) => data.name !== undefined || data.email !== undefined, {
		message: "At least one field (name or email) must be provided",
	})

export const deleteUserSchema = z.object({ userId })

// ─── Role schemas ────────────────────────────────────────────────────────────

const roleSlug = z
	.string()
	.min(2, "Role ID must be at least 2 characters")
	.max(50, "Role ID too long")
	.regex(/^[a-z0-9-]+$/, "Role ID must use lowercase letters, numbers, and hyphens only")
	.trim()
const roleLabel = z.string().min(1, "Label is required").max(100, "Label too long").trim()
const roleDescription = z.string().max(500, "Description too long").trim()

export const createRoleSchema = z.object({
	id: roleSlug,
	label: roleLabel,
	description: roleDescription.default(""),
})

export const updateRoleSchema = z
	.object({
		id: z.string().min(1),
		label: roleLabel.optional(),
		description: roleDescription.optional(),
	})
	.refine((d) => d.label !== undefined || d.description !== undefined, {
		message: "At least one field must be provided",
	})

export const deleteRoleSchema = z.object({ id: z.string().min(1) })

export const setRolePermissionSchema = z.object({
	roleId: z.string().min(1),
	resource: z.string().min(1),
	action: z.string().min(1),
	granted: z.boolean(),
})

// ─── Activity log schemas ─────────────────────────────────────────────────────

export const listActivityLogsSchema = z.object({
	limit: z.number().int().min(1).max(200).default(50),
	offset: z.number().int().min(0).default(0),
	userId: z.string().optional(),
	resource: z.string().optional(),
	action: z.string().optional(),
})
