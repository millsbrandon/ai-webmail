import assert from "node:assert/strict";
import { test } from "node:test";
import {
	type FolderInventory,
	type MailboxSnapshot,
	type MessageMetadata,
	planMailboxReconciliation,
	ReconciliationError,
} from "./mail-reconciliation";

const scope = {
	organizationId: "synthetic-org",
	mailboxId: "synthetic-mailbox",
};
const hash = (value: number) => value.toString(16).padStart(64, "0");
const message = (
	uid: number,
	overrides: Partial<MessageMetadata> = {},
): MessageMetadata => ({
	uid,
	size: 100,
	messageId: `<message-${uid}@example.test>`,
	contentHash: hash(uid),
	flags: [],
	...overrides,
});
const inventory = (
	messages: readonly MessageMetadata[],
	overrides: Partial<FolderInventory> = {},
): FolderInventory => ({
	path: "INBOX",
	uidValidity: 1,
	uidNext: Math.max(0, ...messages.map((item) => item.uid)) + 1,
	complete: true,
	messages,
	...overrides,
});
const initial = (folders: readonly FolderInventory[]) =>
	planMailboxReconciliation(scope, null, folders).snapshot;
const ref = (folderPath: string, uid: number, uidValidity = 1) => ({
	folderPath,
	uidValidity,
	uid,
});
function rejects(code: ReconciliationError["code"], run: () => unknown) {
	assert.throws(
		run,
		(error: unknown) =>
			error instanceof ReconciliationError &&
			error.code === code &&
			error.message === `Mail reconciliation rejected: ${code}.`,
	);
}

test("initial history and repeat inventories never create new-arrival candidates", () => {
	const folders = [inventory([message(1), message(5)])];
	const plan = planMailboxReconciliation(scope, null, folders);
	assert.deepEqual(
		plan.inserted.map((item) => item.importReason),
		["initial_history", "initial_history"],
	);
	const retry = planMailboxReconciliation(scope, plan.snapshot, folders);
	assert.deepEqual(
		[retry.inserted, retry.updated, retry.removed, retry.moveHints],
		[[], [], [], []],
	);
	assert.deepEqual(retry.snapshot, plan.snapshot);
});

test("UID identity ignores duplicate/missing Message-ID and flags are canonicalized", () => {
	const duplicateId = "<duplicate@example.test>";
	const before = initial([
		inventory([
			message(1, { messageId: duplicateId }),
			message(2, { messageId: duplicateId }),
			message(3, { messageId: null }),
		]),
	]);
	const plan = planMailboxReconciliation(scope, before, [
		inventory([
			message(1, { messageId: duplicateId, flags: ["\\Seen", "\\SEEN"] }),
			message(2, { messageId: duplicateId }),
			message(3, { messageId: null }),
			message(4, { messageId: duplicateId }),
			message(5, { messageId: null }),
		]),
	]);
	assert.deepEqual(plan.updated, [ref("INBOX", 1)]);
	assert.deepEqual(
		plan.inserted.map((item) => [item.uid, item.importReason]),
		[
			[4, "new_candidate"],
			[5, "new_candidate"],
		],
	);
	assert.equal(plan.snapshot.folders[0].messages.length, 5);
	assert.deepEqual(plan.snapshot.folders[0].messages[0].flags, ["\\seen"]);
	assert.equal(
		plan.snapshot.folders[0].messages[0].importReason,
		"initial_history",
	);
});

