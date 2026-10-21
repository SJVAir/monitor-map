import { getSubscriptions } from "@sjvair/sdk/account";
import type { SignalOptions } from "$lib/abort";

export function getApiToken(): string | undefined {
	const token = (globalThis as unknown as Record<string, Record<string, unknown> | undefined>)[
		"USER"
	]?.api_token;
	return typeof token === "string" && token !== "" ? token : undefined;
}

export async function loadSubscriptionLevel(
	monitorId: string,
	options?: SignalOptions
): Promise<string | null> {
	const subscriptions = await getSubscriptions(getApiToken(), { signal: options?.signal });
	return subscriptions.find((s) => s.monitor === monitorId)?.level ?? null;
}
