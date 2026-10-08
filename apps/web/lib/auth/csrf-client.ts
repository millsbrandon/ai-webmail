"use client";

let csrfTokenRequest: Promise<string> | undefined;

export function requestCsrfToken() {
	csrfTokenRequest ??= fetch("/api/auth/csrf", { cache: "no-store" })
		.then(async (response) => {
			if (!response.ok) {
				throw new Error("CSRF bootstrap is unavailable.");
			}
			return (await response.json()) as { csrfToken: string };
		})
		.then(({ csrfToken }) => csrfToken)
		.catch((error: unknown) => {
			csrfTokenRequest = undefined;
			throw error;
		});

	return csrfTokenRequest;
}

export function clearCsrfTokenRequest() {
	csrfTokenRequest = undefined;
}
