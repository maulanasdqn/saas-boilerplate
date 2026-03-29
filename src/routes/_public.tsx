import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_public")({
	beforeLoad: async ({ context }) => {
		if (context.session) {
			throw redirect({ to: "/" })
		}
	},
	component: () => <Outlet />,
})
