import { authClient } from "#/server/auth/client"

export const useActiveOrganization = () => authClient.useActiveOrganization()
