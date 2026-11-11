import Link from "next/link";
import { notFound } from "next/navigation";
import { AppIcon } from "../../../../../components/icon";
import { getDemoThread } from "../../../../../lib/mail-demo";

export default async function ThreadPage({
	params,
}: {
	params: Promise<{ threadId: string }>;
}) {
	const { threadId } = await params;
	const thread = getDemoThread(threadId);
	if (!thread) {
		notFound();
	}

	return (
		<section
			aria-labelledby="thread-subject"
			className="mail-reader mail-thread-reader"
		>
			<header className="mail-reader-toolbar">
				<Link className="mail-back-link" href="/mail/demo/inbox">
					<AppIcon name="ChevronLeft" size={18} />
					<span>Back to inbox</span>
				</Link>
				<p className="mail-from-identity">
					From <strong>Support &lt;support@example.invalid&gt;</strong>
				</p>
			</header>
			<div className="mail-thread-scroll">
				<header className="mail-thread-heading">
					<h1 id="thread-subject">{thread.subject}</h1>
					<p>
						{thread.sender} · Assigned to {thread.assignee}
					</p>
				</header>
				<div className="mail-messages">
					{thread.messages.map((message, index) => (
						<article
							className={`mail-message${message.kind === "internal-note" ? " is-internal-note" : ""}`}
							key={message.id}
						>
							{message.kind === "internal-note" ? (
								<p className="mail-internal-label">
									Internal note — not sent to customer
								</p>
							) : null}
							<details open={index === thread.messages.length - 1}>
								<summary>
									<strong>{message.sender}</strong>
									<time>{message.time}</time>
								</summary>
								<div className="mail-message-meta">
									<p>
										<strong>From</strong> {message.sender} &lt;
										{message.senderAddress}&gt;
									</p>
									<p>
										<strong>To</strong> {message.recipient}
									</p>
								</div>
								<p className="mail-message-body">{message.body}</p>
							</details>
						</article>
					))}
				</div>
			</div>
			<footer className="mail-thread-footer">
				Replying is unavailable in this synthetic layout preview.
			</footer>
		</section>
	);
}
