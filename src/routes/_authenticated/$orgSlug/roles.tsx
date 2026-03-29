import * as React from "react"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar"

import { orpc } from "#/server/orpc/client"
import { AppSidebar } from "../_components/app-sidebar"
import { RolesOverview } from "../_components/roles-overview"
import { SiteHeader } from "../_components/site-header"

export const Route = createFileRoute("/_authenticated/$orgSlug/roles")({
	beforeLoad: ({ context, params }) => {
		const orgRole = context.orgRole
		if (orgRole !== "admin" && orgRole !== "owner") {
			throw redirect({ to: "/$orgSlug/dashboard", params })
		}
	},
	component: RolesPage,
})

function RolesPage() {
	const { data } = useQuery(orpc.admin.listUsers.queryOptions())
	const users = data?.users ?? []

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}
		>
			<AppSidebar variant="inset" />
			<SidebarInset>
				<SiteHeader />
				<div className="flex flex-1 flex-col">
					<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
						<div>
							<h1 className="text-2xl font-semibold">Roles</h1>
							<p className="text-muted-foreground text-sm">
								Manage role assignments for users.
							</p>
						</div>
						<RolesOverview users={users} />
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
