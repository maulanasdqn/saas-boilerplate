import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin } from "better-auth/plugins/admin"
import { organization } from "better-auth/plugins/organization"
import { tanstackStartCookies } from "better-auth/tanstack-start"

import { db } from "#/libs/drizzle"
import { ac, roles } from "#/server/auth/permissions"

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg" }),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [
		tanstackStartCookies(),
		admin({
			defaultRole: "user",
			adminRoles: ["super-admin", "admin"],
			ac,
			roles,
		}),
		organization({
			allowUserToCreateOrganization: true,
			organizationLimit: 5,
			creatorRole: "owner",
			membershipLimit: 50,
		}),
	],
})

export type Session = typeof auth.$Infer.Session
export type User = Session["user"]
