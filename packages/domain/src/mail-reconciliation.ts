export type MailboxScope = {
	organizationId: string;
	mailboxId: string;
};

export type MessageMetadata = {
	uid: number;
	messageId: string | null;
	contentHash: string | null;
	size: number;
	flags: readonly string[];
};

export const importReasons = [
	"initial_history",
	"uid_reset",
	"late_uid",
	"known_content",
	"ambiguous_content",
	"unverified_content",
	"new_candidate",
] as const;
export type ImportReason = (typeof importReasons)[number];
export type ImportedMessage = MessageMetadata & { importReason: ImportReason };
export type FolderInventory = {
	path: string;
	uidValidity: number;
	uidNext: number;
	complete: boolean;
	messages: readonly MessageMetadata[];
};
export type StoredFolder = Omit<FolderInventory, "complete" | "messages"> & {
	messages: readonly ImportedMessage[];
};
export type MailboxSnapshot = MailboxScope & {
	folders: readonly StoredFolder[];
};
export type MessageReference = {
	folderPath: string;
	uidValidity: number;
	uid: number;
};
export type ReconciliationPlan = {
	snapshot: MailboxSnapshot;
	inserted: (MessageReference & { importReason: ImportReason })[];
	updated: MessageReference[];
	removed: MessageReference[];
	resetFolders: string[];
	moveHints: { from: MessageReference; to: MessageReference }[];
};

export class ReconciliationError extends Error {
	constructor(
		readonly code:
			| "invalid_inventory"
			| "scope_mismatch"
			| "incomplete_inventory"
			| "immutable_uid_changed",
	) {
		super(`Mail reconciliation rejected: ${code}.`);
		this.name = "ReconciliationError";
	}
}

const maxUid = 4_294_967_295;
const maxFolders = 100;
const maxMessages = 20_000;

function requireValid(condition: boolean) {
	if (!condition) throw new ReconciliationError("invalid_inventory");
}

function boundedText(value: string, limit: number) {
	return (
		typeof value === "string" &&
		value.length > 0 &&
		value.length <= limit &&
		!Array.from(value).some(
			(character) =>
				character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
		)
	);
}

function validUid(value: number) {
	return Number.isInteger(value) && value > 0 && value <= maxUid;
}

function validateFolders(folders: readonly (FolderInventory | StoredFolder)[]) {
	requireValid(Array.isArray(folders) && folders.length <= maxFolders);
	const paths = new Set<string>();
	let total = 0;
	for (const folder of folders) {
		requireValid(
			boundedText(folder.path, 1024) &&
				!paths.has(folder.path) &&
				validUid(folder.uidValidity) &&
				validUid(folder.uidNext) &&
				Array.isArray(folder.messages),
		);
		paths.add(folder.path);
		total += folder.messages.length;
		requireValid(total <= maxMessages);
		const uids = new Set<number>();
		for (const message of folder.messages) {
			requireValid(
				validUid(message.uid) &&
					message.uid < folder.uidNext &&
					!uids.has(message.uid) &&
					Number.isSafeInteger(message.size) &&
					message.size >= 0 &&
					(message.messageId === null || boundedText(message.messageId, 998)) &&
					(message.contentHash === null ||
						(typeof message.contentHash === "string" &&
							/^[a-f0-9]{64}$/.test(message.contentHash))) &&
					Array.isArray(message.flags) &&
					message.flags.length <= 100 &&
					message.flags.every((flag) => boundedText(flag, 128)),
			);
			uids.add(message.uid);
		}
	}
}

function reference(folder: StoredFolder, message: MessageMetadata) {
	return {
		folderPath: folder.path,
		uidValidity: folder.uidValidity,
		uid: message.uid,
	};
}

function identity(value: MessageReference) {
	return JSON.stringify([value.folderPath, value.uidValidity, value.uid]);
}

function fingerprint(message: MessageMetadata) {
	return message.contentHash === null
		? null
		: `${message.contentHash}:${message.size}`;
}

function contentIndex(folders: readonly StoredFolder[]) {
	const index = new Map<string, MessageReference[]>();
	for (const folder of folders) {
		for (const message of folder.messages) {
			const key = fingerprint(message);
			if (key === null) continue;
			const matches = index.get(key) ?? [];
			matches.push(reference(folder, message));
			index.set(key, matches);
		}
	}
	return index;
}

function normalize(message: MessageMetadata): MessageMetadata {
	return {
		uid: message.uid,
		messageId: message.messageId,
		contentHash: message.contentHash,
		size: message.size,
		flags: [...new Set(message.flags.map((flag) => flag.toLowerCase()))].sort(),
	};
}

