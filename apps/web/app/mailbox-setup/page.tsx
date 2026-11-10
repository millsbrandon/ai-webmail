import type { Metadata } from "next";
import Link from "next/link";
import { SetupWizard } from "./setup-wizard";

export const metadata: Metadata = {
	title: "Mailbox setup preview | AI Webmail",
	robots: { index: false, follow: false },
};

export default function MailboxSetupPage() {
	return (
		<main className="auth-page">
			<section className="auth-card" aria-labelledby="setup-title">
				<p className="eyebrow">Disconnected development preview</p>
				<h1 id="setup-title">Mailbox setup preview</h1>
				<p className="auth-description">
					Synthetic folder mapping only. No provider is contacted, no mailbox is
					created and no mail is sent. Do not enter real mailbox details or
					credentials.
				</p>
				<SetupWizard />
				<Link href="/login">Back to sign in and security</Link>
			</section>
		</main>
	);
}
