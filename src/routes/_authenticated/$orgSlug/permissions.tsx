import * as React from "react"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar"

import { AppSidebar } from "../_components/app-sidebar"
import { PermissionsMatrix } from "../_components/permissions-matrix"
import { SiteHeader } from "../_components/site-header"

export const Route = createFileRoute("/_authenticated/$orgSlug/permissions")({
	beforeLoad: ({ context, params }) => {
		const orgRole = context.orgRole
		if (orgRole !== "admin" && orgRole !== "owner") {
			throw redirect({ to: "/$orgSlug/dashboard", params })
		}
	},
	component: PermissionsPage,
})

function PermissionsPage() {
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
							<h1 className="text-2xl font-semibold">Permissions</h1>
							<p className="text-muted-foreground text-sm">
								View what each role can do across all resources.
							</p>
						</div>
						<PermissionsMatrix />
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
