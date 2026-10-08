import type { Metadata } from "next";
import { AppIcon } from "../../components/icon";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
	title: "Sign in | AI Webmail",
	robots: { index: false, follow: false },
};

export default function LoginPage() {
	return (
		<main className="auth-page">
			<section aria-labelledby="login-title" className="auth-card">
				<div className="auth-brand">
					<span aria-hidden="true" className="auth-brand-icon">
						<AppIcon name="Inbox" size={22} />
					</span>
					<p className="eyebrow">Private shared inbox</p>
				</div>
				<h1 id="login-title">Sign in</h1>
				<p className="auth-description">
					Use the account created from your organization invitation.
				</p>
				<LoginForm />
				<p className="auth-footnote">
					Accounts are invitation-only. Contact your organization owner if you
					need access.
				</p>
			</section>
		</main>
	);
}
