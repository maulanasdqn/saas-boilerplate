import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"

import { auth } from "#/server/auth"

export const listOrganizationsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const headers = getRequestHeaders()
		return auth.api.listOrganizations({ headers })
	},
)