export function planMailboxReconciliation(
	scope: MailboxScope,
	previous: MailboxSnapshot | null,
	inventories: readonly FolderInventory[],
): ReconciliationPlan {
	requireValid(
		boundedText(scope.organizationId, 128) && boundedText(scope.mailboxId, 128),
	);
	if (
		previous &&
		(previous.organizationId !== scope.organizationId ||
			previous.mailboxId !== scope.mailboxId)
	) {
		throw new ReconciliationError("scope_mismatch");
	}
	validateFolders(previous?.folders ?? []);
	validateFolders(inventories);
	for (const folder of previous?.folders ?? []) {
		for (const message of folder.messages) {
			requireValid(importReasons.includes(message.importReason));
		}
	}
	if (inventories.some((folder) => folder.complete !== true)) {
		throw new ReconciliationError("incomplete_inventory");
	}
	const oldFolders = new Map(
		(previous?.folders ?? []).map((folder) => [folder.path, folder]),
	);
	const nextFolders = new Map<string, StoredFolder>(
		(previous?.folders ?? []).map((folder) => [
			folder.path,
			{
				path: folder.path,
				uidValidity: folder.uidValidity,
				uidNext: folder.uidNext,
				messages: folder.messages.map((message) => ({
					...normalize(message),
					importReason: message.importReason,
				})),
			},
		]),
	);
	const plan: ReconciliationPlan = {
		snapshot: {
			organizationId: scope.organizationId,
			mailboxId: scope.mailboxId,
			folders: [],
		},
		inserted: [],
		updated: [],
		removed: [],
		resetFolders: [],
		moveHints: [],
	};
	for (const inventory of inventories) {
		const old = oldFolders.get(inventory.path);
		const reset =
			old !== undefined && old.uidValidity !== inventory.uidValidity;
		if (old && !reset) requireValid(inventory.uidNext >= old.uidNext);
		if (reset) plan.resetFolders.push(inventory.path);
		const oldMessages = new Map(
			(old?.messages ?? []).map((message) => [message.uid, message]),
		);
		const next: StoredFolder = {
			path: inventory.path,
			uidValidity: inventory.uidValidity,
			uidNext: inventory.uidNext,
			messages: [],
		};
		const messages: ImportedMessage[] = [];
		for (const incoming of [...inventory.messages].sort(
			(a, b) => a.uid - b.uid,
		)) {
			const metadata = normalize(incoming);
			const stored = !reset ? oldMessages.get(incoming.uid) : undefined;
			if (stored) {
				if (
					stored.size !== incoming.size ||
					stored.messageId !== incoming.messageId ||
					(stored.contentHash !== null &&
						incoming.contentHash !== null &&
						stored.contentHash !== incoming.contentHash)
				) {
					throw new ReconciliationError("immutable_uid_changed");
				}
				metadata.contentHash = stored.contentHash ?? incoming.contentHash;
				messages.push({ ...metadata, importReason: stored.importReason });
				if (
					stored.contentHash !== metadata.contentHash ||
					JSON.stringify(normalize(stored).flags) !==
						JSON.stringify(metadata.flags)
				) {
					plan.updated.push(reference(next, incoming));
				}
			} else {
				const importReason: ImportReason = !old
					? "initial_history"
					: reset
						? "uid_reset"
						: incoming.uid < old.uidNext
							? "late_uid"
							: "new_candidate";
				messages.push({ ...metadata, importReason });
				plan.inserted.push({ ...reference(next, incoming), importReason });
			}
		}
		next.messages = messages;
		const presentUids = new Set(messages.map((message) => message.uid));
		if (old) {
			for (const stored of old.messages) {
				if (reset || !presentUids.has(stored.uid)) {
					plan.removed.push(reference(old, stored));
				}
			}
		}
		nextFolders.set(next.path, next);
	}
	plan.snapshot.folders = [...nextFolders.values()].sort((a, b) =>
		a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
	);
	validateFolders(plan.snapshot.folders);
	const priorContent = contentIndex(previous?.folders ?? []);
	const nextContent = contentIndex(plan.snapshot.folders);
	const removed = new Set(plan.removed.map(identity));
	const insertions = new Map(
		plan.inserted.map((insertion) => [identity(insertion), insertion]),
	);
	for (const folder of plan.snapshot.folders) {
		for (const message of folder.messages) {
			const ref = reference(folder, message);
			const insertion = insertions.get(identity(ref));
			if (!insertion) continue;
			const key = fingerprint(message);
			const priorMatches = key === null ? [] : (priorContent.get(key) ?? []);
			const nextMatches = key === null ? [] : (nextContent.get(key) ?? []);
			if (message.importReason === "new_candidate") {
				message.importReason =
					key === null
						? "unverified_content"
						: priorMatches.length > 0
							? "known_content"
							: nextMatches.length > 1
								? "ambiguous_content"
								: "new_candidate";
				insertion.importReason = message.importReason;
			}
			if (
				priorMatches.length === 1 &&
				nextMatches.length === 1 &&
				priorMatches[0].folderPath !== ref.folderPath &&
				removed.has(identity(priorMatches[0]))
			) {
				plan.moveHints.push({ from: priorMatches[0], to: ref });
			}
		}
	}
	return plan;
}
