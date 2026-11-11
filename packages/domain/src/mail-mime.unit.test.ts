import assert from "node:assert/strict";
import { test } from "node:test";
import {
	attachmentDownloadHeaders,
	authorizeAttachmentDownload,
	normalizeMimeType,
	sanitizeAttachmentFilename,
} from "./mail-attachments";
import {
	defaultMimeLimits,
	parseMessageIdList,
	parseMimeMessage,
} from "./mail-mime";
import {
	assignThread,
	type IndexedThreadMessage,
	normalizeSubject,
	type ThreadMessage,
} from "./mail-threading";

const scope = { organizationId: "org-a", mailboxId: "mailbox-a" };
const crlf = (lines: string[]) => new TextEncoder().encode(lines.join("\r\n"));

const multipart = crlf([
	"From: Customer <Customer@Example.test>",
	"To: info@shop.test",
	"Subject: =?UTF-8?Q?Order_=C3=A9?=",
	"Message-ID: <Msg-1@Example.test>",
	"In-Reply-To: <prev@shop.test>",
	"References: <root@shop.test> <prev@shop.test> <prev@shop.test>",
	"Date: Tue, 10 Nov 2026 10:00:00 +0000",
	"MIME-Version: 1.0",
	'Content-Type: multipart/mixed; boundary="b1"',
	"",
	"--b1",
	"Content-Type: text/plain; charset=utf-8",
	"",
	"Hello",
	"--b1",
	'Content-Type: text/html; name="evil.html"',
	'Content-Disposition: attachment; filename="..\\..\\evil\u202egpj.html"',
	"Content-Transfer-Encoding: base64",
	"",
	Buffer.from("<script>alert(1)</script>").toString("base64"),
	"--b1--",
	"",
]);

test("parses MIME into normalized, bounded metadata", async () => {
	const result = await parseMimeMessage(multipart);
	assert.ok(result.ok);
	const { message } = result;
	assert.equal(message.messageId, "msg-1@example.test");
	assert.equal(message.inReplyTo, "prev@shop.test");
	assert.deepEqual(message.references, ["root@shop.test", "prev@shop.test"]);
	assert.equal(message.subject, "Order é");
	assert.equal(message.from?.address, "customer@example.test");
	assert.equal(message.text.trim(), "Hello");
	assert.equal(message.attachments.length, 1);
	const attachment = message.attachments[0];
	assert.ok(attachment);
	assert.doesNotMatch(attachment.safeFilename, /[\\/\u202e]/);
	assert.equal(attachment.size, 25);
	assert.match(attachment.sha256, /^[0-9a-f]{64}$/);
	assert.match(message.contentHash, /^[0-9a-f]{64}$/);
});

test("rejects oversized, over-part and deeply nested input", async () => {
	const tooLarge = await parseMimeMessage(multipart, { maxRawBytes: 10 });
	assert.deepEqual(tooLarge, {
		ok: false,
		reason: "too_large",
		size: multipart.byteLength,
	});

	const parts = Array.from({ length: 20 }, (_, index) =>
		["--b", "Content-Type: text/plain", "", `part ${index}`].join("\r\n"),
	);
	const many = crlf([
		"From: a@example.test",
		'Content-Type: multipart/mixed; boundary="b"',
		"",
		...parts,
		"--b--",
	]);
	const overParts = await parseMimeMessage(many, { maxParts: 5 });
	assert.ok(!overParts.ok && overParts.reason === "limit_exceeded");

	let nested = "Content-Type: text/plain\r\n\r\nx";
	for (let depth = 0; depth < 10; depth += 1) {
		nested = `Content-Type: multipart/mixed; boundary="n${depth}"\r\n\r\n--n${depth}\r\n${nested}\r\n--n${depth}--`;
	}
	const deep = await parseMimeMessage(crlf(["From: a@example.test", nested]), {
		maxNestingDepth: 3,
	});
	assert.ok(!deep.ok && deep.reason === "limit_exceeded");
	await assert.rejects(
		parseMimeMessage(multipart, {
			maxRawBytes: defaultMimeLimits.maxRawBytes + 1,
		}),
		RangeError,
	);
});

