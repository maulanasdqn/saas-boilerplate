import * as React from "react"
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type ColumnFiltersState,
	type SortingState,
} from "@tanstack/react-table"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { IconDotsVertical, IconPlus } from "@tabler/icons-react"
import { toast } from "sonner"

import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu"
import { Input } from "#/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table"
import { useHasPermission } from "#/routes/_public/auth/_hooks/use-has-permission"
import { orpc } from "#/server/orpc/client"
import { UserFormSheet } from "./user-form-sheet"

export interface UserRow {
	id: string
	name: string
	email: string
	role?: string | null
	banned: boolean | null
	createdAt: string | Date
}

type SheetState =
	| { open: false }
	| { open: true; mode: "create" }
	| { open: true; mode: "edit" | "delete"; user: UserRow }

export function UsersDataTable({ users }: { users: UserRow[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sheet, setSheet] = React.useState<SheetState>({ open: false })

	const canSetRole = useHasPermission("user", ["set-role"])
	const canDelete = useHasPermission("user", ["delete"])
	const queryClient = useQueryClient()

	const invalidateUsers = () =>
		queryClient.invalidateQueries({ queryKey: orpc.admin.listUsers.key() })

	const banUser = useMutation({
		...orpc.admin.banUser.mutationOptions(),
		onSuccess: () => { invalidateUsers(); toast.success("User banned") },
		onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to ban user"),
	})
	const unbanUser = useMutation({
		...orpc.admin.unbanUser.mutationOptions(),
		onSuccess: () => { invalidateUsers(); toast.success("User unbanned") },
		onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to unban user"),
	})
	const setRole = useMutation({
		...orpc.admin.setRole.mutationOptions(),
		onSuccess: () => { invalidateUsers(); toast.success("Role updated") },
		onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update role"),
	})

	const columns: ColumnDef<UserRow>[] = [
		{ accessorKey: "name", header: "Name" },
		{ accessorKey: "email", header: "Email" },
		{
			accessorKey: "role",
			header: "Role",
			cell: ({ row }) => (
				<Badge variant="outline">{row.original.role ?? "member"}</Badge>
			),
		},
		{
			id: "status",
			header: "Status",
			cell: ({ row }) =>
				row.original.banned ? (
					<Badge variant="destructive">Banned</Badge>
				) : (
					<Badge variant="secondary">Active</Badge>
				),
		},
		{
			accessorKey: "createdAt",
			header: "Created",
			cell: ({ row }) =>
				new Date(row.original.createdAt).toLocaleDateString(undefined, {
					year: "numeric",
					month: "short",
					day: "numeric",
				}),
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => {
				const user = row.original
				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="size-8">
								<IconDotsVertical className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={() => setSheet({ open: true, mode: "edit", user })}
							>
								Edit
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							{user.banned ? (
								<DropdownMenuItem
									onClick={() => unbanUser.mutate({ userId: user.id })}
								>
									Unban
								</DropdownMenuItem>
							) : (
								<DropdownMenuItem
									onClick={() => banUser.mutate({ userId: user.id })}
								>
									Ban
								</DropdownMenuItem>
							)}
							{canSetRole && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() => setRole.mutate({ userId: user.id, role: "member" })}
									>
										Set role: member
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => setRole.mutate({ userId: user.id, role: "admin" })}
									>
										Set role: admin
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() =>
											setRole.mutate({ userId: user.id, role: "owner" })
										}
									>
										Set role: owner
									</DropdownMenuItem>
								</>
							)}
							{canDelete && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										onClick={() =>
											setSheet({ open: true, mode: "delete", user })
										}
									>
										Delete
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				)
			},
		},
	]

	const table = useReactTable({
		data: users,
		columns,
		state: { sorting, columnFilters },
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
	})

	return (
		<>
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between gap-2">
					<Input
						placeholder="Filter by name…"
						value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
						onChange={(e) =>
							table.getColumn("name")?.setFilterValue(e.target.value)
						}
						className="max-w-sm"
					/>
					<Button
						size="sm"
						onClick={() => setSheet({ open: true, mode: "create" })}
					>
						<IconPlus className="size-4" />
						New User
					</Button>
				</div>

				<div className="rounded-md border">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows.length ? (
								table.getRowModel().rows.map((row) => (
									<TableRow key={row.id}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-24 text-center"
									>
										No users found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				<div className="flex items-center justify-between">
					<p className="text-muted-foreground text-sm">
						{table.getFilteredRowModel().rows.length} user(s)
					</p>
					<div className="flex items-center gap-2">
						<Select
							value={String(table.getState().pagination.pageSize)}
							onValueChange={(v) => table.setPageSize(Number(v))}
						>
							<SelectTrigger className="w-24">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{[10, 20, 50].map((size) => (
									<SelectItem key={size} value={String(size)}>
										{size} / page
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							Next
						</Button>
					</div>
				</div>
			</div>

			{/* Sheets */}
			{sheet.open && sheet.mode === "create" && (
				<UserFormSheet
					mode="create"
					open
					onOpenChange={(open) => !open && setSheet({ open: false })}
				/>
			)}
			{sheet.open && sheet.mode === "edit" && (
				<UserFormSheet
					mode="edit"
					user={sheet.user}
					open
					onOpenChange={(open) => !open && setSheet({ open: false })}
				/>
			)}
			{sheet.open && sheet.mode === "delete" && (
				<UserFormSheet
					mode="delete"
					user={sheet.user}
					open
					onOpenChange={(open) => !open && setSheet({ open: false })}
				/>
			)}
		</>
	)
}
