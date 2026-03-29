import type { Session } from "#/server/auth"
import type { AppRole } from "#/server/auth/permissions"

export interface ORPCContext {
	headers: Headers
	session: Session | null
	orgRole: AppRole | null
}
