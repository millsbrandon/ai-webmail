import { createHash } from "node:crypto";
import PostalMime, { type Address } from "postal-mime";
import {
	normalizeMimeType,
	sanitizeAttachmentFilename,
} from "./mail-attachments";

const mebibyte = 1024 * 1024;

export type MimeLimits = {
	maxRawBytes: number;
	maxParts: number;
	maxNestingDepth: number;
	maxRfc822Depth: number;
	maxHeaderBytes: number;
	maxAttachments: number;
	maxBodyChars: number;
	maxReferences: number;
	parseTimeoutMs: number;
};

export const defaultMimeLimits: MimeLimits = {
	maxRawBytes: 50 * mebibyte,
	maxParts: 200,
	maxNestingDepth: 16,
	maxRfc822Depth: 3,
	maxHeaderBytes: 256 * 1024,
	maxAttachments: 100,
	maxBodyChars: 2 * mebibyte,
	maxReferences: 50,
	parseTimeoutMs: 10_000,
};

export type MimeRejection =
	| "too_large"
	| "limit_exceeded"
	| "timeout"
	| "malformed";

export type ParsedAddress = { name: string; address: string };

export type ParsedAttachment = {
	safeFilename: string;
	mimeType: string;
	disposition: "attachment" | "inline";
	contentId: string | null;
	size: number;
	sha256: string;
	content: Uint8Array;
};

export type ParsedMessage = {
	messageId: string | null;
	inReplyTo: string | null;
	references: string[];
	subject: string;
	sentAt: Date | null;
	from: ParsedAddress | null;
	to: ParsedAddress[];
	cc: ParsedAddress[];
	text: string;
	// Untrusted markup; it must be sanitized and sandboxed before any rendering.
	html: string | null;
	bodyTruncated: boolean;
	attachments: ParsedAttachment[];
	// Parts beyond limits or nested messages that were not expanded.
	skippedParts: number;
	size: number;
	contentHash: string;
};

export type MimeResult =
	| { ok: true; message: ParsedMessage }
	| { ok: false; reason: MimeRejection; size: number };

// Strips angle brackets and rejects control characters or absurd lengths.
export function normalizeMessageId(
	raw: string | null | undefined,
): string | null {
	const value = (raw ?? "").trim().replace(/^<|>$/g, "").trim();
	if (
		value === "" ||
		value.length > 998 ||
		/[\s<>]/.test(value) ||
		[...value].some((character) => {
			const codePoint = character.codePointAt(0) ?? 0;
			return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
		})
	) {
		return null;
	}
	return value.toLowerCase();
}

export function parseMessageIdList(
	raw: string | null | undefined,
	max: number,
): string[] {
	if (!Number.isInteger(max) || max < 0) {
		throw new RangeError(
			"Message-ID list limit must be a non-negative integer",
		);
	}
	if (max === 0) {
		return [];
	}
	const found = (raw ?? "").match(/<[^<>\s]{1,998}>/g) ?? [];
	const ids: string[] = [];
	for (const candidate of found) {
		const id = normalizeMessageId(candidate);
		if (id !== null && !ids.includes(id)) {
			ids.push(id);
		}
		if (ids.length >= max) {
			break;
		}
	}
	return ids;
}

function flattenAddresses(
	addresses: Address[] | undefined,
	limit = 500,
): ParsedAddress[] {
	const out: ParsedAddress[] = [];
	const visit = (entries: Address[] | undefined) => {
		for (const entry of entries ?? []) {
			if (out.length >= limit) {
				return;
			}
			if ("group" in entry && entry.group) {
				visit(entry.group);
			} else if (entry.address) {
				out.push({
					name: (entry.name ?? "").slice(0, 200),
					address: entry.address.trim().toLowerCase(),
				});
			}
		}
	};
	visit(addresses);
	return out;
}

const limitErrorCodes = new Set([
	"EMAXNESTINGDEPTH",
	"EMAXHEADERSIZE",
	"EMAXPARTCOUNT",
	"EMAXFORWARDEDADDRESSES",
]);

function sha256(bytes: Uint8Array): string {
	return createHash("sha256").update(bytes).digest("hex");
}