test("UIDVALIDITY resets replace old identity and suppress every reimport, including unseen content", () => {
	const before = initial([inventory([message(1), message(2)])]);
	const plan = planMailboxReconciliation(scope, before, [
		inventory([message(1), message(3)], { uidValidity: 7 }),
	]);
	assert.deepEqual(plan.resetFolders, ["INBOX"]);
	assert.deepEqual(plan.removed, [ref("INBOX", 1), ref("INBOX", 2)]);
	assert.deepEqual(plan.inserted, [
		{ ...ref("INBOX", 1, 7), importReason: "uid_reset" },
		{ ...ref("INBOX", 3, 7), importReason: "uid_reset" },
	]);
	const repeated = planMailboxReconciliation(scope, plan.snapshot, [
		inventory([message(1, { flags: ["\\Seen"] }), message(3)], {
			uidValidity: 7,
		}),
	]);
	assert.equal(repeated.inserted.length, 0);
	assert.equal(
		repeated.snapshot.folders[0].messages[0].importReason,
		"uid_reset",
	);
});

test("moves require a unique same-mailbox fingerprint, remove only local references, and remain suppressed", () => {
	const before = initial([
		inventory([message(1)]),
		inventory([], { path: "Archive" }),
	]);
	const plan = planMailboxReconciliation(scope, before, [
		inventory([], { uidNext: 2 }),
		inventory([message(10, { contentHash: hash(1) })], { path: "Archive" }),
	]);
	assert.deepEqual(plan.removed, [ref("INBOX", 1)]);
	assert.deepEqual(plan.moveHints, [
		{ from: ref("INBOX", 1), to: ref("Archive", 10) },
	]);
	assert.equal(plan.inserted[0].importReason, "known_content");
	assert.equal(
		plan.snapshot.folders[0].messages[0].messageId,
		"<message-10@example.test>",
	);
});

test("copies, ambiguous content and absent fingerprints never become new candidates", () => {
	const before = initial([
		inventory([message(1)]),
		inventory([], { path: "Archive" }),
	]);
	const plan = planMailboxReconciliation(scope, before, [
		inventory([
			message(1),
			message(2, { contentHash: hash(20) }),
			message(3, { contentHash: hash(20) }),
			message(4, { contentHash: null }),
		]),
		inventory([message(10, { contentHash: hash(1) })], { path: "Archive" }),
	]);
	assert.deepEqual(plan.moveHints, []);
	assert.deepEqual(
		plan.inserted.map((item) => item.importReason),
		[
			"ambiguous_content",
			"ambiguous_content",
			"unverified_content",
			"known_content",
		],
	);
	const replay = planMailboxReconciliation(scope, plan.snapshot, [
		inventory([
			message(1),
			message(2, { contentHash: hash(20) }),
			message(3, { contentHash: hash(20) }),
			message(4, { contentHash: hash(4) }),
		]),
	]);
	assert.equal(replay.inserted.length, 0);
	assert.equal(
		replay.snapshot.folders.find((folder) => folder.path === "INBOX")
			?.messages[3].importReason,
		"unverified_content",
	);
});

test("late UIDs remain historical; unobserved folders are not implicitly expunged", () => {
	const before = initial([
		inventory([message(1)], { uidNext: 10 }),
		inventory([message(7)], { path: "Archive" }),
	]);
	const plan = planMailboxReconciliation(scope, before, [
		inventory([message(2), message(10)]),
	]);
	assert.deepEqual(plan.removed, [ref("INBOX", 1)]);
	assert.deepEqual(plan.inserted, [
		{ ...ref("INBOX", 2), importReason: "late_uid" },
		{ ...ref("INBOX", 10), importReason: "new_candidate" },
	]);
	assert.equal(plan.snapshot.folders[0].path, "Archive");
	assert.equal(plan.snapshot.folders[0].messages[0].uid, 7);
});

test("cross-organization and cross-mailbox snapshots are rejected without echo", () => {
	const before = initial([inventory([message(1)])]);
	for (const otherScope of [
		{ ...scope, mailboxId: "other-mailbox" },
		{ ...scope, organizationId: "other-org" },
	]) {
		rejects("scope_mismatch", () =>
			planMailboxReconciliation(otherScope, before, []),
		);
	}
});

