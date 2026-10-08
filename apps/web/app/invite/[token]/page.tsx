import type { Metadata } from "next";
import { InvitationForm } from "./invitation-form";

export const metadata: Metadata = {
	title: "Accept invitation | AI Webmail",
	robots: { index: false, follow: false },
};

export default async function InvitationPage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;

	return (
		<main className="auth-page">
			<section aria-labelledby="invitation-title" className="auth-card">
				<p className="eyebrow">Private shared inbox</p>
				<h1 id="invitation-title">Create your account</h1>
				<p className="auth-description">
					Choose a display name and password to accept this invitation.
				</p>
				<InvitationForm token={token} />
			</section>
		</main>
	);
}
