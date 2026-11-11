"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";
import type { DemoThread } from "../lib/mail-demo";
import { AppIcon } from "./icon";

const inboxHref = "/mail/demo/inbox";

function MailboxNavigation({
	compact = false,
	onNavigate,
}: {
	compact?: boolean;
	onNavigate?: () => void;
}) {
	return (
		<nav aria-label="Mailbox navigation" className="mail-navigation">
			<p className="mail-navigation-label">Example Studio</p>
			<Link
				aria-current="page"
				className="mail-navigation-link"
				href={inboxHref}
				onClick={onNavigate}
			>
				<AppIcon name="Inbox" />
				<span>Inbox</span>
			</Link>
			{compact ? (
				<p className="mail-navigation-note">
					Only this synthetic mailbox is available in the preview.
				</p>
			) : null}
		</nav>
	);
}

export function MailShell({
	children,
	threads,
}: {
	children: ReactNode;
	threads: Omit<DemoThread, "messages">[];
}) {
	const pathname = usePathname();
	const drawerRef = useRef<HTMLDialogElement>(null);
	const [theme, setTheme] = useState<"light" | "dark" | undefined>();
	const threadPathPrefix = `${inboxHref}/`;
	const selectedThreadId = pathname.startsWith(threadPathPrefix)
		? pathname.slice(threadPathPrefix.length)
		: undefined;
	const hasSelectedThread = threads.some(
		(thread) => thread.id === selectedThreadId,
	);

	function toggleTheme() {
		setTheme((current) => {
			if (current) {
				return current === "dark" ? "light" : "dark";
			}
			return window.matchMedia("(prefers-color-scheme: dark)").matches
				? "light"
				: "dark";
		});
	}

	function closeDrawer() {
		if (drawerRef.current?.open) {
			drawerRef.current.close();
		}
	}

	return (
		<div className="mail-workspace" data-theme={theme}>
			<a className="skip-link" href="#mail-main">
				Skip to inbox
			</a>
			<header className="mail-header">
				<button
					aria-label="Open mailbox navigation"
					className="button-icon mail-menu-trigger"
					onClick={() => drawerRef.current?.showModal()}
					type="button"
				>
					<AppIcon name="Menu" />
				</button>
				<Link aria-label="AI Webmail home" className="mail-brand" href="/">
					<AppIcon name="Inbox" size={22} />
					<span>AI Webmail</span>
				</Link>
				<label className="mail-search">
					<AppIcon name="Search" size={18} />
					<span className="visually-hidden">Search synthetic inbox</span>
					<input
						aria-describedby="mail-search-help"
						disabled
						placeholder="Search"
						type="search"
					/>
					<span className="visually-hidden" id="mail-search-help">
						Search is not available in this layout preview.
					</span>
				</label>
				<div className="mail-header-actions">
					<span className="mail-sync-status">
						<span aria-hidden="true" className="mail-status-dot" />
						Synthetic demo
					</span>
					<button
						aria-label="Toggle light and dark themes"
						className="button-icon mail-theme-toggle"
						onClick={toggleTheme}
						type="button"
					>
						<span>Theme</span>
					</button>
					<span
						aria-label="Synthetic demo user"
						className="mail-profile"
						role="img"
					>
						DE
					</span>
				</div>
			</header>

			<main
				aria-label="Synthetic shared inbox"
				className="mail-content"
				data-has-thread={hasSelectedThread ? "true" : "false"}
				id="mail-main"
				tabIndex={-1}
			>
				<aside className="mail-sidebar">
					<MailboxNavigation />
					<p className="mail-sidebar-status">
						<span aria-hidden="true" className="mail-status-dot" />
						No provider connected
					</p>
				</aside>

				<section aria-labelledby="mail-list-title" className="mail-list-pane">
					<header className="mail-list-header">
						<div>
							<p className="mail-list-context">Support</p>
							<h1 id="mail-list-title">Inbox</h1>
						</div>
						<p className="mail-list-count">
							{threads.length} <span>conversations</span>
						</p>
					</header>
					<p className="mail-demo-notice">
						Development preview. All people and messages are fictional.
					</p>
					<section aria-label="Conversations" className="mail-list-scroll">
						<ul className="mail-thread-list">
							{threads.map((thread) => {
								const selected = thread.id === selectedThreadId;

								return (
									<li key={thread.id}>
										<Link
											aria-current={selected ? "page" : undefined}
											aria-label={`Open thread: ${thread.subject} from ${thread.sender}`}
											className={`mail-thread-link${selected ? " is-selected" : ""}`}
											href={`${inboxHref}/${thread.id}`}
											prefetch={false}
										>
											<span
												aria-hidden="true"
												className={`mail-unread-dot${thread.unread ? " is-unread" : ""}`}
											/>
											<span className="mail-thread-copy">
												<span className="mail-thread-topline">
													<strong className={thread.unread ? "is-unread" : ""}>
														{thread.sender}
													</strong>
													<time>{thread.time}</time>
												</span>
												<span className="mail-thread-subject">
													{thread.subject}
												</span>
												<span className="mail-thread-preview">
													{thread.preview}
												</span>
												<span className="mail-thread-assignee">
													Assigned to {thread.assignee}
												</span>
											</span>
										</Link>
									</li>
								);
							})}
						</ul>
					</section>
				</section>

				{children}
			</main>

			<nav aria-label="Mobile inbox navigation" className="mail-mobile-bar">
				<Link href={inboxHref}>
					<AppIcon name="Inbox" size={18} />
					<span>Inbox</span>
				</Link>
				<span>Fictional data only</span>
			</nav>

			<dialog
				aria-labelledby="mail-drawer-title"
				className="mail-nav-dialog"
				ref={drawerRef}
			>
				<div className="mail-drawer-header">
					<h2 id="mail-drawer-title">Mailbox navigation</h2>
					<button
						className="button button-secondary mail-drawer-close"
						onClick={closeDrawer}
						type="button"
					>
						Close
					</button>
				</div>
				<MailboxNavigation compact onNavigate={closeDrawer} />
			</dialog>
		</div>
	);
}
