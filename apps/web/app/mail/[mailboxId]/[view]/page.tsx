import { AppIcon } from "../../../../components/icon";

export default function InboxPage() {
	return (
		<section
			aria-labelledby="inbox-empty-title"
			className="mail-reader mail-reader-empty"
		>
			<AppIcon name="Inbox" size={32} />
			<h2 id="inbox-empty-title">Select a conversation</h2>
			<p>
				Choose a fictional message from the list to preview the thread layout.
			</p>
		</section>
	);
}
