import { createFileRoute, redirect } from "@tanstack/react-router"

import { listOrganizationsFn } from "#/routes/_public/auth/_server/list-organizations"

export const Route = createFileRoute("/")({
	beforeLoad: async ({ context }) => {
		if (!context.session) {
			throw redirect({ to: "/auth/login" })
		}
		const orgs = await listOrganizationsFn()
		if (!orgs || orgs.length === 0) {
			throw redirect({ to: "/org/create" })
		}
		const slug = orgs[0].slug ?? orgs[0].id
		throw redirect({ to: "/$orgSlug/dashboard", params: { orgSlug: slug } })
	},
})