// The timeout bounds waiting, but cannot preempt synchronous parser work; the
// size/part/depth limits are the primary protection and the worker must also
// run parsing inside its own bounded process budget.
export async function parseMimeMessage(
	raw: Uint8Array,
	overrides: Partial<MimeLimits> = {},
): Promise<MimeResult> {
	const limits = { ...defaultMimeLimits, ...overrides };
	for (const name of Object.keys(defaultMimeLimits) as (keyof MimeLimits)[]) {
		const value = limits[name];
		const minimum =
			name === "maxAttachments" ||
			name === "maxBodyChars" ||
			name === "maxReferences" ||
			name === "maxNestingDepth" ||
			name === "maxRfc822Depth" ||
			name === "maxHeaderBytes"
				? 0
				: 1;
		const maximum = defaultMimeLimits[name];
		if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
			throw new RangeError(
				`${name} must be an integer from ${minimum} through ${maximum}`,
			);
		}
	}
	if (raw.byteLength > limits.maxRawBytes) {
		return { ok: false, reason: "too_large", size: raw.byteLength };
	}
	let timer: NodeJS.Timeout | undefined;
	try {
		const parsed = await Promise.race([
			PostalMime.parse(raw, {
				attachmentEncoding: "arraybuffer",
				maxNestingDepth: limits.maxNestingDepth,
				maxHeadersSize: limits.maxHeaderBytes,
				maxPartCount: limits.maxParts,
				maxRfc822NestingDepth: limits.maxRfc822Depth,
				maxForwardedAddresses: 1000,
			}),
			new Promise<never>((_, reject) => {
				timer = setTimeout(
					() =>
						reject(Object.assign(new Error("timeout"), { code: "TIMEOUT" })),
					limits.parseTimeoutMs,
				);
			}),
		]);

		let skippedParts = 0;
		const attachments: ParsedAttachment[] = [];
		for (const part of parsed.attachments) {
			if (attachments.length >= limits.maxAttachments) {
				skippedParts += 1;
				continue;
			}
			if (part.rfc822DepthExceeded) {
				skippedParts += 1;
			}
			if (typeof part.content === "string") {
				throw new TypeError(
					"Parser returned string content despite arraybuffer mode",
				);
			}
			const content =
				part.content instanceof Uint8Array
					? part.content
					: new Uint8Array(part.content);
			attachments.push({
				safeFilename: sanitizeAttachmentFilename(part.filename),
				mimeType: normalizeMimeType(part.mimeType),
				disposition:
					part.disposition === "inline" || part.related
						? "inline"
						: "attachment",
				contentId: normalizeMessageId(part.contentId),
				size: content.byteLength,
				sha256: sha256(content),
				content,
			});
		}

		const text = parsed.text ?? "";
		const html = parsed.html ?? null;
		const bodyTruncated =
			text.length > limits.maxBodyChars ||
			(html?.length ?? 0) > limits.maxBodyChars;
		const sentAt = parsed.date ? new Date(parsed.date) : null;
		return {
			ok: true,
			message: {
				messageId: normalizeMessageId(parsed.messageId),
				inReplyTo: parseMessageIdList(parsed.inReplyTo, 1)[0] ?? null,
				references: parseMessageIdList(parsed.references, limits.maxReferences),
				subject: (parsed.subject ?? "").slice(0, 998),
				sentAt: sentAt && !Number.isNaN(sentAt.getTime()) ? sentAt : null,
				from:
					flattenAddresses(parsed.from ? [parsed.from] : undefined)[0] ?? null,
				to: flattenAddresses(parsed.to),
				cc: flattenAddresses(parsed.cc),
				text: text.slice(0, limits.maxBodyChars),
				html: html === null ? null : html.slice(0, limits.maxBodyChars),
				bodyTruncated,
				attachments,
				skippedParts,
				size: raw.byteLength,
				contentHash: sha256(raw),
			},
		};
	} catch (error) {
		const code = (error as { code?: string }).code ?? "";
		if (code === "TIMEOUT") {
			return { ok: false, reason: "timeout", size: raw.byteLength };
		}
		return {
			ok: false,
			reason: limitErrorCodes.has(code) ? "limit_exceeded" : "malformed",
			size: raw.byteLength,
		};
	} finally {
		clearTimeout(timer);
	}
}
