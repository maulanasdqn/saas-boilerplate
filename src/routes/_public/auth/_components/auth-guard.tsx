import { Navigate } from "@tanstack/react-router"

import type { ReactNode } from "react"
import { useSession } from "#/routes/_public/auth/_hooks/use-session"

interface AuthGuardProps {
	children: ReactNode
	fallback?: string
}

export const AuthGuard = ({ children, fallback = "/auth/login" }: AuthGuardProps) => {
	const { data: session, isPending } = useSession()

	if (isPending) return null
	if (!session) return <Navigate to={fallback} />

	return <>{children}</>
}
