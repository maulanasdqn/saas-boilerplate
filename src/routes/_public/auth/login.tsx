import { createFileRoute } from "@tanstack/react-router"

import { AuthSidebar } from "./_components/auth-sidebar"
import { LoginForm } from "./_components/login-form"

function LoginPage() {
	return (
		<div className="grid h-svh lg:grid-cols-2">
			<AuthSidebar />
			<div className="bg-background flex items-center justify-center p-8">
				<LoginForm />
			</div>
		</div>
	)
}

export const Route = createFileRoute("/_public/auth/login")({
	component: LoginPage,
})
