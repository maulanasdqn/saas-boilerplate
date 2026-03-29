import { createAccessControl } from "better-auth/plugins/access"

export const PLATFORM_SUPER_ADMIN = "super-admin"

export const resourceActions = {
	user: [
		"create",
		"list",
		"set-role",
		"ban",
		"impersonate",
		"impersonate-admins",
		"delete",
		"set-password",
		"get",
		"update",
	],
	session: ["list", "revoke", "delete"],
	"activity-log": ["list", "export"],
} as const

export const ac = createAccessControl(resourceActions)

export const ownerRole = ac.newRole({
	user: [
		"create",
		"list",
		"set-role",
		"ban",
		"impersonate",
		"impersonate-admins",
		"delete",
		"set-password",
		"get",
		"update",
	],
	session: ["list", "revoke", "delete"],
	"activity-log": ["list", "export"],
})

export const adminRole = ac.newRole({
	user: ["create", "list", "ban", "get", "update"],
	session: ["list", "revoke"],
	"activity-log": ["list"],
})

export const memberRole = ac.newRole({
	user: ["get"],
	session: [],
	"activity-log": [],
})

// Org-level roles — used by oRPC middleware for per-org permission checks
export const roles = {
	owner: ownerRole,
	admin: adminRole,
	member: memberRole,
} as const

export type AppRole = keyof typeof roles

// Platform roles — maps user.role column values to permission objects
// Required by better-auth's admin plugin (defaultRole: "user", adminRoles: ["super-admin", "admin"])
export const platformRoles = {
	"super-admin": ownerRole,
	admin: adminRole,
	user: memberRole,
} as const
