import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { IconBuilding } from "@tabler/icons-react"

import { Button } from "#/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import { authClient } from "#/server/auth/client"

export const Route = createFileRoute("/_authenticated/org/create")({
	component: CreateOrgPage,
})

function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
}

function CreateOrgPage() {
	const navigate = useNavigate()
	const [name, setName] = useState("")
	const [slug, setSlug] = useState("")
	const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleNameChange = (value: string) => {
		setName(value)
		if (!slugManuallyEdited) {
			setSlug(slugify(value))
		}
	}

	const handleSlugChange = (value: string) => {
		setSlugManuallyEdited(true)
		setSlug(slugify(value))
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!name.trim() || !slug.trim()) return

		setLoading(true)
		setError(null)

		const { error: err } = await authClient.organization.create({
			name: name.trim(),
			slug: slug.trim(),
		})

		if (err) {
			setError(err.message ?? "Failed to create organization")
			setLoading(false)
			return
		}

		navigate({ to: "/$orgSlug/dashboard", params: { orgSlug: slug.trim() } })
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
						<IconBuilding className="size-6" />
					</div>
					<CardTitle>Create your organization</CardTitle>
					<CardDescription>
						Set up an organization to get started.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Organization name</Label>
							<Input
								id="name"
								placeholder="Acme Inc."
								value={name}
								onChange={(e) => handleNameChange(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="slug">Slug</Label>
							<Input
								id="slug"
								placeholder="acme-inc"
								value={slug}
								onChange={(e) => handleSlugChange(e.target.value)}
								required
							/>
							<p className="text-xs text-muted-foreground">
								Used in URLs. Only lowercase letters, numbers, and hyphens.
							</p>
						</div>
						{error && (
							<p className="text-sm text-destructive">{error}</p>
						)}
						<Button
							type="submit"
							className="w-full"
							disabled={loading || !name.trim() || !slug.trim()}
						>
							{loading ? "Creating..." : "Create Organization"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
