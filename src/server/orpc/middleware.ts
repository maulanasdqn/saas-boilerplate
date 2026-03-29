import { ORPCError, os } from "@orpc/server"

import type { AppRole } from "#/server/auth/permissions"
import type { ORPCContext } from "#/server/orpc/context"
import { PLATFORM_SUPER_ADMIN, roles } from "#/server/auth/permissions"

// Base builder — all procedures share this context type
export const publicProcedure = os.$context<ORPCContext>()

// Requires an authenticated session
export const protectedProcedure = publicProcedure.use(
	(options) => {
		if (!options.context.session) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "You must be signed in",
			})
		}
		return options.next({
			context: {
				...options.context,
				session: options.context.session,
			},
		})
	},
)

// Requires one of the specified org roles
export const requireRole = (...allowedRoles: AppRole[]) =>
	protectedProcedure.use((options) => {
		const role = options.context.orgRole
		if (!role || !allowedRoles.includes(role)) {
			throw new ORPCError("FORBIDDEN", {
				message: `Required role: ${allowedRoles.join(" or ")}`,
			})
		}
		return options.next({ context: options.context })
	})

// Requires a specific permission on a resource (checked against static role definitions)
export const requirePermission = <R extends keyof (typeof roles)["member"]["statements"]>(
	resource: R,
	actions: string[],
) =>
	protectedProcedure.use((options) => {
		const role = options.context.orgRole
		if (!role) {
			throw new ORPCError("FORBIDDEN", { message: "No org membership" })
		}
		const roleObj = roles[role]
		if (!roleObj) {
			throw new ORPCError("FORBIDDEN", { message: "Unknown role" })
		}
		const result = roleObj.authorize({ [resource]: actions } as Parameters<
			typeof roleObj.authorize
		>[0])
		if (!result.success) {
			throw new ORPCError("FORBIDDEN", {
				message: result.error ?? "Permission denied",
			})
		}
		return options.next({ context: options.context })
	})

// Convenience procedures
export const adminProcedure = requireRole("owner", "admin")
export const ownerProcedure = requireRole("owner")

// Platform-level super-admin check (bypasses org role — for platform-only endpoints)
export const platformSuperAdminProcedure = protectedProcedure.use((options) => {
	if (options.context.session.user.role !== PLATFORM_SUPER_ADMIN) {
		throw new ORPCError("FORBIDDEN", {
			message: "Platform super-admin access required",
		})
	}
	return options.next({ context: options.context })
})
