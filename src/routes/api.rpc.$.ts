import "#/polyfill"

import { RPCHandler } from "@orpc/server/fetch"
import { createFileRoute } from "@tanstack/react-router"
import { and, eq } from "drizzle-orm"

import { auth } from "#/server/auth"
import type { AppRole } from "#/server/auth/permissions"
import { PLATFORM_SUPER_ADMIN } from "#/server/auth/permissions"
import { db } from "#/libs/drizzle"
import { member } from "#/libs/drizzle/schema"
import router from "#/server/routers"

const handler = new RPCHandler(router)

const handle = async ({ request }: { request: Request }): Promise<Response> => {
	const session = await auth.api.getSession({ headers: request.headers })
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
	const { response } = await handler.handle(request, {
		prefix: "/api/rpc",
		context: { headers: request.headers, session, orgRole },
	})

	return response ?? new Response("Not Found", { status: 404 })
}

export const Route = createFileRoute("/api/rpc/$")({
	server: {
		handlers: {
			HEAD: handle,
			GET: handle,
			POST: handle,
			PUT: handle,
			PATCH: handle,
			DELETE: handle,
		},
	},
})
