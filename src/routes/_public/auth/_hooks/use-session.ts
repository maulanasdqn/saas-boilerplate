import { authClient } from "#/server/auth/client"

export const useSession = () => authClient.useSession()
