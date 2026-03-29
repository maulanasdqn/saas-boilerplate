import { useState } from "react"
import { redirect, useRouter } from "@tanstack/react-router"
import { z } from "zod"

import { authClient } from "#/server/auth/client"
import { useForm } from "#/libs/tanstack-form"
import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"

const loginSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
})

const validate = <K extends keyof typeof loginSchema.shape>(
	field: K,
	value: string,
) => {
	const result = loginSchema.shape[field].safeParse(value)
	return result.success ? undefined : result.error.issues[0]?.message
}

export const LoginForm = () => {
	const router = useRouter()
	const [formError, setFormError] = useState<string | null>(null)

	const form = useForm({
		defaultValues: { email: "", password: "" },
		onSubmit: async ({ value }) => {
			const { error } = await authClient.signIn.email(value)
			if (error) {
				setFormError(error.message ?? "Sign in failed")
				return
			}
			await router.invalidate()
			throw redirect({ to: "/" })
		},
	})

	return (
		<div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
			<div className="flex flex-col space-y-2 text-center">
				<h1 className="text-2xl font-semibold tracking-tight">
					Sign in to your account
				</h1>
				<p className="text-sm text-muted-foreground">
					Enter your email and password below
				</p>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault()
					form.handleSubmit()
				}}
				className="space-y-4"
			>
				<form.Field
					name="email"
					validators={{ onBlur: ({ value }) => validate("email", value) }}
				>
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="name@example.com"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								autoComplete="email"
							/>
							{field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">
									{field.state.meta.errors[0]}
								</p>
							)}
						</div>
					)}
				</form.Field>

				<form.Field
					name="password"
					validators={{ onBlur: ({ value }) => validate("password", value) }}
				>
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								autoComplete="current-password"
							/>
							{field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">
									{field.state.meta.errors[0]}
								</p>
							)}
						</div>
					)}
				</form.Field>

				{formError && (
					<p className="text-sm text-destructive">{formError}</p>
				)}

				<form.Subscribe selector={(s) => ({ isSubmitting: s.isSubmitting, email: s.values.email, password: s.values.password })}>
					{({ isSubmitting, email, password }) => (
						<Button type="submit" className="w-full" disabled={!email || !password || isSubmitting}>
							{isSubmitting ? "Signing in…" : "Sign in with Email"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<p className="px-8 text-center text-sm text-muted-foreground">
				Don&apos;t have an account?{" "}
				<a
					href="/auth/register"
					className="underline underline-offset-4 hover:text-primary"
				>
					Sign up
				</a>
			</p>

			<p className="px-8 text-center text-xs text-muted-foreground">
				By clicking continue, you agree to our{" "}
				<a href="#" className="underline underline-offset-4 hover:text-primary">
					Terms of Service
				</a>{" "}
				and{" "}
				<a href="#" className="underline underline-offset-4 hover:text-primary">
					Privacy Policy
				</a>
				.
			</p>
		</div>
	)
}
