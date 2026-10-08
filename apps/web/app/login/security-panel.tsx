"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useCallback, useEffect, useState } from "react";

type PasskeySummary = {
	credentialId: string;
	name: string;
	deviceType: "singleDevice" | "multiDevice";
	backedUp: boolean;
	createdAt: string;
	lastUsedAt: string | null;
};

type SecurityState = {
	passkeys: PasskeySummary[];
	remainingRecoveryCodes: number;
};

type Props = { csrfToken: string };

export function SecurityPanel({ csrfToken }: Props) {
	const [security, setSecurity] = useState<SecurityState>();
	const [name, setName] = useState("");
	const [newCodes, setNewCodes] = useState<string[]>();
	const [message, setMessage] = useState<string>();
	const [busy, setBusy] = useState(false);
	const [passkeySupported, setPasskeySupported] = useState(false);

	const reload = useCallback(async () => {
		const response = await fetch("/api/auth/passkeys", {
			cache: "no-store",
		});
		if (!response.ok) {
			throw new Error("Security settings could not be loaded.");
		}
		const result = (await response.json()) as SecurityState;
		setSecurity(result);
	}, []);

	useEffect(() => {
		setPasskeySupported(
			typeof window !== "undefined" &&
				typeof window.PublicKeyCredential === "function" &&
				typeof navigator.credentials?.create === "function",
		);
	}, []);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/auth/passkeys", { cache: "no-store" })
			.then(async (response) => {
				if (!response.ok) {
					throw new Error("Security settings could not be loaded.");
				}
				return (await response.json()) as SecurityState;
			})
			.then((result) => {
				if (!cancelled) {
					setSecurity(result);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setMessage("Passkey settings are temporarily unavailable.");
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	async function addPasskey() {
		setBusy(true);
		setMessage(undefined);
		try {
			const optionsResponse = await fetch(
				"/api/auth/passkeys/registration/options",
				{
					method: "POST",
					headers: { "X-CSRF-Token": csrfToken },
				},
			);
			const optionsResult = (await optionsResponse.json()) as {
				challengeId?: string;
				options?: Parameters<typeof startRegistration>[0]["optionsJSON"];
				error?: string;
			};
			if (
				!optionsResponse.ok ||
				!optionsResult.challengeId ||
				!optionsResult.options
			) {
				throw new Error(
					optionsResult.error ?? "Passkey could not be registered.",
				);
			}

			const registration = await startRegistration({
				optionsJSON: optionsResult.options,
			});
			const verifyResponse = await fetch(
				"/api/auth/passkeys/registration/verify",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-CSRF-Token": csrfToken,
					},
					body: JSON.stringify({
						challengeId: optionsResult.challengeId,
						name,
						response: registration,
					}),
				},
			);
			const result = (await verifyResponse.json()) as { error?: string };
			if (!verifyResponse.ok) {
				throw new Error(result.error ?? "Passkey could not be verified.");
			}
			setName("");
			setMessage("Passkey added.");
			await reload();
		} catch (error) {
			setMessage(
				error instanceof Error && error.name === "NotAllowedError"
					? "Passkey registration was cancelled."
					: error instanceof Error
						? error.message
						: "Passkey could not be registered.",
			);
		} finally {
			setBusy(false);
		}
	}

	async function removePasskey(credentialId: string) {
		setBusy(true);
		setMessage(undefined);
		try {
			const response = await fetch(
				`/api/auth/passkeys/${encodeURIComponent(credentialId)}`,
				{
					method: "DELETE",
					headers: { "X-CSRF-Token": csrfToken },
				},
			);
			const result = (await response.json()) as { error?: string };
			if (!response.ok) {
				throw new Error(result.error ?? "Passkey could not be removed.");
			}
			setMessage("Passkey removed.");
			await reload();
		} catch (error) {
			setMessage(
				error instanceof Error
					? error.message
					: "Passkey could not be removed.",
			);
		} finally {
			setBusy(false);
		}
	}

	async function rotateRecoveryCodes() {
		setBusy(true);
		setNewCodes(undefined);
		setMessage(undefined);
		try {
			const response = await fetch("/api/auth/recovery-codes", {
				method: "POST",
				headers: { "X-CSRF-Token": csrfToken },
			});
			const result = (await response.json()) as {
				codes?: string[];
				error?: string;
			};
			if (!response.ok || !result.codes) {
				throw new Error(result.error ?? "Recovery codes could not be created.");
			}
			setNewCodes(result.codes);
			setMessage("Save these codes now. They will not be shown again.");
			await reload();
		} catch (error) {
			setMessage(
				error instanceof Error
					? error.message
					: "Recovery codes could not be created.",
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<section aria-labelledby="security-title" className="auth-security">
			<h2 id="security-title">Passkeys and recovery</h2>
			<p>
				Manage sign-in credentials. Changes require signing in again within the
				last five minutes.
			</p>
			{message && (
				<p aria-live="polite" role="status">
					{message}
				</p>
			)}
			{security && (
				<>
					<h3>Passkeys</h3>
					{security.passkeys.length === 0 ? (
						<p>No passkeys are registered.</p>
					) : (
						<ul>
							{security.passkeys.map((passkey) => (
								<li key={passkey.credentialId}>
									<span>
										{passkey.name} —{" "}
										{passkey.deviceType === "multiDevice"
											? "synced"
											: "single-device"}
										{passkey.backedUp ? ", backed up" : ""}
									</span>{" "}
									<button
										className="button button-secondary"
										disabled={busy}
										onClick={() => removePasskey(passkey.credentialId)}
										type="button"
									>
										Remove {passkey.name}
									</button>
								</li>
							))}
						</ul>
					)}
					{passkeySupported ? (
						<>
							<div className="field-example">
								<label htmlFor="passkey-name">Name for new passkey</label>
								<input
									autoComplete="off"
									disabled={busy}
									id="passkey-name"
									maxLength={80}
									onChange={(event) => setName(event.target.value)}
									value={name}
								/>
							</div>
							<button
								className="button button-secondary"
								disabled={busy || name.trim().length === 0}
								onClick={addPasskey}
								type="button"
							>
								Add passkey
							</button>
						</>
					) : (
						<p>
							This browser does not support passkeys. Use a password or recovery
							code to sign in.
						</p>
					)}
					<h3>Recovery codes</h3>
					<p>{security.remainingRecoveryCodes} unused recovery codes.</p>
					<button
						className="button button-secondary"
						disabled={busy}
						onClick={rotateRecoveryCodes}
						type="button"
					>
						{security.remainingRecoveryCodes > 0
							? "Replace recovery codes"
							: "Create recovery codes"}
					</button>
				</>
			)}
			{newCodes && (
				<div>
					<p>
						Each code works once. Store them outside this account; replacing
						codes invalidates every code from the previous set.
					</p>
					<ol>
						{newCodes.map((code) => (
							<li key={code}>
								<code>{code}</code>
							</li>
						))}
					</ol>
				</div>
			)}
		</section>
	);
}
