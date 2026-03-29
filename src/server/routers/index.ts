import { ORPCError } from "@orpc/server"
import { and, desc, eq, sql } from "drizzle-orm"

import { auth } from "#/server/auth"
import type { AppRole } from "#/server/auth/permissions"
import { resourceActions, roles } from "#/server/auth/permissions"
import { db } from "#/libs/drizzle"
import * as schema from "#/libs/drizzle/schema"
import {
	adminProcedure,
	ownerProcedure,
	protectedProcedure,
	publicProcedure,
	requirePermission,
} from "#/server/orpc/middleware"
import {
	banUserSchema,
	createRoleSchema,
	createUserSchema,
	deleteRoleSchema,
	deleteUserSchema,
	listActivityLogsSchema,
	setRolePermissionSchema,
	setRoleSchema,
	unbanUserSchema,
	updateRoleSchema,
	updateUserSchema,
} from "#/server/orpc/schema"

// ─── Activity log helper ──────────────────────────────────────────────────

async function logActivity(entry: {
	userId?: string | null
	organizationId?: string | null
	action: string
	resource: string
	resourceId?: string | null
	metadata?: Record<string, unknown>
	ipAddress?: string | null
	userAgent?: string | null
}) {
	await db.insert(schema.activityLog).values({
		id: crypto.randomUUID(),
		userId: entry.userId ?? null,
		organizationId: entry.organizationId ?? null,
		action: entry.action,
		resource: entry.resource,
		resourceId: entry.resourceId ?? null,
		metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
		ipAddress: entry.ipAddress ?? null,
		userAgent: entry.userAgent ?? null,
	})
}

// ─── Role rank: higher number = more privileged ───────────────────────────

const ROLE_RANK: Record<string, number> = {
	member: 0,
	admin: 1,
	owner: 2,
}

function assertNotSelf(
	context: { session: { user: { id: string } } },
	targetUserId: string,
	action: string,
) {
	if (targetUserId === context.session.user.id) {
		throw new ORPCError("FORBIDDEN", {
			message: `You cannot ${action} your own account`,
		})
	}
}

async function assertOutranksTarget(
	callerOrgRole: AppRole | null,
	targetUserId: string,
	activeOrgId: string,
) {
	const targetMember = await db
		.select({ role: schema.member.role })
		.from(schema.member)
		.where(
			and(
				eq(schema.member.userId, targetUserId),
				eq(schema.member.organizationId, activeOrgId),
			),
		)
		.then((r) => r[0])

	const targetRole = targetMember?.role ?? "member"
	const callerRole = callerOrgRole ?? "member"

	if ((ROLE_RANK[callerRole] ?? 0) <= (ROLE_RANK[targetRole] ?? 0)) {
		throw new ORPCError("FORBIDDEN", {
			message: "Cannot perform this action on a user with equal or higher privileges",
		})
	}
}

// ─── Role / Permission seed helpers ───────────────────────────────────────

async function seedRoles(organizationId: string) {
	await db
		.insert(schema.appRole)
		.values([
			{
				id: "member",
				organizationId,
				label: "Member",
				description: "Standard member with basic access",
				isSystem: true,
			},
			{
				id: "admin",
				organizationId,
				label: "Admin",
				description: "Can manage users and moderate content",
				isSystem: true,
			},
			{
				id: "owner",
				organizationId,
				label: "Owner",
				description: "Full organization access including role assignment",
				isSystem: true,
			},
		])
		.onConflictDoNothing()
}

async function seedPermissions(organizationId: string) {
	await seedRoles(organizationId)
	const perms: { roleId: string; organizationId: string; resource: string; action: string }[] = []
	for (const [roleKey, roleObj] of Object.entries(roles)) {
		for (const [resource, actions] of Object.entries(resourceActions)) {
			for (const action of actions as readonly string[]) {
				const result = roleObj.authorize({ [resource]: [action] } as Parameters<
					typeof roleObj.authorize
				>[0])
				if (result.success) {
					perms.push({ roleId: roleKey, organizationId, resource, action })
				}
			}
		}
	}
	if (perms.length > 0) {
		await db.insert(schema.rolePermission).values(perms).onConflictDoNothing()
	}
}

