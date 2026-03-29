import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "#/components/ui/badge"
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

const nameSchema = z
	.string()
	.min(1, "Name is required")
	.max(100, "Name too long")

interface ProfileFormProps {
	name: string
	email: string
	role: string
	createdAt: Date
}

export function ProfileForm({ name, email, role, createdAt }: ProfileFormProps) {
	const router = useRouter()
	const [submitError, setSubmitError] = React.useState<string | null>(null)

	const form = useForm({
		defaultValues: { name },
		onSubmit: async ({ value }) => {
			setSubmitError(null)
			try {
				await authClient.updateUser({ name: value.name.trim() })
				await router.invalidate()
				toast.success("Profile updated")
			} catch (err) {
				const msg = err instanceof Error ? err.message : "Failed to update profile"
				setSubmitError(msg)
				toast.error(msg)
			}
		},
	})

	return (
		<Card className="max-w-lg">
			<CardHeader>
				<CardTitle>Profile</CardTitle>
				<CardDescription>Manage your account information.</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<form
					onSubmit={(e) => {
						e.preventDefault()
						form.handleSubmit()
					}}
					className="flex flex-col gap-4"
				>
					<form.Field
						name="name"
						validators={{
							onChange: ({ value }) => {
								const result = nameSchema.safeParse(value)
								return result.success ? undefined : result.error.issues[0]?.message
							},
							onBlur: ({ value }) => {
								const result = nameSchema.safeParse(value)
								return result.success ? undefined : result.error.issues[0]?.message
							},
						}}
					>
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="profile-name">Name</Label>
								<Input
									id="profile-name"
									placeholder="Your full name"
									autoComplete="name"
									maxLength={100}
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									aria-invalid={field.state.meta.errors.length > 0}
								/>
								{field.state.meta.errors.length > 0 && (
									<p className="text-destructive text-sm" role="alert">
										{field.state.meta.errors[0]}
									</p>
								)}
							</div>
						)}
					</form.Field>

					<div className="flex flex-col gap-1.5">
						<Label>Email</Label>
						<Input
							value={email}
							placeholder="your@email.com"
							disabled
							autoComplete="off"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>Role</Label>
						<div>
							<Badge variant="secondary">{role}</Badge>
						</div>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>Member since</Label>
						<p className="text-muted-foreground text-sm">
							{createdAt.toLocaleDateString(undefined, {
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
						</p>
					</div>

					{submitError && (
						<p className="text-destructive text-sm" role="alert">
							{submitError}
						</p>
					)}

					<form.Subscribe
						selector={(s) => ({
							canSubmit: s.canSubmit,
							isSubmitting: s.isSubmitting,
							name: s.values.name,
						})}
					>
						{({ canSubmit, isSubmitting, name: nameValue }) => (
							<Button
								type="submit"
								disabled={!canSubmit || isSubmitting || !nameValue.trim()}
								className="self-start"
							>
								{isSubmitting ? "Saving…" : "Save changes"}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	)
}
