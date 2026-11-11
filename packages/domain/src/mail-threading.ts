import type { MailboxScope } from "./mail-reconciliation";

export const subjectFallbackWindowMs = 14 * 24 * 60 * 60 * 1000;
const replyPrefix = /^\s*((re|fwd?|aw|wg|sv|vs|antw)\s*(\[\d+\])?\s*:\s*)+/i;

export type ThreadMessage = {
	messageId: string | null;
	inReplyTo: string | null;
	references: readonly string[];
	subject: string;
	sentAt: Date | null;
	// Lowercase addresses from From/To/Cc.
	participants: readonly string[];
};

export type IndexedThreadMessage = {
	conversationId: string;
	messageId: string | null;
	normalizedSubject: string;
	sentAt: Date;
	participants: readonly string[];
};

export type ThreadIndex = MailboxScope & {
	mailboxAddress: string;
	messages: readonly IndexedThreadMessage[];
};

export type ThreadDecision =
	| {
			kind: "existing";
			conversationId: string;
			method: "in_reply_to" | "references" | "subject_participants";
	  }
	| {
			kind: "new";
			reason:
				| "no_match"
				| "ambiguous_references"
				| "ambiguous_subject"
				| "unsafe_subject";
	  };

export function normalizeSubject(subject: string): string {
	return subject
		.replace(replyPrefix, "")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function counterparties(
	participants: readonly string[],
	mailboxAddress: string,
): Set<string> {
	const own = mailboxAddress.trim().toLowerCase();
	return new Set(
		participants
			.map((address) => address.trim().toLowerCase())
			.filter((address) => address !== own),
	);
}

function conversationsFor(
	index: ThreadIndex,
	ids: readonly string[],
): Set<string> {
	const wanted = new Set(ids);
	const found = new Set<string>();
	for (const entry of index.messages) {
		if (entry.messageId !== null && wanted.has(entry.messageId)) {
			found.add(entry.conversationId);
		}
	}
	return found;
}

// The index must contain only this mailbox's messages. Threads never span
// mailboxes, and subject similarity alone never joins distinct customers.
export function assignThread(
	scope: MailboxScope,
	index: ThreadIndex,
	message: ThreadMessage,
): ThreadDecision {
	if (
		index.organizationId !== scope.organizationId ||
		index.mailboxId !== scope.mailboxId
	) {
		throw new Error("Thread index does not belong to the target mailbox");
	}

	if (message.inReplyTo !== null) {
		const direct = conversationsFor(index, [message.inReplyTo]);
		if (direct.size === 1) {
			return {
				kind: "existing",
				conversationId: [...direct][0] as string,
				method: "in_reply_to",
			};
		}
	}
	const referenced = conversationsFor(index, [
		...message.references,
		...(message.inReplyTo === null ? [] : [message.inReplyTo]),
	]);
	if (referenced.size === 1) {
		return {
			kind: "existing",
			conversationId: [...referenced][0] as string,
			method: "references",
		};
	}
	if (referenced.size > 1) {
		return { kind: "new", reason: "ambiguous_references" };
	}

	// Without usable references, only join a reply-prefixed subject within a
	// bounded window and with a shared external participant.
	const subject = normalizeSubject(message.subject);
	if (
		subject === "" ||
		!replyPrefix.test(message.subject) ||
		message.sentAt === null
	) {
		return {
			kind: "new",
			reason:
				subject === "" || !replyPrefix.test(message.subject)
					? "unsafe_subject"
					: "no_match",
		};
	}
	const mine = counterparties(message.participants, index.mailboxAddress);
	const sentAt = message.sentAt.getTime();
	if (!Number.isFinite(sentAt)) {
		return { kind: "new", reason: "no_match" };
	}
	const candidates = new Set<string>();
	for (const entry of index.messages) {
		if (
			normalizeSubject(entry.normalizedSubject) !== subject ||
			!Number.isFinite(entry.sentAt.getTime()) ||
			Math.abs(sentAt - entry.sentAt.getTime()) > subjectFallbackWindowMs
		) {
			continue;
		}
		const theirs = counterparties(entry.participants, index.mailboxAddress);
		if ([...mine].some((address) => theirs.has(address))) {
			candidates.add(entry.conversationId);
		}
	}
	if (candidates.size === 1) {
		return {
			kind: "existing",
			conversationId: [...candidates][0] as string,
			method: "subject_participants",
		};
	}
	return {
		kind: "new",
		reason: candidates.size > 1 ? "ambiguous_subject" : "no_match",
	};
}
