import { useEffect } from "react"
import { Outlet, createFileRoute, redirect, useParams } from "@tanstack/react-router"

import { authClient } from "#/server/auth/client"
import { listOrganizationsFn } from "#/routes/_public/auth/_server/list-organizations"
import { getOrgRoleFn } from "#/routes/_public/auth/_server/get-org-role"
import { useActiveOrganization } from "#/routes/_public/auth/_hooks/use-active-organization"
import { useListOrganizations } from "#/routes/_public/auth/_hooks/use-list-organizations"

export const Route = createFileRoute("/_authenticated/$orgSlug")({
	beforeLoad: async ({ params }) => {
		const orgs = await listOrganizationsFn()
		const org = orgs?.find((o) => o.slug === params.orgSlug)
		if (!org) {
			if (!orgs || orgs.length === 0) {
				throw redirect({ to: "/org/create" })
			}
			throw redirect({
				to: "/$orgSlug/dashboard",
				params: { orgSlug: orgs[0].slug ?? orgs[0].id },
			})
		}
		const orgRole = await getOrgRoleFn({ data: { orgId: org.id } })
		return { orgRole }
	},
	component: OrgLayout,
})

function OrgLayout() {
	const { orgSlug } = useParams({ from: "/_authenticated/$orgSlug" })
	const { data: orgs } = useListOrganizations()
	const { data: activeOrg } = useActiveOrganization()

	useEffect(() => {
		const org = orgs?.find((o) => o.slug === orgSlug)
		if (org && activeOrg?.id !== org.id) {
			authClient.organization.setActive({ organizationId: org.id })
		}
	}, [orgSlug, orgs, activeOrg])

	return <Outlet />
}
