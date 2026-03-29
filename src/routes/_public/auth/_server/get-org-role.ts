import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "#/server/auth"
import { PLATFORM_SUPER_ADMIN } from "#/server/auth/permissions"
import { db } from "#/libs/drizzle"
import { member } from "#/libs/drizzle/schema"

export const getOrgRoleFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ orgId: z.string() }))
	.handler(async (ctx) => {
		const headers = getRequestHeaders()
		const session = await auth.api.getSession({ headers })
		if (!session?.user) return null
		if (session.user.role === PLATFORM_SUPER_ADMIN) return "owner"
		const m = await db
			.select({ role: member.role })
			.from(member)
			.where(
				and(
					eq(member.userId, session.user.id),
					eq(member.organizationId, ctx.data.orgId),
				),
			)
			.then((r) => r[0])
		return (m?.role as string) ?? null
	})
