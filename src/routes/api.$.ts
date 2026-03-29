import "#/polyfill"

import { OpenAPIHandler } from "@orpc/openapi/fetch"
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4"
import { SmartCoercionPlugin } from "@orpc/json-schema"
import { createFileRoute } from "@tanstack/react-router"
import { onError } from "@orpc/server"
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins"
import { and, eq } from "drizzle-orm"

import { auth } from "#/server/auth"
import type { AppRole } from "#/server/auth/permissions"
import { PLATFORM_SUPER_ADMIN } from "#/server/auth/permissions"
import { db } from "#/libs/drizzle"
import { member } from "#/libs/drizzle/schema"
import router from "#/server/routers"

const handler = new OpenAPIHandler(router, {
	interceptors: [
		onError((error) => {
			console.error(error)
		}),
	],
	plugins: [
		new SmartCoercionPlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
			specGenerateOptions: {
				info: {
					title: "TanStack ORPC Playground",
					version: "1.0.0",
				},
				security: [{ bearerAuth: [] }],
				components: {
					securitySchemes: {
						bearerAuth: {
							type: "http",
							scheme: "bearer",
						},
					},
				},
			},
			docsConfig: {
				authentication: {
					securitySchemes: {
						bearerAuth: {
							token: "default-token",
						},
					},
				},
			},
		}),
	],
})

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
		prefix: "/api",
		context: { headers: request.headers, session, orgRole },
	})

	return response ?? new Response("Not Found", { status: 404 })
}

export const Route = createFileRoute("/api/$")({
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
