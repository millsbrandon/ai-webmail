import Link from "next/link";
import { AppIcon } from "../components/icon";

export default function Home() {
	return (
		<main className="landing">
			<p className="eyebrow">Private shared inbox</p>
			<h1>AI Webmail</h1>
			<p className="intro">
				A standalone workspace for existing IMAP and SMTP accounts. Account
				access, mailbox connections, and integrations are not configured yet.
			</p>
			<p className="status">
				<AppIcon name="LockKeyhole" size={18} />
				Foundation build — no mailbox data is connected.
			</p>
			<div className="landing-actions">
				<Link className="button button-primary" href="/design-system">
					View component gallery
				</Link>
			</div>
		</main>
	);
}
