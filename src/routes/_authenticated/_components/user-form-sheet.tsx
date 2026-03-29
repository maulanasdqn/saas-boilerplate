import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet"
import { useHasPermission } from "#/routes/_public/auth/_hooks/use-has-permission"
import type { AppRole } from "#/server/auth/permissions"
import { orpc } from "#/server/orpc/client"

interface UserFormSheetProps {
	mode: "create" | "edit" | "delete"
	user?: {
		id: string
		name: string
		email: string
		role?: string | null
	}
	defaultRole?: AppRole
	open: boolean
	onOpenChange: (open: boolean) => void
}

// ─── Validation schemas (mirror server-side) ─────────────────────────────

const nameSchema = z.string().min(1, "Name is required").max(100, "Name too long")
const emailSchema = z
	.string()
	.min(1, "Email is required")
	.email("Invalid email address")
	.max(254, "Email too long")
const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters")
	.max(72, "Password too long")

function fieldError(schema: z.ZodTypeAny, value: string) {
	const r = schema.safeParse(value)
	return r.success ? undefined : r.error.issues[0]?.message
}

function extractErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message
	if (typeof error === "string") return error
	return "An unexpected error occurred"
}

// ─── Component ───────────────────────────────────────────────────────────

export function UserFormSheet({
	mode,
	user,
	defaultRole = "member",
	open,
	onOpenChange,
}: UserFormSheetProps) {
	const queryClient = useQueryClient()
	const canSetRole = useHasPermission("user", ["set-role"])

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: orpc.admin.listUsers.key() })

	const createUser = useMutation({
		...orpc.admin.createUser.mutationOptions(),
		onSuccess: () => {
			invalidate()
			onOpenChange(false)
			toast.success("User created")
		},
		onError: (err) => toast.error(extractErrorMessage(err)),
	})

	const updateUser = useMutation({
		...orpc.admin.updateUser.mutationOptions(),
		onSuccess: () => {
			invalidate()
			onOpenChange(false)
			toast.success("User updated")
		},
		onError: (err) => toast.error(extractErrorMessage(err)),
	})

	const deleteUser = useMutation({
		...orpc.admin.deleteUser.mutationOptions(),
		onSuccess: () => {
			invalidate()
			onOpenChange(false)
			toast.success("User deleted")
		},
		onError: (err) => toast.error(extractErrorMessage(err)),
	})

	// ── Create form ──────────────────────────────────────────────────────

	const createForm = useForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
			role: defaultRole,
		},
		onSubmit: async ({ value }) => {
			await createUser.mutateAsync({
				name: value.name.trim(),
				email: value.email.trim().toLowerCase(),
				password: value.password,
				role: value.role,
			})
		},
	})

	// ── Edit form ────────────────────────────────────────────────────────

	const editForm = useForm({
		defaultValues: {
			name: user?.name ?? "",
			email: user?.email ?? "",
		},
		onSubmit: async ({ value }) => {
			if (!user) return
			await updateUser.mutateAsync({
				userId: user.id,
				name: value.name.trim(),
				email: value.email.trim().toLowerCase(),
			})
		},
	})

	React.useEffect(() => {
		if (mode === "edit" && user) {
			editForm.reset({ name: user.name, email: user.email })
		}
	}, [user?.id, mode]) // eslint-disable-line react-hooks/exhaustive-deps

	// ── Delete confirmation ──────────────────────────────────────────────

	if (mode === "delete") {
		return (
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent side="right">
					<SheetHeader>
						<SheetTitle>Delete User</SheetTitle>
						<SheetDescription>This action cannot be undone.</SheetDescription>
					</SheetHeader>
					<div className="px-4 py-4">
						<p className="text-sm">
							Are you sure you want to delete{" "}
							<span className="font-medium">{user?.name}</span>{" "}
							<span className="text-muted-foreground">({user?.email})</span>?
						</p>
						{deleteUser.error && (
							<p className="text-destructive mt-3 text-sm" role="alert">
								{extractErrorMessage(deleteUser.error)}
							</p>
						)}
					</div>
					<SheetFooter>
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={deleteUser.isPending}
							onClick={() => user && deleteUser.mutate({ userId: user.id })}
						>
							{deleteUser.isPending ? "Deleting…" : "Delete"}
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		)
	}

	// ── Edit mode ────────────────────────────────────────────────────────

	if (mode === "edit") {
		return (
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent side="right">
					<SheetHeader>
						<SheetTitle>Edit User</SheetTitle>
						<SheetDescription>Update name and email.</SheetDescription>
					</SheetHeader>
					<form
						className="flex flex-col gap-4 px-4 py-4"
						onSubmit={(e) => {
							e.preventDefault()
							editForm.handleSubmit()
						}}
					>
						<editForm.Field
							name="name"
							validators={{
								onChange: ({ value }) => fieldError(nameSchema, value),
								onBlur: ({ value }) => fieldError(nameSchema, value),
							}}
						>
							{(field) => (
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="edit-name">Name</Label>
									<Input
										id="edit-name"
										placeholder="e.g. Jane Smith"
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
						</editForm.Field>

						<editForm.Field
							name="email"
							validators={{
								onChange: ({ value }) => fieldError(emailSchema, value),
								onBlur: ({ value }) => fieldError(emailSchema, value),
							}}
						>
							{(field) => (
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="edit-email">Email</Label>
									<Input
										id="edit-email"
										type="email"
										placeholder="e.g. jane@example.com"
										autoComplete="email"
										maxLength={254}
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
						</editForm.Field>

						<div className="flex flex-col gap-1.5">
							<Label>Role</Label>
							<Badge variant="outline" className="w-fit">
								{user?.role ?? "member"}
							</Badge>
							<p className="text-muted-foreground text-xs">
								Change role from the Users table.
							</p>
						</div>

						{updateUser.error && (
							<p className="text-destructive text-sm" role="alert">
								{extractErrorMessage(updateUser.error)}
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
							<editForm.Subscribe
								selector={(s) => ({
									canSubmit: s.canSubmit,
									isSubmitting: s.isSubmitting,
									name: s.values.name,
									email: s.values.email,
								})}
							>
								{({ canSubmit, isSubmitting, name, email }) => (
									<Button
										type="submit"
										disabled={
											!canSubmit ||
											isSubmitting ||
											!name.trim() ||
											!email.trim()
										}
									>
										{isSubmitting ? "Saving…" : "Save"}
									</Button>
								)}
							</editForm.Subscribe>
						</SheetFooter>
					</form>
				</SheetContent>
			</Sheet>
		)
	}

	// ── Create mode ──────────────────────────────────────────────────────

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>New User</SheetTitle>
					<SheetDescription>Create a new user account.</SheetDescription>
				</SheetHeader>
				<form
					className="flex flex-col gap-4 px-4 py-4"
					onSubmit={(e) => {
						e.preventDefault()
						createForm.handleSubmit()
					}}
				>
					<createForm.Field
						name="name"
						validators={{
							onChange: ({ value }) => fieldError(nameSchema, value),
							onBlur: ({ value }) => fieldError(nameSchema, value),
						}}
					>
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="create-name">Name</Label>
								<Input
									id="create-name"
									placeholder="e.g. Jane Smith"
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
					</createForm.Field>

					<createForm.Field
						name="email"
						validators={{
							onChange: ({ value }) => fieldError(emailSchema, value),
							onBlur: ({ value }) => fieldError(emailSchema, value),
						}}
					>
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="create-email">Email</Label>
								<Input
									id="create-email"
									type="email"
									placeholder="e.g. jane@example.com"
									autoComplete="email"
									maxLength={254}
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
					</createForm.Field>

					<createForm.Field
						name="password"
						validators={{
							onChange: ({ value }) => fieldError(passwordSchema, value),
							onBlur: ({ value }) => fieldError(passwordSchema, value),
						}}
					>
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="create-password">Password</Label>
								<Input
									id="create-password"
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
					</createForm.Field>

					{canSetRole && (
						<createForm.Field name="role">
							{(field) => (
								<div className="flex flex-col gap-1.5">
									<Label>Role</Label>
									<Select
										value={field.state.value}
										onValueChange={(v) => field.handleChange(v as AppRole)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select a role" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="member">Member</SelectItem>
											<SelectItem value="admin">Admin</SelectItem>
											<SelectItem value="owner">Owner</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}
						</createForm.Field>
					)}

					{createUser.error && (
						<p className="text-destructive text-sm" role="alert">
							{extractErrorMessage(createUser.error)}
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
						<createForm.Subscribe
							selector={(s) => ({
								canSubmit: s.canSubmit,
								isSubmitting: s.isSubmitting,
								name: s.values.name,
								email: s.values.email,
								password: s.values.password,
							})}
						>
							{({ canSubmit, isSubmitting, name, email, password }) => (
								<Button
									type="submit"
									disabled={
										!canSubmit ||
										isSubmitting ||
										!name.trim() ||
										!email.trim() ||
										!password.trim()
									}
								>
									{isSubmitting ? "Creating…" : "Create"}
								</Button>
							)}
						</createForm.Subscribe>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	)
}
