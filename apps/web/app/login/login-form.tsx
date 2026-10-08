"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import {
	clearCsrfTokenRequest,
	requestCsrfToken,
} from "../../lib/auth/csrf-client";

type FormState =
	| { status: "loading" }
	| { status: "ready"; csrfToken: string; message?: string }
	| { status: "submitting"; csrfToken: string }
	| { status: "authenticated"; csrfToken: string; displayName: string }
	| { status: "error"; message: string };

export function LoginForm() {
	const [state, setState] = useState<FormState>({ status: "loading" });
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	useEffect(() => {
		let cancelled = false;

		requestCsrfToken()
			.then((csrfToken) => {
				if (!cancelled) {
					setState({ status: "ready", csrfToken });
				}
			})
			.catch(() => {
				if (!cancelled) {
					setState({
						status: "error",
						message: "Sign-in is temporarily unavailable. Try again later.",
					});
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (state.status !== "ready") {
			return;
		}

		const csrfToken = state.csrfToken;

		setState({ status: "submitting", csrfToken });

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": csrfToken,
				},
				body: JSON.stringify({ email, password }),
			});
			const result = (await response.json()) as {
				csrfToken?: string;
				error?: string;
				user?: { displayName: string };
			};

			if (!response.ok || !result.csrfToken || !result.user) {
				const nextToken = await requestCsrfToken();
				setState({
					status: "ready",
					csrfToken: nextToken,
					message: result.error ?? "Email or password is incorrect.",
				});
				return;
			}

			setPassword("");
			setState({
				status: "authenticated",
				csrfToken: result.csrfToken,
				displayName: result.user.displayName,
			});
		} catch {
			setState({
				status: "error",
				message: "Sign-in is temporarily unavailable. Try again later.",
			});
		}
	}

	async function signOut() {
		if (state.status !== "authenticated") {
			return;
		}

		try {
			const logoutResponse = await fetch("/api/auth/logout", {
				method: "POST",
				headers: { "X-CSRF-Token": state.csrfToken },
			});
			if (!logoutResponse.ok) {
				throw new Error("Sign-out could not be confirmed.");
			}
			clearCsrfTokenRequest();
			setState({ status: "loading" });
			const csrfToken = await requestCsrfToken();
			setState({ status: "ready", csrfToken });
		} catch {
			setState({
				status: "error",
				message: "Sign-out could not be confirmed. Close this browser tab.",
			});
		}
	}

	if (state.status === "authenticated") {
		return (
			<div aria-live="polite" className="auth-success">
				<p>Signed in as {state.displayName}.</p>
				<p>Mailbox access has not been configured.</p>
				<button
					className="button button-secondary"
					onClick={signOut}
					type="button"
				>
					Sign out
				</button>
			</div>
		);
	}

	const pending = state.status === "loading" || state.status === "submitting";
	const csrfToken =
		state.status === "ready" || state.status === "submitting"
			? state.csrfToken
			: undefined;

	return (
		<form className="auth-form" onSubmit={submit}>
			{(state.status === "error" ||
				(state.status === "ready" && state.message)) && (
				<p className="auth-error" role="alert">
					{state.message}
				</p>
			)}
			<div className="field-example">
				<label htmlFor="login-email">Email</label>
				<input
					autoComplete="username"
					autoCapitalize="none"
					disabled={pending}
					id="login-email"
					name="email"
					onChange={(event) => setEmail(event.target.value)}
					required
					type="email"
					value={email}
				/>
			</div>
			<div className="field-example">
				<label htmlFor="login-password">Password</label>
				<input
					autoComplete="current-password"
					disabled={pending}
					id="login-password"
					name="password"
					onChange={(event) => setPassword(event.target.value)}
					required
					type="password"
					value={password}
				/>
			</div>
			<button
				className="button button-primary auth-submit"
				disabled={pending || !csrfToken}
				type="submit"
			>
				{state.status === "submitting" ? "Signing in…" : "Sign in"}
			</button>
			<Link className="auth-back-link" href="/">
				Back to home
			</Link>
		</form>
	);
}