test("caps attachment count and truncates oversized bodies", async () => {
	const result = await parseMimeMessage(multipart, {
		maxAttachments: 2,
		maxBodyChars: 4,
	});
	assert.ok(result.ok);
	assert.equal(result.message.attachments.length, 1);
	assert.equal(result.message.text.length, 4);
	assert.equal(result.message.bodyTruncated, true);
	const none = await parseMimeMessage(multipart, { maxAttachments: 0 });
	assert.ok(none.ok);
	assert.equal(none.message.attachments.length, 0);
	assert.equal(none.message.skippedParts, 1);

	const attachments = Array.from({ length: 3 }, (_, index) =>
		[
			`--boundary`,
			`Content-Type: text/plain; name="file-${index}.txt"`,
			`Content-Disposition: attachment; filename="file-${index}.txt"`,
			"",
			"payload",
		].join("\r\n"),
	);
	const many = crlf([
		"From: a@example.test",
		'Content-Type: multipart/mixed; boundary="boundary"',
		"",
		...attachments,
		"--boundary--",
	]);
	const capped = await parseMimeMessage(many, { maxAttachments: 2 });
	assert.ok(capped.ok);
	assert.equal(capped.message.attachments.length, 2);
	assert.equal(capped.message.skippedParts, 1);
});

test("Message-ID lists are bounded and deduplicated", () => {
	assert.deepEqual(
		parseMessageIdList(
			"<a@example.test> bad <b@example.test> <a@example.test>",
			2,
		),
		["a@example.test", "b@example.test"],
	);
	assert.deepEqual(parseMessageIdList("<a@example.test>", 0), []);
	assert.throws(() => parseMessageIdList("<a@example.test>", -1), RangeError);
});

test("sanitizes filenames and builds inert download headers", () => {
	assert.equal(
		sanitizeAttachmentFilename("../../etc/passwd"),
		"_.._etc_passwd",
	);
	assert.equal(sanitizeAttachmentFilename("  .hidden. "), "hidden");
	assert.equal(sanitizeAttachmentFilename(""), "attachment");
	assert.equal(sanitizeAttachmentFilename("a\u202eb\u0000.txt"), "ab.txt");
	assert.equal(sanitizeAttachmentFilename("📎.txt"), "📎.txt");
	assert.equal(normalizeMimeType("Text/HTML; charset=utf-8"), "text/html");
	assert.equal(normalizeMimeType("invalid type"), "application/octet-stream");
	const long = sanitizeAttachmentFilename(`${"x".repeat(300)}.pdf`);
	assert.equal(long.length, 120);
	assert.ok(long.endsWith(".pdf"));

	const headers = attachmentDownloadHeaders({
		safeFilename: 'résumé".html',
		mimeType: "text/html",
		size: 5,
	});
	assert.equal(headers["Content-Type"], "application/octet-stream");
	assert.match(
		headers["Content-Disposition"] as string,
		/^attachment; filename="r_sum__\.html"; filename\*=UTF-8''r%C3%A9sum%C3%A9_\.html$/,
	);
	assert.equal(headers["X-Content-Type-Options"], "nosniff");
	assert.equal(headers["Cache-Control"], "private, no-store");
	assert.throws(
		() =>
			attachmentDownloadHeaders({
				safeFilename: "file",
				mimeType: "text/plain",
				size: -1,
			}),
		RangeError,
	);
	assert.equal(
		attachmentDownloadHeaders({
			safeFilename: "a.pdf",
			mimeType: "application/pdf; x=y",
			size: 1,
		})["Content-Type"],
		"application/pdf",
	);
});

test("downloads require the exact organization, mailbox and read capability", () => {
	const attachment = {
		...scope,
		attachmentId: "att",
		messageId: "m",
		safeFilename: "a.pdf",
		mimeType: "application/pdf",
		size: 1,
	};
	const actor = { ...scope, capabilities: ["read" as const] };
	assert.equal(authorizeAttachmentDownload({ actor, attachment }), true);
	assert.equal(
		authorizeAttachmentDownload({
			actor: { ...actor, mailboxId: "other" },
			attachment,
		}),
		false,
	);
	assert.equal(
		authorizeAttachmentDownload({
			actor: { ...actor, organizationId: "other" },
			attachment,
		}),
		false,
	);
	assert.equal(
		authorizeAttachmentDownload({
			actor: { ...actor, capabilities: ["notes"] },
			attachment,
		}),
		false,
	);
});

