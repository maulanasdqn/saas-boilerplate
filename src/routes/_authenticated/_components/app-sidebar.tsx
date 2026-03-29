import * as React from "react"
import {
	IconActivity,
	IconBuilding,
	IconDashboard,
	IconDatabase,
	IconFileWord,
	IconHelp,
	IconReport,
	IconSearch,
	IconSettings,
	IconShieldCheck,
	IconUserCog,
	IconUsers,
	IconUsersGroup,
} from "@tabler/icons-react"
import { useParams } from "@tanstack/react-router"

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
} from "#/components/ui/sidebar"
import { useHasPermission } from "#/routes/_public/auth/_hooks/use-has-permission"
import { useSession } from "#/routes/_public/auth/_hooks/use-session"
import { useActiveOrganization } from "#/routes/_public/auth/_hooks/use-active-organization"
import { NavDocuments } from "./nav-documents"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
import { OrgSwitcher } from "./org-switcher"

const documents = [
	{ name: "Data Library", url: "#", icon: IconDatabase },
	{ name: "Reports", url: "#", icon: IconReport },
	{ name: "Word Assistant", url: "#", icon: IconFileWord },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const session = useSession()
	const canListUsers = useHasPermission("user", ["list"])
	const canViewActivityLog = useHasPermission("activity-log", ["list"])
	const { data: activeOrg } = useActiveOrganization()
	// orgSlug may not be in params if we're on a non-$orgSlug route
	const params = useParams({ strict: false })
	const orgSlug = (params as { orgSlug?: string }).orgSlug ?? ""

	const user = {
		name: session.data?.user?.name ?? "",
		email: session.data?.user?.email ?? "",
		avatar: session.data?.user?.image ?? "",
	}

	const navMain = orgSlug
		? [
				{ title: "Dashboard", url: `/${orgSlug}/dashboard`, icon: IconDashboard },
				...(canListUsers
					? [
							{ title: "Users", url: `/${orgSlug}/users`, icon: IconUsers },
							{ title: "Roles", url: `/${orgSlug}/roles`, icon: IconUserCog },
							{ title: "Permissions", url: `/${orgSlug}/permissions`, icon: IconShieldCheck },
						]
					: []),
				...(canViewActivityLog
					? [{ title: "Activity Log", url: `/${orgSlug}/activity`, icon: IconActivity }]
					: []),
				...(activeOrg
					? [
							{ title: "Organization", url: `/${orgSlug}/org/settings`, icon: IconBuilding },
							{ title: "Members", url: `/${orgSlug}/org/settings?tab=members`, icon: IconUsersGroup },
						]
					: []),
			]
		: []

	const navSecondary = orgSlug
		? [
				{ title: "Settings", url: `/${orgSlug}/settings`, icon: IconSettings },
				{ title: "Get Help", url: "#", icon: IconHelp },
				{ title: "Search", url: "#", icon: IconSearch },
			]
		: [
				{ title: "Get Help", url: "#", icon: IconHelp },
				{ title: "Search", url: "#", icon: IconSearch },
			]

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<OrgSwitcher />
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={navMain} />
				<NavDocuments items={documents} />
				<NavSecondary items={navSecondary} className="mt-auto" />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
		</Sidebar>
	)
}
