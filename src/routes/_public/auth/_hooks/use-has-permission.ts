import { authClient } from "#/server/auth/client"

import type { AppRole } from "#/server/auth/permissions"
import { PLATFORM_SUPER_ADMIN, roles } from "#/server/auth/permissions"

export const useHasPermission = (
	resource: keyof (typeof roles)["member"]["statements"],
	actions: string[],
): boolean => {
	const { data: session } = authClient.useSession()
	if (!session?.user) return false

	// Platform super-admin = god mode
	if (session.user.role === PLATFORM_SUPER_ADMIN) return true

	// Get org membership role from active org
	const { data: activeOrg } = authClient.useActiveOrganization()
	const membership = (activeOrg as { members?: { userId: string; role: string }[] } | null)
		?.members?.find((m) => m.userId === session.user.id)
	const role = membership?.role as AppRole | undefined
	if (!role) return false
	const roleObj = roles[role]
	if (!roleObj) return false

	return roleObj.authorize({ [resource]: actions } as Parameters<
		typeof roleObj.authorize
	>[0]).success
}
