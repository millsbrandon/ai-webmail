import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MailShell } from "../../../../components/mail-shell";
import {
	getDemoThreadSummaries,
	isSyntheticInboxPreviewEnabled,
} from "../../../../lib/mail-demo";

export const metadata: Metadata = {
	title: "Synthetic inbox preview | AI Webmail",
	robots: { index: false, follow: false },
};

export default async function MailboxLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ mailboxId: string; view: string }>;
}>) {
	const { mailboxId, view } = await params;
	if (
		!isSyntheticInboxPreviewEnabled() ||
		mailboxId !== "demo" ||
		view !== "inbox"
	) {
		notFound();
	}

	return <MailShell threads={getDemoThreadSummaries()}>{children}</MailShell>;
}
