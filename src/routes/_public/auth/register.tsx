import { createFileRoute } from "@tanstack/react-router"

import { AuthSidebar } from "./_components/auth-sidebar"
import { RegisterForm } from "./_components/register-form"

function RegisterPage() {
	return (
		<div className="grid h-svh lg:grid-cols-2">
			<AuthSidebar />
			<div className="bg-background flex items-center justify-center p-8">
				<RegisterForm />
			</div>
		</div>
	)
}

export const Route = createFileRoute("/_public/auth/register")({
	component: RegisterPage,
})
