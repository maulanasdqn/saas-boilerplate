import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import { Separator } from "#/components/ui/separator"
import { authClient } from "#/server/auth/client"

const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters")
	.max(72, "Password too long")

function fieldError(schema: z.ZodTypeAny, value: string) {
	const r = schema.safeParse(value)
	return r.success ? undefined : r.error.issues[0]?.message
}

export function SettingsSecurity() {
	const [submitError, setSubmitError] = React.useState<string | null>(null)

	const form = useForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
		onSubmit: async ({ value }) => {
			setSubmitError(null)

			if (value.newPassword !== value.confirmPassword) {
				setSubmitError("New passwords do not match")
				return
			}

			try {
				const result = await authClient.changePassword({
					currentPassword: value.currentPassword,
					newPassword: value.newPassword,
					revokeOtherSessions: false,
				})
				if (result.error) {
					const msg = result.error.message ?? "Failed to change password"
					setSubmitError(msg)
					toast.error(msg)
					return
				}
				toast.success("Password changed")
				form.reset()
			} catch (err) {
				const msg = err instanceof Error ? err.message : "Failed to change password"
				setSubmitError(msg)
				toast.error(msg)
			}
		},
	})

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h2 className="text-lg font-semibold">Security</h2>
				<p className="text-muted-foreground text-sm">
					Manage your password and account security.
				</p>
			</div>

			<Separator />

			<div>
				<h3 className="mb-4 text-sm font-medium">Change Password</h3>

				<form
					className="flex max-w-sm flex-col gap-4"
					onSubmit={(e) => {
						e.preventDefault()
						form.handleSubmit()
					}}
				>
					<form.Field
						name="currentPassword"
						validators={{
							onChange: ({ value }) => fieldError(passwordSchema, value),
							onBlur: ({ value }) => fieldError(passwordSchema, value),
						}}
					>
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="current-password">Current Password</Label>
								<Input
									id="current-password"
									type="password"
									placeholder="Your current password"
									autoComplete="current-password"
									maxLength={72}
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

					<form.Field
						name="newPassword"
						validators={{
							onChange: ({ value }) => fieldError(passwordSchema, value),
							onBlur: ({ value }) => fieldError(passwordSchema, value),
						}}
					>
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="new-password">New Password</Label>
								<Input
									id="new-password"
									type="password"
									placeholder="Min. 8 characters"
									autoComplete="new-password"
									maxLength={72}
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

					<form.Field
						name="confirmPassword"
						validators={{
							onChange: ({ value, fieldApi }) => {
								const newPwd = fieldApi.form.getFieldValue("newPassword")
								if (value && newPwd && value !== newPwd) {
									return "Passwords do not match"
								}
								return fieldError(passwordSchema, value)
							},
							onBlur: ({ value, fieldApi }) => {
								const newPwd = fieldApi.form.getFieldValue("newPassword")
								if (value && newPwd && value !== newPwd) {
									return "Passwords do not match"
								}
								return fieldError(passwordSchema, value)
							},
						}}
					>
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="confirm-password">Confirm New Password</Label>
								<Input
									id="confirm-password"
									type="password"
									placeholder="Repeat your new password"
									autoComplete="new-password"
									maxLength={72}
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
								currentPassword: s.values.currentPassword,
								newPassword: s.values.newPassword,
								confirmPassword: s.values.confirmPassword,
							})}
						>
							{({ canSubmit, isSubmitting, currentPassword, newPassword, confirmPassword }) => (
								<Button
									type="submit"
									disabled={
										!canSubmit ||
										isSubmitting ||
										!currentPassword.trim() ||
										!newPassword.trim() ||
										!confirmPassword.trim()
									}
								>
									{isSubmitting ? "Updating…" : "Update Password"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</form>
			</div>
		</div>
	)
}