const index = (messages: IndexedThreadMessage[]) => ({
	...scope,
	mailboxAddress: "info@shop.test",
	messages,
});
const stored = (
	conversationId: string,
	messageId: string | null,
	subject: string,
	customer: string,
	day = 1,
): IndexedThreadMessage => ({
	conversationId,
	messageId,
	normalizedSubject: normalizeSubject(subject),
	sentAt: new Date(Date.UTC(2026, 10, day)),
	participants: [customer, "info@shop.test"],
});
const incoming = (overrides: Partial<ThreadMessage>): ThreadMessage => ({
	messageId: "new@example.test",
	inReplyTo: null,
	references: [],
	subject: "Re: Order",
	sentAt: new Date(Date.UTC(2026, 10, 3)),
	participants: ["a@example.test", "info@shop.test"],
	...overrides,
});

test("threads by In-Reply-To then References", () => {
	const idx = index([
		stored("c1", "one@x", "Order", "a@example.test"),
		stored("c2", "two@x", "Other", "b@example.test"),
	]);
	assert.deepEqual(
		assignThread(
			scope,
			idx,
			incoming({ inReplyTo: "two@x", subject: "anything" }),
		),
		{
			kind: "existing",
			conversationId: "c2",
			method: "in_reply_to",
		},
	);
	assert.deepEqual(
		assignThread(scope, idx, incoming({ references: ["missing@x", "one@x"] })),
		{
			kind: "existing",
			conversationId: "c1",
			method: "references",
		},
	);
});

test("never merges conflicting references or duplicate Message-IDs", () => {
	const idx = index([
		stored("c1", "dup@x", "Order", "a@example.test"),
		stored("c2", "dup@x", "Order", "b@example.test"),
	]);
	assert.deepEqual(assignThread(scope, idx, incoming({ inReplyTo: "dup@x" })), {
		kind: "new",
		reason: "ambiguous_references",
	});
	const split = index([
		stored("c1", "a@x", "Order", "a@example.test"),
		stored("c2", "b@x", "Order", "b@example.test"),
	]);
	assert.equal(
		assignThread(scope, split, incoming({ references: ["a@x", "b@x"] })).kind,
		"new",
	);
});

test("subject fallback requires reply prefix, shared customer, window and uniqueness", () => {
	const idx = index([stored("c1", "one@x", "Order", "a@example.test")]);
	assert.deepEqual(assignThread(scope, idx, incoming({})), {
		kind: "existing",
		conversationId: "c1",
		method: "subject_participants",
	});
	assert.deepEqual(assignThread(scope, idx, incoming({ subject: "Order" })), {
		kind: "new",
		reason: "unsafe_subject",
	});
	assert.deepEqual(
		assignThread(
			scope,
			idx,
			incoming({ participants: ["z@example.test", "info@shop.test"] }),
		),
		{ kind: "new", reason: "no_match" },
	);
	assert.deepEqual(
		assignThread(
			scope,
			idx,
			incoming({ sentAt: new Date(Date.UTC(2026, 11, 30)) }),
		),
		{ kind: "new", reason: "no_match" },
	);
	assert.deepEqual(
		assignThread(scope, idx, incoming({ sentAt: new Date(Number.NaN) })),
		{ kind: "new", reason: "no_match" },
	);
	const both = index([
		stored("c1", "one@x", "Order", "a@example.test"),
		stored("c2", "two@x", "Order", "a@example.test", 2),
	]);
	assert.deepEqual(assignThread(scope, both, incoming({})), {
		kind: "new",
		reason: "ambiguous_subject",
	});
	// The mailbox's own address is not a customer match.
	const own = index([stored("c1", "one@x", "Order", "z@example.test")]);
	assert.equal(
		assignThread(
			scope,
			own,
			incoming({ participants: ["q@example.test", "info@shop.test"] }),
		).kind,
		"new",
	);
});

test("rejects an index from another mailbox", () => {
	assert.throws(() =>
		assignThread({ ...scope, mailboxId: "other" }, index([]), incoming({})),
	);
});
