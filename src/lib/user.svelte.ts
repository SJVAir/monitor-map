/**
 * Who is logged in. The host owns `globalThis.USER`; the map only reads it, and reads only
 * `is_authenticated` and `api_token`. A host that changes `USER` while the map is showing calls
 * `monitorMapUserChanged()` so what renders from it reads it again.
 */
interface HostUser {
	is_authenticated?: unknown;
	api_token?: unknown;
}

let version = $state(0);

export function currentUser(): HostUser | undefined {
	void version;
	const user = (globalThis as { USER?: unknown }).USER;
	return typeof user === "object" && user !== null ? (user as HostUser) : undefined;
}

export function isAuthenticated(): boolean {
	return Boolean(currentUser()?.is_authenticated);
}

/** Call after changing `globalThis.USER` (replacing it or editing a field) while the map is showing. */
export function monitorMapUserChanged(): void {
	version++;
}
