import { authClient } from "#/server/auth/client"

export const useListOrganizations = () => authClient.useListOrganizations()
