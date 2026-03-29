import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

function AuthenticatedLayout() {
	return <Outlet />
}

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: ({ context }) => {
		if (!context.session) {
			throw redirect({ to: "/auth/login" })
		}
	},
	component: AuthenticatedLayout,
})
