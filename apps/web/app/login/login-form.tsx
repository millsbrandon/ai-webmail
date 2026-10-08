"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import {
	clearCsrfTokenRequest,
	requestCsrfToken,
} from "../../lib/auth/csrf-client";
import { SecurityPanel } from "./security-panel";

type AuthenticatedUser = { email: string; displayName: string };
type FormState =
	| { status: "loading" }
	| { status: "ready"; csrfToken: string; message?: string }
	| {
			status: "busy";
			csrfToken: string;
			action: "password" | "passkey" | "recovery";
	  }
	| {
			status: "authenticated";
			csrfToken: string;
			user: AuthenticatedUser;
	  }
	| { status: "error"; message: string };

export function LoginForm() {
	const [state, setState] = useState<FormState>({ status: "loading" });
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [recoveryCode, setRecoveryCode] = useState("");
	const [showRecovery, setShowRecovery] = useState(false);
	const [passkeySupported, setPasskeySupported] = useState(false);

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

	useEffect(() => {
		setPasskeySupported(
			typeof window !== "undefined" &&
				typeof window.PublicKeyCredential === "function" &&
				typeof navigator.credentials?.get === "function",
		);
	}, []);

	function completeSignIn(
		csrfToken: string | undefined,
		user: AuthenticatedUser | undefined,
	) {
		if (!csrfToken || !user) {
			throw new Error("The sign-in response was incomplete.");
		}
		setPassword("");
		setRecoveryCode("");
		setState({ status: "authenticated", csrfToken, user });
	}

	async function submitPassword(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (state.status !== "ready") {
			return;
		}

		const csrfToken = state.csrfToken;
		setState({ status: "busy", csrfToken, action: "password" });

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
				user?: AuthenticatedUser;
			};

			if (!response.ok) {
				const nextToken = await requestCsrfToken();
				setState({
					status: "ready",
					csrfToken: nextToken,
					message: result.error ?? "Email or password is incorrect.",
				});
				return;
			}

			completeSignIn(result.csrfToken, result.user);
		} catch {
			setState({
				status: "error",
				message: "Sign-in is temporarily unavailable. Try again later.",
			});
		}
	}

	async function submitPasskey() {
		if (state.status !== "ready") {
			return;
		}

		const csrfToken = state.csrfToken;
		setState({ status: "busy", csrfToken, action: "passkey" });

		try {
			const optionsResponse = await fetch(
				"/api/auth/passkeys/authentication/options",
				{
					method: "POST",
					headers: { "X-CSRF-Token": csrfToken },
				},
			);
			if (!optionsResponse.ok) {
				throw new Error("Passkey sign-in is temporarily unavailable.");
			}
			const challenge = (await optionsResponse.json()) as {
				challengeId: string;
				options: Parameters<typeof startAuthentication>[0]["optionsJSON"];
			};
			const assertion = await startAuthentication({
				optionsJSON: challenge.options,
			});
			const response = await fetch("/api/auth/passkeys/authentication/verify", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": csrfToken,
				},
				body: JSON.stringify({
					challengeId: challenge.challengeId,
					response: assertion,
				}),
			});
			const result = (await response.json()) as {
				csrfToken?: string;
				error?: string;
				user?: AuthenticatedUser;
			};
			if (!response.ok) {
				const nextToken = await requestCsrfToken();
				setState({
					status: "ready",
					csrfToken: nextToken,
					message: result.error ?? "Passkey could not be verified.",
				});
				return;
			}
			completeSignIn(result.csrfToken, result.user);
		} catch (error) {
			const nextToken = await requestCsrfToken().catch(() => undefined);
			if (!nextToken) {
				setState({
					status: "error",
					message: "Sign-in is temporarily unavailable. Try again later.",
				});
				return;
			}
			setState({
				status: "ready",
				csrfToken: nextToken,
				message:
					error instanceof Error && error.name === "NotAllowedError"
						? "Passkey sign-in was cancelled or no passkey was available."
						: "Passkey sign-in could not be completed. Try again.",
			});
		}
	}

	async function submitRecovery(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (state.status !== "ready") {
			return;
		}

		const csrfToken = state.csrfToken;
		setState({ status: "busy", csrfToken, action: "recovery" });
		try {
			const response = await fetch("/api/auth/recovery/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": csrfToken,
				},
				body: JSON.stringify({ code: recoveryCode.trim() }),
			});
			const result = (await response.json()) as {
				csrfToken?: string;
				error?: string;
				user?: AuthenticatedUser;
			};
			if (!response.ok) {
				const nextToken = await requestCsrfToken();
				setState({
					status: "ready",
					csrfToken: nextToken,
					message: result.error ?? "Recovery code could not be verified.",
				});
				return;
			}
			completeSignIn(result.csrfToken, result.user);
		} catch {
			setState({
				status: "error",
				message: "Recovery sign-in is temporarily unavailable.",
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
				<p>Signed in as {state.user.displayName}.</p>
				<p>Mailbox access has not been configured.</p>
				<SecurityPanel csrfToken={state.csrfToken} />
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

	const pending = state.status === "loading" || state.status === "busy";
	const csrfToken =
		state.status === "ready" || state.status === "busy"
			? state.csrfToken
			: undefined;

	return (
		<div className="auth-form">
			{(state.status === "error" ||
				(state.status === "ready" && state.message)) && (
				<p className="auth-error" role="alert">
					{state.message}
				</p>
			)}
			{passkeySupported && (
				<button
					className="button button-primary auth-submit"
					disabled={pending || !csrfToken}
					onClick={submitPasskey}
					type="button"
				>
					{state.status === "busy" && state.action === "passkey"
						? "Waiting for passkey…"
						: "Sign in with a passkey"}
				</button>
			)}
			<p className="auth-description">Or sign in with your password.</p>
			<form onSubmit={submitPassword}>
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
					className="button button-secondary auth-submit"
					disabled={pending || !csrfToken}
					type="submit"
				>
					{state.status === "busy" && state.action === "password"
						? "Signing in…"
						: "Sign in"}
				</button>
			</form>
			<button
				className="auth-back-link"
				disabled={pending}
				onClick={() => {
					setShowRecovery(!showRecovery);
					setState((current) =>
						current.status === "ready"
							? { ...current, message: undefined }
							: current,
					);
				}}
				type="button"
			>
				{showRecovery ? "Use another sign-in method" : "Use a recovery code"}
			</button>
			{showRecovery && (
				<form onSubmit={submitRecovery}>
					<div className="field-example">
						<label htmlFor="recovery-code">One-time recovery code</label>
						<input
							autoComplete="one-time-code"
							disabled={pending}
							id="recovery-code"
							maxLength={32}
							minLength={32}
							onChange={(event) => setRecoveryCode(event.target.value)}
							pattern="[a-fA-F0-9]{32}"
							required
							spellCheck={false}
							value={recoveryCode}
						/>
					</div>
					<button
						className="button button-secondary auth-submit"
						disabled={pending || !csrfToken}
						type="submit"
					>
						{state.status === "busy" && state.action === "recovery"
							? "Verifying code…"
							: "Sign in with recovery code"}
					</button>
				</form>
			)}
			<Link className="auth-back-link" href="/">
				Back to home
			</Link>
		</div>
	);
}
