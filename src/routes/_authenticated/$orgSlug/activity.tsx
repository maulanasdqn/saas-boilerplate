import * as React from "react"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import {
	IconActivity,
	IconChevronLeft,
	IconChevronRight,
	IconRefresh,
} from "@tabler/icons-react"
import { z } from "zod"
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar"

import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
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
import { orpc } from "#/server/orpc/client"
import { AppSidebar } from "../_components/app-sidebar"
import { SiteHeader } from "../_components/site-header"

const searchSchema = z.object({
	page: z.number().int().min(1).default(1).catch(1),
	resource: z.string().optional().catch(undefined),
	action: z.string().optional().catch(undefined),
})

export const Route = createFileRoute("/_authenticated/$orgSlug/activity")({
	validateSearch: searchSchema,
	beforeLoad: ({ context, params }) => {
		const orgRole = context.orgRole
		if (orgRole !== "admin" && orgRole !== "owner") {
			throw redirect({ to: "/$orgSlug/dashboard", params })
		}
	},
	component: ActivityPage,
})

const ACTION_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
	create: "default",
	update: "secondary",
	delete: "destructive",
	ban: "destructive",
	unban: "secondary",
	"set-role": "secondary",
}

const LIMIT = 20

function RelativeTime({ date }: { date: Date }) {
	const now = Date.now()
	const diff = now - date.getTime()
	const s = Math.floor(diff / 1000)
	const m = Math.floor(s / 60)
	const h = Math.floor(m / 60)
	const d = Math.floor(h / 24)

	let label: string
	if (s < 60) label = `${s}s ago`
	else if (m < 60) label = `${m}m ago`
	else if (h < 24) label = `${h}h ago`
	else label = `${d}d ago`

	return (
		<span title={date.toLocaleString()} className="tabular-nums">
			{label}
		</span>
	)
}

function ActivityPage() {
	const { page, resource, action } = Route.useSearch()
	const navigate = Route.useNavigate()

	const { data, isLoading, refetch, isFetching } = useQuery(
		orpc.admin.listActivityLogs.queryOptions({
			input: {
				limit: LIMIT,
				offset: (page - 1) * LIMIT,
				resource: resource || undefined,
				action: action || undefined,
			},
		}),
	)

	const logs = data?.logs ?? []
	const total = data?.total ?? 0
	const totalPages = Math.max(1, Math.ceil(total / LIMIT))

	const setFilter = (key: "resource" | "action", value: string | undefined) => {
		navigate({ search: (prev) => ({ ...prev, [key]: value, page: 1 }) })
	}

	const RESOURCES = ["user", "role", "session", "activity-log"]
	const ACTIONS = ["create", "update", "delete", "ban", "unban", "set-role"]

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}
		>
			<AppSidebar variant="inset" />
			<SidebarInset>
				<SiteHeader />
				<div className="flex flex-1 flex-col">
					<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
						{/* Header */}
						<div className="flex items-center justify-between gap-4">
							<div>
								<h1 className="text-2xl font-semibold">Activity Log</h1>
								<p className="text-sm text-muted-foreground">
									{total > 0 ? `${total} event${total === 1 ? "" : "s"} recorded` : "No events recorded yet"}
								</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => refetch()}
								disabled={isFetching}
							>
								<IconRefresh className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
								Refresh
							</Button>
						</div>

						{/* Filters */}
						<div className="flex flex-wrap gap-2">
							<Select
								value={resource ?? "all"}
								onValueChange={(v) => setFilter("resource", v === "all" ? undefined : v)}
							>
								<SelectTrigger className="h-8 w-40 text-xs">
									<SelectValue placeholder="All resources" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All resources</SelectItem>
									{RESOURCES.map((r) => (
										<SelectItem key={r} value={r}>{r}</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select
								value={action ?? "all"}
								onValueChange={(v) => setFilter("action", v === "all" ? undefined : v)}
							>
								<SelectTrigger className="h-8 w-36 text-xs">
									<SelectValue placeholder="All actions" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All actions</SelectItem>
									{ACTIONS.map((a) => (
										<SelectItem key={a} value={a}>{a}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Table */}
						<div className="rounded-lg border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-36">When</TableHead>
										<TableHead>Actor</TableHead>
										<TableHead className="w-28">Action</TableHead>
										<TableHead className="w-28">Resource</TableHead>
										<TableHead>Resource ID</TableHead>
										<TableHead>Details</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{isLoading ? (
										Array.from({ length: 8 }).map((_, i) => (
											<TableRow key={i}>
												{Array.from({ length: 6 }).map((_, j) => (
													<TableCell key={j}>
														<div className="h-4 w-full animate-pulse rounded bg-muted" />
													</TableCell>
												))}
											</TableRow>
										))
									) : logs.length === 0 ? (
										<TableRow>
											<TableCell colSpan={6} className="py-16 text-center">
												<div className="flex flex-col items-center gap-2 text-muted-foreground">
													<IconActivity className="size-8 opacity-40" />
													<p className="text-sm">No activity found</p>
												</div>
											</TableCell>
										</TableRow>
									) : (
										logs.map((log) => {
											let details: Record<string, unknown> | null = null
											try {
												if (log.metadata) details = JSON.parse(log.metadata)
											} catch {}

											return (
												<TableRow key={log.id}>
													<TableCell className="text-muted-foreground text-xs">
														<RelativeTime date={new Date(log.createdAt)} />
													</TableCell>
													<TableCell>
														{log.userName ? (
															<div>
																<p className="text-sm font-medium leading-none">{log.userName}</p>
																<p className="text-xs text-muted-foreground">{log.userEmail}</p>
															</div>
														) : (
															<span className="text-xs text-muted-foreground">System</span>
														)}
													</TableCell>
													<TableCell>
														<Badge
															variant={ACTION_COLORS[log.action] ?? "outline"}
															className="text-xs font-mono"
														>
															{log.action}
														</Badge>
													</TableCell>
													<TableCell>
														<span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
															{log.resource}
														</span>
													</TableCell>
													<TableCell className="text-xs text-muted-foreground font-mono">
														{log.resourceId ? (
															<span title={log.resourceId}>
																{log.resourceId.slice(0, 8)}…
															</span>
														) : (
															"—"
														)}
													</TableCell>
													<TableCell className="text-xs text-muted-foreground max-w-xs truncate">
														{details
															? Object.entries(details)
																	.map(([k, v]) => `${k}: ${String(v)}`)
																	.join(", ")
															: "—"}
													</TableCell>
												</TableRow>
											)
										})
									)}
								</TableBody>
							</Table>
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-between">
								<p className="text-sm text-muted-foreground">
									Page {page} of {totalPages}
								</p>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										disabled={page <= 1}
										onClick={() => navigate({ search: (prev) => ({ ...prev, page: page - 1 }) })}
									>
										<IconChevronLeft className="size-4" />
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={page >= totalPages}
										onClick={() => navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })}
									>
										<IconChevronRight className="size-4" />
									</Button>
								</div>
							</div>
						)}
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
