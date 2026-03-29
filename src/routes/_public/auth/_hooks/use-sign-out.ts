import { useRouter } from "@tanstack/react-router"

import { authClient } from "#/server/auth/client"

export const useSignOut = () => {
	const router = useRouter()

	return async () => {
		await authClient.signOut()
		await router.invalidate()
	}
}
