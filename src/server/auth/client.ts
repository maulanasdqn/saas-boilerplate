import { createAuthClient } from "better-auth/react"
import { adminClient, organizationClient } from "better-auth/client/plugins"

import { ac, roles } from "#/server/auth/permissions"

export const authClient = createAuthClient({
	plugins: [
		adminClient({
			ac,
			roles,
		}),
		organizationClient(),
	],
})

export type AuthSession = typeof authClient.$Infer.Session
