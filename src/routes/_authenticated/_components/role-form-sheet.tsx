import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet"
import { Textarea } from "#/components/ui/textarea"
import { orpc } from "#/server/orpc/client"

interface RoleRow {
	id: string
	label: string
	description: string
	isSystem: boolean
}

interface RoleFormSheetProps {
	mode: "create" | "edit"
	role?: RoleRow
	open: boolean
	onOpenChange: (open: boolean) => void
}

const idSchema = z
	.string()
	.min(2, "Must be at least 2 characters")
	.max(50, "Too long")
	.regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only")

const labelSchema = z.string().min(1, "Label is required").max(100, "Too long")
const descriptionSchema = z.string().max(500, "Too long")

function fieldError(schema: z.ZodTypeAny, value: string) {
	const r = schema.safeParse(value)
	return r.success ? undefined : r.error.issues[0]?.message
}

function extractErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message
	if (typeof error === "string") return error
	return "An unexpected error occurred"
}

export function RoleFormSheet({ mode, role, open, onOpenChange }: RoleFormSheetProps) {
	const queryClient = useQueryClient()

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: orpc.admin.listRoles.key() })

	const createRole = useMutation({
		...orpc.admin.createRole.mutationOptions(),
		onSuccess: () => {
			invalidate()
			onOpenChange(false)
			toast.success("Role created")
		},
		onError: (err) => toast.error(extractErrorMessage(err)),
	})

	const updateRole = useMutation({
		...orpc.admin.updateRole.mutationOptions(),
		onSuccess: () => {
			invalidate()
			onOpenChange(false)
			toast.success("Role updated")
		},
		onError: (err) => toast.error(extractErrorMessage(err)),
	})

	const mutation = mode === "create" ? createRole : updateRole

	const form = useForm({
		defaultValues: {
			id: role?.id ?? "",
			label: role?.label ?? "",
			description: role?.description ?? "",
		},
		onSubmit: async ({ value }) => {
			if (mode === "create") {
				await createRole.mutateAsync({
					id: value.id.trim(),
					label: value.label.trim(),
					description: value.description.trim(),
				})
			} else if (role) {
				await updateRole.mutateAsync({
					id: role.id,
					label: value.label.trim(),
					description: value.description.trim(),
				})
			}
		},
	})

	React.useEffect(() => {
		if (open) {
			form.reset({
				id: role?.id ?? "",
				label: role?.label ?? "",
				description: role?.description ?? "",
			})
		}
	}, [open, role?.id]) // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>{mode === "create" ? "New Role" : "Edit Role"}</SheetTitle>
					<SheetDescription>
						{mode === "create"
							? "Create a new application role."
							: "Update the role's label and description."}
					</SheetDescription>
				</SheetHeader>
				<form
					className="flex flex-col gap-4 px-4 py-4"
					onSubmit={(e) => {
						e.preventDefault()
						form.handleSubmit()
					}}
				>
					{mode === "create" && (
						<form.Field
							name="id"
							validators={{
								onChange: ({ value }) => fieldError(idSchema, value),
								onBlur: ({ value }) => fieldError(idSchema, value),
							}}
						>
							{(field) => (
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="role-id">Role ID</Label>
									<Input
										id="role-id"
										placeholder="e.g. moderator"
										maxLength={50}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										aria-invalid={field.state.meta.errors.length > 0}
									/>
									<p className="text-muted-foreground text-xs">
										Lowercase letters, numbers, hyphens. Cannot be changed later.
									</p>
									{field.state.meta.errors[0] && (
										<p className="text-destructive text-sm" role="alert">
											{field.state.meta.errors[0]}
										</p>
									)}
								</div>
							)}
						</form.Field>
					)}

					<form.Field
						name="label"
						validators={{
							onChange: ({ value }) => fieldError(labelSchema, value),
							onBlur: ({ value }) => fieldError(labelSchema, value),
						}}
					>
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="role-label">Display Name</Label>
								<Input
									id="role-label"
									placeholder="e.g. Moderator"
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

					<form.Field
						name="description"
						validators={{
							onChange: ({ value }) => fieldError(descriptionSchema, value),
							onBlur: ({ value }) => fieldError(descriptionSchema, value),
						}}
					>
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="role-description">Description</Label>
								<Textarea
									id="role-description"
									placeholder="What can this role do?"
									maxLength={500}
									rows={3}
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

					{mutation.error && (
						<p className="text-destructive text-sm" role="alert">
							{extractErrorMessage(mutation.error)}
						</p>
					)}

					<SheetFooter className="px-0">
						<Button
							variant="outline"
							type="button"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<form.Subscribe
							selector={(s) => ({
								canSubmit: s.canSubmit,
								isSubmitting: s.isSubmitting,
								id: s.values.id,
								label: s.values.label,
							})}
						>
							{({ canSubmit, isSubmitting, id, label }) => (
								<Button
									type="submit"
									disabled={
										!canSubmit ||
										isSubmitting ||
										!label.trim() ||
										(mode === "create" && !id.trim())
									}
								>
									{isSubmitting
										? mode === "create"
											? "Creating…"
											: "Saving…"
										: mode === "create"
											? "Create"
											: "Save"}
								</Button>
							)}
						</form.Subscribe>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	)
}
