import * as React from "react"
import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router"
import { IconBuilding, IconUsersGroup } from "@tabler/icons-react"
import { z } from "zod"

import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar"
import { AppSidebar } from "../../_components/app-sidebar"
import { OrgMembers } from "../../_components/org-members"
import { OrgSettingsGeneral } from "../../_components/org-settings-general"
import { SiteHeader } from "../../_components/site-header"

const searchSchema = z.object({
	tab: z.enum(["general", "members"]).default("general").catch("general"),
})

export const Route = createFileRoute("/_authenticated/$orgSlug/org/settings")({
	validateSearch: searchSchema,
	component: OrgSettingsPage,
})

const NAV_ITEMS = [
	{ id: "general" as const, label: "General", icon: IconBuilding },
	{ id: "members" as const, label: "Members", icon: IconUsersGroup },
]

function OrgSettingsPage() {
	const { orgSlug } = useParams({ from: "/_authenticated/$orgSlug/org/settings" })
	const { tab } = useSearch({ from: "/_authenticated/$orgSlug/org/settings" })

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
					<div className="flex flex-col gap-1 p-4 md:p-6">
						<h1 className="text-2xl font-semibold">Organization Settings</h1>
						<p className="text-muted-foreground text-sm">
							Manage your organization.
						</p>
					</div>

					<div className="flex flex-1 flex-col gap-0 md:flex-row">
						<nav className="flex shrink-0 flex-row gap-1 border-b px-4 pb-3 md:w-52 md:flex-col md:border-b-0 md:border-r md:px-4 md:py-2">
							{NAV_ITEMS.map((item) => {
								const isActive = tab === item.id
								return (
									<Link
										key={item.id}
										to="/$orgSlug/org/settings"
										params={{ orgSlug }}
										search={{ tab: item.id }}
										className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
											isActive
												? "bg-accent text-accent-foreground font-medium"
												: "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
										}`}
									>
										<item.icon className="size-4 shrink-0" />
										{item.label}
									</Link>
								)
							})}
						</nav>

						<div className="flex-1 p-4 md:p-6 md:pt-4">
							{tab === "general" && <OrgSettingsGeneral />}
							{tab === "members" && <OrgMembers />}
						</div>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
