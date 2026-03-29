import type { ReactNode } from "react"

import type { AppRole } from "#/server/auth/permissions"
import { useSession } from "#/routes/_public/auth/_hooks/use-session"

interface RoleGuardProps {
	children: ReactNode
	roles: AppRole[]
	fallback?: ReactNode
}

export const RoleGuard = ({ children, roles, fallback = null }: RoleGuardProps) => {
	const { data: session } = useSession()

	if (!session?.user?.role || !roles.includes(session.user.role as AppRole)) {
		return <>{fallback}</>
	}

	return <>{children}</>
}
