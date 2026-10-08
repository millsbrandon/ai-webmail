"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { requestCsrfToken } from "../../../lib/auth/csrf-client";

export function InvitationForm({ token }: { token: string }) {
	const [csrfToken, setCsrfToken] = useState("");
	const [email, setEmail] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [password, setPassword] = useState("");
	const [message, setMessage] = useState("");
	const [pending, setPending] = useState(true);
	const [accepted, setAccepted] = useState(false);

	useEffect(() => {
		let cancelled = false;
		requestCsrfToken()
			.then((csrfToken) => {
				if (!cancelled) {
					setCsrfToken(csrfToken);
					setPending(false);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setMessage("Invitation could not be loaded. Try again later.");
					setPending(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPending(true);

		try {
			const response = await fetch("/api/auth/invitations/accept", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": csrfToken,
				},
				body: JSON.stringify({ token, email, displayName, password }),
			});
			const result = (await response.json()) as { error?: string };

			if (!response.ok) {
				setMessage(
					result.error ??
						"Invitation could not be used. Request a new invitation.",
				);
				setPending(false);
				return;
			}

			setAccepted(true);
			setPassword("");
			setMessage("Your account is ready. Sign in to continue.");
		} catch {
			setMessage("Invitation could not be processed. Try again later.");
			setPending(false);
		}
	}

	if (accepted) {
		return (
			<div aria-live="polite" className="auth-success">
				<p>{message}</p>
				<Link className="button button-primary" href="/login">
					Continue to sign in
				</Link>
			</div>
		);
	}

	return (
		<form className="auth-form" onSubmit={submit}>
			{message && (
				<p className="auth-error" role="alert">
					{message}
				</p>
			)}
			<div className="field-example">
				<label htmlFor="invite-email">Invited email</label>
				<input
					autoComplete="email"
					autoCapitalize="none"
					disabled={pending}
					id="invite-email"
					name="email"
					onChange={(event) => setEmail(event.target.value)}
					required
					type="email"
					value={email}
				/>
			</div>
			<div className="field-example">
				<label htmlFor="invite-display-name">Display name</label>
				<input
					autoComplete="name"
					disabled={pending}
					id="invite-display-name"
					maxLength={100}
					name="displayName"
					onChange={(event) => setDisplayName(event.target.value)}
					required
					value={displayName}
				/>
			</div>
			<div className="field-example">
				<label htmlFor="invite-password">Password</label>
				<input
					autoComplete="new-password"
					disabled={pending}
					id="invite-password"
					aria-describedby="invite-password-help"
					maxLength={256}
					name="password"
					onChange={(event) => setPassword(event.target.value)}
					required
					type="password"
					value={password}
				/>
				<p className="gallery-help" id="invite-password-help">
					Use 15–128 characters.
				</p>
			</div>
			<button
				className="button button-primary auth-submit"
				disabled={pending || !csrfToken}
				type="submit"
			>
				{pending ? "Working…" : "Accept invitation"}
			</button>
		</form>
	);
}
