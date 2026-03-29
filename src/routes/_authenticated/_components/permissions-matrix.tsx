import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select"
import { Switch } from "#/components/ui/switch"
import { useHasPermission } from "#/routes/_public/auth/_hooks/use-has-permission"
import { resourceActions } from "#/server/auth/permissions"
import { orpc } from "#/server/orpc/client"

const ACTION_LABELS: Record<string, string> = {
	create: "Create",
	list: "List",
	get: "View",
	update: "Update",
	delete: "Delete",
	ban: "Ban",
	"set-role": "Set Role",
	"set-password": "Set Password",
	impersonate: "Impersonate",
	"impersonate-admins": "Impersonate Admins",
	revoke: "Revoke",
	export: "Export",
}

const ACTION_DESCRIPTIONS: Record<string, string> = {
	create: "Create new records",
	list: "List all records",
	get: "View a single record",
	update: "Edit existing records",
	delete: "Permanently remove records",
	ban: "Ban and restrict accounts",
	"set-role": "Assign roles to users",
	"set-password": "Change user passwords",
	impersonate: "Log in as another user",
	"impersonate-admins": "Log in as an admin user",
	revoke: "Revoke active sessions",
	export: "Export data to CSV/JSON",
}

const RESOURCE_LABELS: Record<string, string> = {
	user: "Users",
	session: "Sessions",
	"activity-log": "Activity Log",
}

const RESOURCE_DESCRIPTIONS: Record<string, string> = {
	user: "Manage user accounts, roles, and access",
	session: "Manage active login sessions",
	"activity-log": "View and export system activity events",
}

const BUILT_IN_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
	owner: "default",
	admin: "secondary",
	member: "outline",
}

const ALL_ROWS = (
	Object.entries(resourceActions) as [
		keyof typeof resourceActions,
		readonly string[],
	][]
).flatMap(([resource, actions]) =>
	actions.map((action) => ({ resource: resource as string, action })),
)

