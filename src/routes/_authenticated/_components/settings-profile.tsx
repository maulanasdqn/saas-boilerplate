import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import { Separator } from "#/components/ui/separator"
import { authClient } from "#/server/auth/client"

const nameSchema = z.string().min(1, "Name is required").max(100, "Name too long")

interface SettingsProfileProps {
	name: string
	email: string
	role: string
	createdAt: Date
}

export function SettingsProfile({ name, email, role, createdAt }: SettingsProfileProps) {
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
		<div className="flex flex-col gap-6">
			<div>
				<h2 className="text-lg font-semibold">Profile</h2>
				<p className="text-muted-foreground text-sm">
					Update your personal information.
				</p>
			</div>

			<Separator />

			<form
				className="flex flex-col gap-5"
				onSubmit={(e) => {
					e.preventDefault()
					form.handleSubmit()
				}}
			>
				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
					<form.Field
						name="name"
						validators={{
							onChange: ({ value }) => {
								const r = nameSchema.safeParse(value)
								return r.success ? undefined : r.error.issues[0]?.message
							},
							onBlur: ({ value }) => {
								const r = nameSchema.safeParse(value)
								return r.success ? undefined : r.error.issues[0]?.message
							},
						}}
					>
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="settings-name">Full Name</Label>
								<Input
									id="settings-name"
									placeholder="Your full name"
									autoComplete="name"
									maxLength={100}
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									aria-invalid={field.state.meta.errors.length > 0}
								/>
								{field.state.meta.errors[0] && (
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
							disabled
							autoComplete="off"
							placeholder="your@email.com"
						/>
						<p className="text-muted-foreground text-xs">
							Email cannot be changed here.
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
					<div className="flex flex-col gap-1.5">
						<Label>Role</Label>
						<div className="flex items-center gap-2 py-1">
							<Badge variant="secondary">{role}</Badge>
						</div>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>Member Since</Label>
						<p className="text-muted-foreground py-1 text-sm">
							{createdAt.toLocaleDateString(undefined, {
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
						</p>
					</div>
				</div>

				{submitError && (
					<p className="text-destructive text-sm" role="alert">
						{submitError}
					</p>
				)}
				<div>
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
							>
								{isSubmitting ? "Saving…" : "Save Changes"}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</form>
		</div>
	)
}
