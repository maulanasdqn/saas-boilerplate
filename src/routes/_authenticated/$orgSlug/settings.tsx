import * as React from "react"
import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router"
import { IconLock, IconUser } from "@tabler/icons-react"
import { z } from "zod"
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar"

import { useSession } from "#/routes/_public/auth/_hooks/use-session"
import { AppSidebar } from "../_components/app-sidebar"
import { SettingsProfile } from "../_components/settings-profile"
import { SettingsSecurity } from "../_components/settings-security"
import { SiteHeader } from "../_components/site-header"

const searchSchema = z.object({
	tab: z.enum(["profile", "security"]).default("profile").catch("profile"),
})

export const Route = createFileRoute("/_authenticated/$orgSlug/settings")({
	validateSearch: searchSchema,
	component: SettingsPage,
})

const NAV_ITEMS = [
	{ id: "profile" as const, label: "Profile", icon: IconUser },
	{ id: "security" as const, label: "Security", icon: IconLock },
]

function SettingsPage() {
	const session = useSession()
	const { orgSlug } = useParams({ from: "/_authenticated/$orgSlug/settings" })
	const { tab } = useSearch({ from: "/_authenticated/$orgSlug/settings" })
	const user = session.data?.user

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
						<h1 className="text-2xl font-semibold">Settings</h1>
						<p className="text-muted-foreground text-sm">
							Manage your account settings.
						</p>
					</div>

					<div className="flex flex-1 flex-col gap-0 md:flex-row">
						<nav className="flex shrink-0 flex-row gap-1 border-b px-4 pb-3 md:w-52 md:flex-col md:border-b-0 md:border-r md:px-4 md:py-2">
							{NAV_ITEMS.map((item) => {
								const isActive = tab === item.id
								return (
									<Link
										key={item.id}
										to="/$orgSlug/settings"
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
							{tab === "profile" && user && (
								<SettingsProfile
									name={user.name}
									email={user.email}
									role={user.role ?? "user"}
									createdAt={new Date(user.createdAt)}
								/>
							)}
							{tab === "security" && <SettingsSecurity />}
						</div>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