export function PermissionsMatrix() {
	const queryClient = useQueryClient()
	const canEdit = useHasPermission("user", ["set-role"])

	const { data: rolesData, isLoading: rolesLoading } = useQuery(
		orpc.admin.listRoles.queryOptions(),
	)
	const { data: permsData, isLoading: permsLoading } = useQuery(
		orpc.admin.listRolePermissions.queryOptions(),
	)

	const roles = rolesData?.roles ?? []
	const permissions = permsData?.permissions ?? []

	const [selectedRoleId, setSelectedRoleId] = React.useState<string>("")
	const [pendingChanges, setPendingChanges] = React.useState<Map<string, boolean>>(new Map())
	const [isSaving, setIsSaving] = React.useState(false)

	React.useEffect(() => {
		if (roles.length > 0 && !selectedRoleId) {
			setSelectedRoleId(roles[0]!.id)
		}
	}, [roles, selectedRoleId])

	// Clear pending changes when switching roles
	React.useEffect(() => {
		setPendingChanges(new Map())
	}, [selectedRoleId])

	const selectedRole = roles.find((r) => r.id === selectedRoleId)

	const setPermission = useMutation(orpc.admin.setRolePermission.mutationOptions())

	const isServerGranted = (resource: string, action: string) =>
		permissions.some(
			(p) =>
				p.roleId === selectedRoleId &&
				p.resource === resource &&
				p.action === action,
		)

	const isGranted = (resource: string, action: string) => {
		const key = `${resource}:${action}`
		if (pendingChanges.has(key)) return pendingChanges.get(key)!
		return isServerGranted(resource, action)
	}

	const handleToggle = (resource: string, action: string, checked: boolean) => {
		const key = `${resource}:${action}`
		const serverGranted = isServerGranted(resource, action)
		setPendingChanges((prev) => {
			const next = new Map(prev)
			if (checked === serverGranted) {
				next.delete(key)
			} else {
				next.set(key, checked)
			}
			return next
		})
	}

	const handleSave = async () => {
		setIsSaving(true)
		try {
			await Promise.all(
				Array.from(pendingChanges.entries()).map(([key, granted]) => {
					const colonIdx = key.indexOf(":")
					const resource = key.slice(0, colonIdx)
					const action = key.slice(colonIdx + 1)
					return setPermission.mutateAsync({
						roleId: selectedRoleId,
						resource,
						action,
						granted,
					})
				}),
			)
			await queryClient.invalidateQueries({
				queryKey: orpc.admin.listRolePermissions.key(),
			})
			setPendingChanges(new Map())
			toast.success("Permissions saved")
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to save permissions")
		} finally {
			setIsSaving(false)
		}
	}

	const grantedCount = selectedRoleId
		? ALL_ROWS.filter(({ resource, action }) => isGranted(resource, action)).length
		: 0

	const isLoading = rolesLoading || permsLoading
	const hasPendingChanges = pendingChanges.size > 0

	return (
		<div className="flex flex-col gap-6">
			{/* Header: role selector + summary */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
				<Select
					value={selectedRoleId}
					onValueChange={setSelectedRoleId}
					disabled={isLoading}
				>
					<SelectTrigger className="w-56">
						<SelectValue placeholder="Pick a role…" />
					</SelectTrigger>
					<SelectContent>
						{roles.map((r) => (
							<SelectItem key={r.id} value={r.id}>
								<div className="flex items-center gap-2">
									<Badge
										variant={BUILT_IN_VARIANTS[r.id] ?? "outline"}
										className="text-xs"
									>
										{r.id}
									</Badge>
									{r.label}
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{selectedRole && (
					<div className="flex items-center gap-3">
						<Badge variant={BUILT_IN_VARIANTS[selectedRole.id] ?? "outline"}>
							{selectedRole.label}
						</Badge>
						{selectedRole.description && (
							<span className="text-muted-foreground text-sm">
								{selectedRole.description}
							</span>
						)}
						<span className="text-muted-foreground ml-auto text-sm">
							<span className="text-foreground font-semibold">{grantedCount}</span>
							{" / "}
							{ALL_ROWS.length} permissions
						</span>
					</div>
				)}
			</div>

			{!canEdit && (
				<p className="text-muted-foreground text-sm">
					Read-only. Only owners can modify permissions.
				</p>
			)}

			{/* Save bar */}
			{canEdit && (
				<div className="flex items-center justify-between rounded-lg border px-4 py-3">
					<p className="text-sm text-muted-foreground">
						{hasPendingChanges
							? `${pendingChanges.size} unsaved change${pendingChanges.size === 1 ? "" : "s"}`
							: "No pending changes"}
					</p>
					<div className="flex gap-2">
						{hasPendingChanges && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPendingChanges(new Map())}
								disabled={isSaving}
							>
								Discard
							</Button>
						)}
						<Button
							size="sm"
							onClick={handleSave}
							disabled={!hasPendingChanges || isSaving}
						>
							{isSaving ? "Saving…" : "Save changes"}
						</Button>
					</div>
				</div>
			)}

			{/* Permission cards by resource */}
			{selectedRole ? (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{(
						Object.entries(resourceActions) as [
							keyof typeof resourceActions,
							readonly string[],
						][]
					).map(([resource, actions]) => {
						const grantedInResource = actions.filter((a) =>
							isGranted(resource as string, a),
						).length

						return (
							<Card key={resource}>
								<CardHeader className="pb-3">
									<div className="flex items-center justify-between">
										<div>
											<CardTitle className="text-base">
												{RESOURCE_LABELS[resource] ?? resource}
											</CardTitle>
											<CardDescription>
												{RESOURCE_DESCRIPTIONS[resource] ?? ""}
											</CardDescription>
										</div>
										<span className="text-muted-foreground text-sm">
											<span className="text-foreground font-semibold">
												{grantedInResource}
											</span>
											/{actions.length}
										</span>
									</div>
								</CardHeader>
								<CardContent className="flex flex-col gap-3">
									{actions.map((action) => {
										const granted = isGranted(resource as string, action)
										const isPending = pendingChanges.has(`${resource}:${action}`)

										return (
											<div
												key={action}
												className="flex items-center justify-between"
											>
												<div>
													<p className={`text-sm font-medium${isPending ? " text-primary" : ""}`}>
														{ACTION_LABELS[action] ?? action}
													</p>
													{ACTION_DESCRIPTIONS[action] && (
														<p className="text-muted-foreground text-xs">
															{ACTION_DESCRIPTIONS[action]}
														</p>
													)}
												</div>
												<Switch
													checked={granted}
													disabled={!canEdit || isLoading || isSaving}
													onCheckedChange={(checked) =>
														handleToggle(resource as string, action, checked)
													}
												/>
											</div>
										)
									})}
								</CardContent>
							</Card>
						)
					})}
				</div>
			) : (
				!isLoading && (
					<p className="text-muted-foreground text-sm">
						No roles found. Create one on the Roles page first.
					</p>
				)
			)}
		</div>
	)
}