test("incomplete or regressed inventories cannot expunge data or advance cursors", () => {
	const before = initial([inventory([message(1)], { uidNext: 10 })]);
	const original = structuredClone(before);
	rejects("incomplete_inventory", () =>
		planMailboxReconciliation(scope, before, [
			inventory([], { complete: false }),
		]),
	);
	rejects("invalid_inventory", () =>
		planMailboxReconciliation(scope, before, [inventory([])]),
	);
	assert.deepEqual(before, original);
});

test("malformed, duplicate and oversized inventories are rejected atomically", () => {
	for (const folders of [
		[inventory([message(0)])],
		[inventory([message(1.5)])],
		[inventory([message(Number.NaN)])],
		[inventory([message(1)], { uidNext: 1 })],
		[inventory([], { uidValidity: 0 })],
		[inventory([], { uidNext: 4_294_967_296 })],
		[inventory([message(1, { size: -1 })])],
		[inventory([message(1, { flags: ["\n"] })])],
		[inventory([message(1, { messageId: "synthetic\ninjection" })])],
		[inventory([message(1, { contentHash: "not-a-hash" })])],
		[inventory([message(1), message(1)])],
		[inventory([]), inventory([])],
		Array.from({ length: 101 }, (_, index) =>
			inventory([], { path: `Synthetic-${index}` }),
		),
		[
			inventory(
				Array.from({ length: 20_001 }, (_, index) => message(index + 1)),
			),
		],
	]) {
		rejects("invalid_inventory", () =>
			planMailboxReconciliation(scope, null, folders),
		);
	}
});

test("stable UID content cannot change, inputs are immutable, and new metadata stays independent", () => {
	const before = initial([inventory([message(1)])]);
	const original = structuredClone(before);
	for (const metadata of [
		message(1, { contentHash: hash(2) }),
		message(1, { size: 101 }),
		message(1, { messageId: null }),
	]) {
		rejects("immutable_uid_changed", () =>
			planMailboxReconciliation(scope, before, [inventory([metadata])]),
		);
	}
	const plan = planMailboxReconciliation(scope, before, []);
	const unfetchedHash = planMailboxReconciliation(scope, before, [
		inventory([message(1, { contentHash: null })]),
	]);
	assert.deepEqual(unfetchedHash.updated, []);
	assert.equal(
		unfetchedHash.snapshot.folders[0].messages[0].contentHash,
		hash(1),
	);
	assert.deepEqual(before, original);
	assert.notEqual(plan.snapshot.folders[0], before.folders[0]);
	assert.notEqual(
		plan.snapshot.folders[0].messages[0],
		before.folders[0].messages[0],
	);
	const candidateSnapshot: MailboxSnapshot = {
		...before,
		folders: [
			{
				...before.folders[0],
				messages: [
					{ ...before.folders[0].messages[0], importReason: "new_candidate" },
				],
			},
		],
	};
	const candidate = planMailboxReconciliation(scope, candidateSnapshot, []);
	assert.deepEqual(candidate.inserted, []);
	assert.equal("jobs" in candidate, false);
});

test("ambiguous sources or different byte sizes never produce move hints", () => {
	const before = initial([
		inventory([message(1), message(2, { contentHash: hash(1) })]),
		inventory([], { path: "Archive" }),
	]);
	const ambiguous = planMailboxReconciliation(scope, before, [
		inventory([], { uidNext: 3 }),
		inventory([message(10, { contentHash: hash(1) })], { path: "Archive" }),
	]);
	assert.deepEqual(ambiguous.moveHints, []);
	assert.equal(ambiguous.inserted[0].importReason, "known_content");
	const differentSize = planMailboxReconciliation(scope, before, [
		inventory([], { uidNext: 3 }),
		inventory([message(10, { contentHash: hash(1), size: 101 })], {
			path: "Archive",
		}),
	]);
	assert.deepEqual(differentSize.moveHints, []);
	assert.equal(differentSize.inserted[0].importReason, "new_candidate");
});
