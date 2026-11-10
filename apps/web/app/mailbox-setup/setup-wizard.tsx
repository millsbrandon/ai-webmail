"use client";

import {
	type FolderMapping,
	folderRoles,
	type ProviderFolder,
	type SetupInput,
	suggestFolderMapping,
} from "@ai-webmail/domain/mailbox-setup";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { requestCsrfToken } from "../../lib/auth/csrf-client";

type Catalog = {
	organizations: { id: string; name: string }[];
	folders: ProviderFolder[];
};
type Preview = {
	settings: SetupInput;
	providerVerified: false;
	persisted: false;
	sendingEnabled: false;
};

export function SetupWizard() {
	const [catalog, setCatalog] = useState<Catalog>();
	const [organizationId, setOrganizationId] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [address, setAddress] = useState("");
	const [historyDays, setHistoryDays] = useState(0);
	const [folders, setFolders] = useState<FolderMapping>({
		inbox: "",
		sent: "",
		drafts: "",
		junk: "",
		trash: "",
	});
	const [step, setStep] = useState<"details" | "folders" | "review">("details");
	const [preview, setPreview] = useState<Preview>();
	const [message, setMessage] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [busy, setBusy] = useState(false);
	const heading = useRef<HTMLHeadingElement>(null);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/mailbox-setup", { cache: "no-store" })
			.then(async (response) => {
				const result = (await response.json()) as Catalog & { error?: string };
				if (!response.ok)
					throw new Error(result.error ?? "Setup could not be loaded.");
				if (!cancelled) {
					setCatalog(result);
					setOrganizationId(result.organizations[0]?.id ?? "");
					setFolders({
						inbox: "",
						sent: "",
						drafts: "",
						junk: "",
						trash: "",
						...suggestFolderMapping(result.folders),
					});
				}
			})
			.catch((error) => {
				if (!cancelled)
					setMessage(
						error instanceof Error
							? error.message
							: "Setup could not be loaded.",
					);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: Each step remounts the heading that must receive focus.
	useEffect(() => {
		heading.current?.focus();
	}, [step]);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMessage("");
		setErrors({});
		if (step === "details") {
			setStep("folders");
			return;
		}
		setBusy(true);
		try {
			const csrfToken = await requestCsrfToken();
			const response = await fetch("/api/mailbox-setup", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": csrfToken,
				},
				body: JSON.stringify({
					organizationId,
					settings: { displayName, address, historyDays, folders },
				}),
			});
			const result = (await response.json()) as Preview & {
				error?: string;
				errors?: Record<string, string>;
			};
			if (!response.ok) {
				setErrors(result.errors ?? {});
				if (
					result.errors?.displayName ||
					result.errors?.address ||
					result.errors?.historyDays
				)
					setStep("details");
				throw new Error(result.error ?? "Preview could not be checked.");
			}
			setPreview(result);
			setStep("review");
		} catch (error) {
			setMessage(
				error instanceof Error
					? error.message
					: "Preview could not be checked.",
			);
		} finally {
			setBusy(false);
		}
	}

	if (!catalog)
		return (
			<p role="status">{message || "Loading authorized setup options..."}</p>
		);
	if (catalog.organizations.length === 0)
		return (
			<p role="status">
				No owned organizations are available. Only organization owners can
				preview setup.
			</p>
		);
	return (
		<div className="setup-wizard">
			<p aria-live="polite">
				Step{" "}
				{step === "details"
					? "1 of 3: Details"
					: step === "folders"
						? "2 of 3: Folder mapping"
						: "3 of 3: Review"}
			</p>
			{message && (
				<p className="auth-error" role="alert">
					{message}
				</p>
			)}
			{step === "review" && preview ? (
				<section aria-labelledby="review-title">
					<h2 id="review-title" ref={heading} tabIndex={-1}>
						Review synthetic preview
					</h2>
					<dl>
						<dt>Mailbox name</dt>
						<dd>{preview.settings.displayName}</dd>
						<dt>Address</dt>
						<dd>{preview.settings.address}</dd>
						<dt>History</dt>
						<dd>
							{preview.settings.historyDays === 0
								? "New messages only"
								: `${preview.settings.historyDays} days`}
						</dd>
						{folderRoles.map((role) => (
							<div key={role}>
								<dt>{role}</dt>
								<dd>{preview.settings.folders[role]}</dd>
							</div>
						))}
					</dl>
					<p role="status">
						Preview checked. Provider not verified. Nothing saved. Sending
						disabled.
					</p>
					<button
						className="button button-secondary"
						type="button"
						onClick={() => {
							setPreview(undefined);
							setStep("details");
						}}
					>
						Edit preview
					</button>
				</section>
			) : (
				<form className="auth-form" onSubmit={submit}>
					{step === "details" ? (
						<>
							<h2 ref={heading} tabIndex={-1}>
								Mailbox details
							</h2>
							<label htmlFor="setup-organization">Organization</label>
							<select
								id="setup-organization"
								value={organizationId}
								onChange={(event) => setOrganizationId(event.target.value)}
							>
								{catalog.organizations.map((organization) => (
									<option key={organization.id} value={organization.id}>
										{organization.name}
									</option>
								))}
							</select>
							<label htmlFor="setup-name">Mailbox name</label>
							<input
								id="setup-name"
								required
								maxLength={100}
								value={displayName}
								onChange={(event) => setDisplayName(event.target.value)}
								aria-invalid={Boolean(errors.displayName)}
								aria-describedby={
									errors.displayName ? "setup-name-error" : undefined
								}
							/>
							{errors.displayName && (
								<p id="setup-name-error">{errors.displayName}</p>
							)}
							<label htmlFor="setup-address">Synthetic email address</label>
							<input
								id="setup-address"
								type="email"
								required
								maxLength={254}
								placeholder="team@example.test"
								value={address}
								onChange={(event) => setAddress(event.target.value)}
								aria-invalid={Boolean(errors.address)}
								aria-describedby={
									errors.address ? "setup-address-error" : undefined
								}
							/>
							{errors.address && (
								<p id="setup-address-error">{errors.address}</p>
							)}
							<label htmlFor="setup-history">Initial history window</label>
							<select
								id="setup-history"
								value={historyDays}
								onChange={(event) => setHistoryDays(Number(event.target.value))}
							>
								<option value={0}>New messages only</option>
								{[30, 90, 365].map((days) => (
									<option key={days} value={days}>
										{days} days
									</option>
								))}
							</select>
							<button className="button button-primary" type="submit">
								Next: folder mapping
							</button>
						</>
					) : (
						<>
							<h2 ref={heading} tabIndex={-1}>
								Map synthetic folders
							</h2>
							<p>
								These folders are fixtures, not a provider folder listing.
								Suggestions use explicit special-use flags.
							</p>
							{folderRoles.map((role) => (
								<div className="field-example" key={role}>
									<label htmlFor={`folder-${role}`}>
										{role[0].toUpperCase() + role.slice(1)} folder
									</label>
									<select
										id={`folder-${role}`}
										required
										value={folders[role]}
										disabled={busy}
										onChange={(event) =>
											setFolders((current) => ({
												...current,
												[role]: event.target.value,
											}))
										}
										aria-invalid={Boolean(errors[role])}
										aria-describedby={
											errors[role] ? `${role}-error` : undefined
										}
									>
										<option value="">Choose a folder</option>
										{catalog.folders
											.filter((folder) => folder.selectable)
											.map((folder) => (
												<option key={folder.path} value={folder.path}>
													{folder.path}
												</option>
											))}
									</select>
									{errors[role] && <p id={`${role}-error`}>{errors[role]}</p>}
								</div>
							))}
							<button
								className="button button-secondary"
								type="button"
								disabled={busy}
								onClick={() => setStep("details")}
							>
								Back to details
							</button>
							<button
								className="button button-primary"
								type="submit"
								disabled={busy}
							>
								{busy ? "Checking preview..." : "Check preview"}
							</button>
						</>
					)}
				</form>
			)}
		</div>
	);
}
