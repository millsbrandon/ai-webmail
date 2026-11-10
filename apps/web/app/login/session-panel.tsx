"use client";

import { useCallback, useEffect, useState } from "react";

type SessionSummary = {
	id: string;
	deviceLabel: string;
	authenticationMethod: string;
	createdAt: string;
	lastSeenAt: string;
	absoluteExpiresAt: string;
	current: boolean;
};

export function SessionPanel({ csrfToken }: { csrfToken: string }) {
	const [sessions, setSessions] = useState<SessionSummary[]>();
	const [message, setMessage] = useState<string>();
	const [busy, setBusy] = useState(false);

	const reload = useCallback(async () => {
		const response = await fetch("/api/auth/sessions", { cache: "no-store" });
		if (!response.ok) {
			throw new Error("Sessions could not be loaded.");
		}
		const result = (await response.json()) as { sessions: SessionSummary[] };
		setSessions(result.sessions);
	}, []);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/auth/sessions", { cache: "no-store" })
			.then(async (response) => {
				if (!response.ok) {
					throw new Error("Sessions could not be loaded.");
				}
				return (await response.json()) as { sessions: SessionSummary[] };
			})
			.then((result) => {
				if (!cancelled) setSessions(result.sessions);
			})
			.catch(() => {
				if (!cancelled) setMessage("Sessions are temporarily unavailable.");
			});
		return () => {
			cancelled = true;
		};
	}, []);

	async function revoke(id?: string) {
		setBusy(true);
		setMessage(undefined);
		try {
			const response = await fetch(
				id
					? `/api/auth/sessions/${encodeURIComponent(id)}`
					: "/api/auth/sessions",
				{
					method: "DELETE",
					headers: { "X-CSRF-Token": csrfToken },
				},
			);
			const result = (await response.json()) as { error?: string };
			if (!response.ok) {
				throw new Error(result.error ?? "Sessions could not be revoked.");
			}
			await reload();
			setMessage("Other selected sessions have been signed out.");
		} catch (error) {
			setMessage(
				error instanceof Error
					? error.message
					: "Sessions could not be revoked.",
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<section aria-labelledby="sessions-title" className="auth-security">
			<h2 id="sessions-title">Active sessions</h2>
			<p>
				Device names are approximate. Signing out other sessions requires
				authentication within the last five minutes.
			</p>
			{message && <p role="status">{message}</p>}
			{sessions && (
				<>
					<ul>
						{sessions.map((session) => (
							<li key={session.id}>
								<p>
									{session.deviceLabel} ({session.authenticationMethod})
									{session.current ? " — Current session" : ""}
								</p>
								<p>
									Signed in{" "}
									<time dateTime={session.createdAt}>
										{new Date(session.createdAt).toLocaleString()}
									</time>
									; last active{" "}
									<time dateTime={session.lastSeenAt}>
										{new Date(session.lastSeenAt).toLocaleString()}
									</time>
									.
								</p>
								{!session.current && (
									<button
										className="button button-secondary"
										disabled={busy}
										onClick={() => revoke(session.id)}
										type="button"
									>
										Sign out {session.deviceLabel}
									</button>
								)}
							</li>
						))}
					</ul>
					<button
						className="button button-secondary"
						disabled={busy || sessions.every((session) => session.current)}
						onClick={() => revoke()}
						type="button"
					>
						Sign out other sessions
					</button>
				</>
			)}
		</section>
	);
}
