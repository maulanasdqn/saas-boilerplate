import {
	IconBuilding,
	IconCheck,
	IconChevronDown,
	IconPlus,
} from "@tabler/icons-react"
import { useNavigate } from "@tanstack/react-router"

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu"
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "#/components/ui/sidebar"
import { authClient } from "#/server/auth/client"
import { useActiveOrganization } from "#/routes/_public/auth/_hooks/use-active-organization"
import { useListOrganizations } from "#/routes/_public/auth/_hooks/use-list-organizations"

export function OrgSwitcher() {
	const { isMobile } = useSidebar()
	const navigate = useNavigate()
	const { data: activeOrg } = useActiveOrganization()
	const { data: orgs } = useListOrganizations()

	const handleSwitchOrg = async (org: { id: string; slug: string | null }) => {
		await authClient.organization.setActive({ organizationId: org.id })
		navigate({ to: "/$orgSlug/dashboard", params: { orgSlug: org.slug ?? org.id } })
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							{activeOrg?.logo ? (
								<img
									src={activeOrg.logo}
									alt={activeOrg.name}
									className="size-5 rounded object-cover"
								/>
							) : (
								<IconBuilding className="size-5" />
							)}
							<span className="truncate font-semibold">
								{activeOrg?.name ?? "Select Organization"}
							</span>
							<IconChevronDown className="ml-auto size-4 shrink-0" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="start"
						sideOffset={4}
					>
						{orgs?.map((org) => (
							<DropdownMenuItem
								key={org.id}
								onClick={() => handleSwitchOrg(org)}
							>
								{org.logo ? (
									<img
										src={org.logo}
										alt={org.name}
										className="size-4 rounded object-cover"
									/>
								) : (
									<IconBuilding className="size-4" />
								)}
								<span className="flex-1 truncate">{org.name}</span>
								{activeOrg?.id === org.id && (
									<IconCheck className="size-4 shrink-0" />
								)}
							</DropdownMenuItem>
						))}
						{orgs && orgs.length > 0 && <DropdownMenuSeparator />}
						<DropdownMenuItem
							onClick={() => navigate({ to: "/org/create" })}
						>
							<IconPlus className="size-4" />
							Create Organization
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
