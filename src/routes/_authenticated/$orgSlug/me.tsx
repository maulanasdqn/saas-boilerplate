import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar"

import { useSession } from "#/routes/_public/auth/_hooks/use-session"
import { AppSidebar } from "../_components/app-sidebar"
import { ProfileForm } from "../_components/profile-form"
import { SiteHeader } from "../_components/site-header"

export const Route = createFileRoute("/_authenticated/$orgSlug/me")({
	component: MePage,
})

function MePage() {
	const session = useSession()
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
					<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
						{user && (
							<ProfileForm
								name={user.name}
								email={user.email}
								role={user.role ?? "user"}
								createdAt={new Date(user.createdAt)}
							/>
						)}
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
