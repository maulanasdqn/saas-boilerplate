import { createRouterClient } from "@orpc/server"
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { createIsomorphicFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"

import type { RouterClient } from "@orpc/server"

import { auth } from "#/server/auth"
import type { AppRole } from "#/server/auth/permissions"
import { PLATFORM_SUPER_ADMIN } from "#/server/auth/permissions"
import { db } from "#/libs/drizzle"
import { member } from "#/libs/drizzle/schema"
import router from "#/server/routers"

const getORPCClient = createIsomorphicFn()
	.server(() =>
		createRouterClient(router, {
			context: async () => {
				const headers = getRequestHeaders()
				const session = await auth.api.getSession({ headers })
				let orgRole: AppRole | null = null

				if (session?.user) {
					if (session.user.role === PLATFORM_SUPER_ADMIN) {
						orgRole = "owner"
					} else if (session.session?.activeOrganizationId) {
						const m = await db
							.select({ role: member.role })
							.from(member)
							.where(
								and(
									eq(member.userId, session.user.id),
									eq(member.organizationId, session.session.activeOrganizationId),
								),
							)
							.then((r) => r[0])
						orgRole = (m?.role as AppRole) ?? null
					}
				}

				return { headers, session, orgRole }
			},
		}),
	)
	.client((): RouterClient<typeof router> => {
		const link = new RPCLink({
			url: `${window.location.origin}/api/rpc`,
		})
		return createORPCClient(link)
	})

export const client: RouterClient<typeof router> = getORPCClient()

export const orpc = createTanstackQueryUtils(client)
