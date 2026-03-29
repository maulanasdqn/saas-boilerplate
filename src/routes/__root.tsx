import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import { Toaster } from "sonner"
import PostHogProvider from "#/libs/posthog/provider"
import TanStackQueryProvider from "#/libs/tanstack-query/root-provider"
import TanStackQueryDevtools from "#/libs/tanstack-query/devtools"

import { getLocale } from "#/libs/paraglide"
import { getSessionFn } from "#/routes/_public/auth/_server/get-session"

import appCss from "../styles.css?url"

import type { QueryClient } from "@tanstack/react-query"
import type { Session } from "#/server/auth"

interface MyRouterContext {
	queryClient: QueryClient
	session: Session | null
	orgRole?: string | null
}

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

const RootDocument = () => (
	<html lang={getLocale()} suppressHydrationWarning>
		<head>
			<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
			<HeadContent />
		</head>
		<body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
			<PostHogProvider>
				<TanStackQueryProvider>
					<Outlet />
					<TanStackDevtools
						config={{ position: "bottom-right" }}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				</TanStackQueryProvider>
			</PostHogProvider>
			<Toaster />
			<Scripts />
		</body>
	</html>
)

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async () => {
		if (typeof document !== "undefined") {
			document.documentElement.setAttribute("lang", getLocale())
		}
		const session = await getSessionFn()
		return { session }
	},

	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "SaaS Boilerplate" },
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	component: RootDocument,
})