// ─── Router ───────────────────────────────────────────────────────────────

const router = {
	health: publicProcedure.handler(() => ({ status: "ok" as const })),

	me: protectedProcedure.handler(({ context }) => ({
		user: context.session.user,
	})),

	admin: {
		listUsers: adminProcedure.handler(async ({ context }) => {
			const activeOrgId = context.session.session?.activeOrganizationId
			if (!activeOrgId) {
				throw new ORPCError("BAD_REQUEST", { message: "No active organization" })
			}
			const orgMembers = await db
				.select({
					id: schema.user.id,
					name: schema.user.name,
					email: schema.user.email,
					role: schema.member.role,
					banned: schema.user.banned,
					createdAt: schema.member.createdAt,
				})
				.from(schema.member)
				.innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
				.where(eq(schema.member.organizationId, activeOrgId))
			return { users: orgMembers }
		}),

		banUser: adminProcedure
			.input(banUserSchema)
			.handler(async ({ input, context }) => {
				assertNotSelf(context, input.userId, "ban")
				const activeOrgId = context.session.session?.activeOrganizationId
				if (!activeOrgId) {
					throw new ORPCError("BAD_REQUEST", { message: "No active organization" })
				}
				await assertOutranksTarget(context.orgRole, input.userId, activeOrgId)
				await auth.api.banUser({
					body: { userId: input.userId, banReason: input.banReason },
					headers: context.headers,
				})
				await logActivity({
					userId: context.session.user.id,
					organizationId: activeOrgId,
					action: "ban",
					resource: "user",
					resourceId: input.userId,
					metadata: { banReason: input.banReason },
				})
				return { success: true }
			}),

		unbanUser: adminProcedure
			.input(unbanUserSchema)
			.handler(async ({ input, context }) => {
				const activeOrgId = context.session.session?.activeOrganizationId
				if (!activeOrgId) {
					throw new ORPCError("BAD_REQUEST", { message: "No active organization" })
				}
				await assertOutranksTarget(context.orgRole, input.userId, activeOrgId)
				await auth.api.unbanUser({
					body: { userId: input.userId },
					headers: context.headers,
				})
				await logActivity({
					userId: context.session.user.id,
					organizationId: activeOrgId,
					action: "unban",
					resource: "user",
					resourceId: input.userId,
				})
				return { success: true }
			}),

		setRole: ownerProcedure
			.input(setRoleSchema)
			.handler(async ({ input, context }) => {
				assertNotSelf(context, input.userId, "change the role of")
				const activeOrgId = context.session.session?.activeOrganizationId
				if (!activeOrgId) {
					throw new ORPCError("BAD_REQUEST", { message: "No active organization" })
				}
				await assertOutranksTarget(context.orgRole, input.userId, activeOrgId)
				await db
					.update(schema.member)
					.set({ role: input.role })
					.where(
						and(
							eq(schema.member.userId, input.userId),
							eq(schema.member.organizationId, activeOrgId),
						),
					)
				await logActivity({
					userId: context.session.user.id,
					organizationId: activeOrgId,
					action: "set-role",
					resource: "user",
					resourceId: input.userId,
					metadata: { role: input.role },
				})
				return { success: true }
			}),

		createUser: adminProcedure
			.input(createUserSchema)
			.handler(async ({ input, context }) => {
				if (context.orgRole !== "owner" && input.role !== "member") {
					throw new ORPCError("FORBIDDEN", {
						message: "Admins can only create users with the 'member' role",
					})
				}
				const activeOrgId = context.session.session?.activeOrganizationId
				if (!activeOrgId) {
					throw new ORPCError("BAD_REQUEST", { message: "No active organization" })
				}
				const result = await auth.api.createUser({
					body: {
						name: input.name,
						email: input.email,
						password: input.password,
					},
					headers: context.headers,
				})
				const newUserId = (result as { user?: { id?: string } })?.user?.id
				if (newUserId) {
					await db.insert(schema.member).values({
						id: crypto.randomUUID(),
						organizationId: activeOrgId,
						userId: newUserId,
						role: input.role,
					})
				}
				await logActivity({
					userId: context.session.user.id,
					organizationId: activeOrgId,
					action: "create",
					resource: "user",
					resourceId: newUserId,
					metadata: { email: input.email, role: input.role },
				})
				return result
			}),

		updateUser: adminProcedure
			.input(updateUserSchema)
			.handler(async ({ input, context }) => {
				assertNotSelf(context, input.userId, "update via admin panel — use your profile page instead")
				const activeOrgId = context.session.session?.activeOrganizationId
				if (!activeOrgId) {
					throw new ORPCError("BAD_REQUEST", { message: "No active organization" })
				}
				await assertOutranksTarget(context.orgRole, input.userId, activeOrgId)
				const { userId, ...data } = input
				await auth.api.adminUpdateUser({
					body: { userId, data },
					headers: context.headers,
				})
				await logActivity({
					userId: context.session.user.id,
					organizationId: activeOrgId,
					action: "update",
					resource: "user",
					resourceId: input.userId,
					metadata: data,
				})
				return { success: true }
			}),

		deleteUser: ownerProcedure
			.input(deleteUserSchema)
			.handler(async ({ input, context }) => {
				assertNotSelf(context, input.userId, "delete")
				await auth.api.removeUser({
					body: { userId: input.userId },
					headers: context.headers,
				})
				await logActivity({
					userId: context.session.user.id,
					organizationId: context.session.session?.activeOrganizationId,
					action: "delete",
					resource: "user",
					resourceId: input.userId,
				})
				return { success: true }
			}),

		// ── Role CRUD ────────────────────────────────────────────────────────

		listRoles: adminProcedure.handler(async ({ context }) => {
			const activeOrgId = context.session.session?.activeOrganizationId
			if (!activeOrgId) {
				throw new ORPCError("BAD_REQUEST", { message: "No active organization" })
			}
			let appRoles = await db
				.select()
				.from(schema.appRole)
				.where(eq(schema.appRole.organizationId, activeOrgId))
				.orderBy(schema.appRole.createdAt)
			if (appRoles.length === 0) {
				await seedRoles(activeOrgId)
				appRoles = await db
					.select()
					.from(schema.appRole)
					.where(eq(schema.appRole.organizationId, activeOrgId))
					.orderBy(schema.appRole.createdAt)
			}
			return { roles: appRoles }
		}),

		createRole: ownerProcedure
			.input(createRoleSchema)
			.handler(async ({ input, context }) => {
				const activeOrgId = context.session.session?.activeOrganizationId
				if (!activeOrgId) {
					throw new ORPCError("BAD_REQUEST", { message: "No active organization" })
				}
				const existing = await db
					.select()
					.from(schema.appRole)
					.where(
						and(
							eq(schema.appRole.id, input.id),
							eq(schema.appRole.organizationId, activeOrgId),
						),
					)
				if (existing.length > 0) {
					throw new ORPCError("CONFLICT", {
						message: `A role with ID "${input.id}" already exists`,
					})
				}
				await db.insert(schema.appRole).values({
					id: input.id,
					organizationId: activeOrgId,
					label: input.label,
					description: input.description,
					isSystem: false,
				})
				return { success: true }
			}),

		updateRole: ownerProcedure
			.input(updateRoleSchema)
			.handler(async ({ input, context }) => {
				const activeOrgId = context.session.session?.activeOrganizationId
				if (!activeOrgId) {
					throw new ORPCError("BAD_REQUEST", { message: "No active organization" })
				}
				const { id, ...data } = input
				await db
					.update(schema.appRole)
					.set(data)
					.where(
						and(
							eq(schema.appRole.id, id),
							eq(schema.appRole.organizationId, activeOrgId),
						),
					)
				return { success: true }
			}),

		deleteRole: ownerProcedure
			.input(deleteRoleSchema)
			.handler(async ({ input, context }) => {
				const activeOrgId = context.session.session?.activeOrganizationId
				if (!activeOrgId) {
					throw new ORPCError("BAD_REQUEST", { message: "No active organization" })
				}
				const found = await db
					.select()
					.from(schema.appRole)
					.where(
						and(
							eq(schema.appRole.id, input.id),
							eq(schema.appRole.organizationId, activeOrgId),
						),
					)
					.then((r) => r[0])
				if (!found) {
					throw new ORPCError("NOT_FOUND", { message: "Role not found" })
				}
				if (found.isSystem) {
					throw new ORPCError("FORBIDDEN", {
						message: "System roles cannot be deleted",
					})
				}
				await db
					.delete(schema.appRole)
					.where(
						and(
							eq(schema.appRole.id, input.id),
							eq(schema.appRole.organizationId, activeOrgId),
						),
					)
				return { success: true }
			}),

		// ── Permission CRUD ──────────────────────────────────────────────────

		listRolePermissions: adminProcedure.handler(async ({ context }) => {
			const activeOrgId = context.session.session?.activeOrganizationId
			if (!activeOrgId) {
				throw new ORPCError("BAD_REQUEST", { message: "No active organization" })
			}
			let perms = await db
				.select()
				.from(schema.rolePermission)
				.where(eq(schema.rolePermission.organizationId, activeOrgId))
			if (perms.length === 0) {
				await seedPermissions(activeOrgId)
				perms = await db
					.select()
					.from(schema.rolePermission)
					.where(eq(schema.rolePermission.organizationId, activeOrgId))
			}
			return { permissions: perms }
		}),

		setRolePermission: ownerProcedure
			.input(setRolePermissionSchema)
			.handler(async ({ input, context }) => {
				const activeOrgId = context.session.session?.activeOrganizationId
				if (!activeOrgId) {
					throw new ORPCError("BAD_REQUEST", { message: "No active organization" })
				}
				if (input.granted) {
					await db
						.insert(schema.rolePermission)
						.values({
							roleId: input.roleId,
							organizationId: activeOrgId,
							resource: input.resource,
							action: input.action,
						})
						.onConflictDoNothing()
				} else {
					await db
						.delete(schema.rolePermission)
						.where(
							and(
								eq(schema.rolePermission.roleId, input.roleId),
								eq(schema.rolePermission.organizationId, activeOrgId),
								eq(schema.rolePermission.resource, input.resource),
								eq(schema.rolePermission.action, input.action),
							),
						)
				}
				return { success: true }
			}),

		// ── Activity Log ─────────────────────────────────────────────────────

		listActivityLogs: requirePermission("activity-log", ["list"])
			.input(listActivityLogsSchema)
			.handler(async ({ input, context }) => {
				const activeOrgId = context.session.session?.activeOrganizationId
				if (!activeOrgId) {
					throw new ORPCError("BAD_REQUEST", { message: "No active organization" })
				}

				const conditions = [
					eq(schema.activityLog.organizationId, activeOrgId),
					input.userId ? eq(schema.activityLog.userId, input.userId) : undefined,
					input.resource ? eq(schema.activityLog.resource, input.resource) : undefined,
					input.action ? eq(schema.activityLog.action, input.action) : undefined,
				].filter(Boolean)

				const where = conditions.length > 0 ? and(...conditions) : undefined

				const [logs, [{ count }]] = await Promise.all([
					db
						.select({
							id: schema.activityLog.id,
							userId: schema.activityLog.userId,
							organizationId: schema.activityLog.organizationId,
							action: schema.activityLog.action,
							resource: schema.activityLog.resource,
							resourceId: schema.activityLog.resourceId,
							metadata: schema.activityLog.metadata,
							ipAddress: schema.activityLog.ipAddress,
							userAgent: schema.activityLog.userAgent,
							createdAt: schema.activityLog.createdAt,
							userName: schema.user.name,
							userEmail: schema.user.email,
						})
						.from(schema.activityLog)
						.leftJoin(schema.user, eq(schema.activityLog.userId, schema.user.id))
						.where(where)
						.orderBy(desc(schema.activityLog.createdAt))
						.limit(input.limit)
						.offset(input.offset),
					db
						.select({ count: sql<number>`count(*)::int` })
						.from(schema.activityLog)
						.where(where),
				])

				return { logs, total: count }
			}),
	},
}

export default router
