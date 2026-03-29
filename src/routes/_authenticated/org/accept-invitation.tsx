import { useEffect, useState } from "react"
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router"
import { z } from "zod"

import { authClient } from "#/server/auth/client"

const searchSchema = z.object({
	invitationId: z.string(),
})

export const Route = createFileRoute("/_authenticated/org/accept-invitation")({
	validateSearch: searchSchema,
	component: AcceptInvitationPage,
})

function AcceptInvitationPage() {
	const navigate = useNavigate()
	const { invitationId } = useSearch({
		from: "/_authenticated/org/accept-invitation",
	})
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		authClient.organization
			.acceptInvitation({ invitationId })
			.then(({ error: err }) => {
				if (err) {
					setError(err.message ?? "Failed to accept invitation")
				} else {
					navigate({ to: "/" })
				}
			})
	}, [invitationId, navigate])

	if (error) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<p className="text-destructive">{error}</p>
			</div>
		)
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<p className="text-muted-foreground">Accepting invitation...</p>
		</div>
	)
}
