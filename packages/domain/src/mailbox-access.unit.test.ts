import assert from "node:assert/strict";
import { test } from "node:test";
import {
	capabilitiesForMembership,
	type MailboxPolicy,
} from "./mailbox-access";

const policy: MailboxPolicy = {
	role: "viewer",
	approveAi: null,
	manageRules: null,
	export: false,
	delete: false,
};

test("viewer cannot gain writes through explicit capability flags", () => {
	assert.deepEqual(
		capabilitiesForMembership({
			...policy,
			approveAi: true,
			manageRules: true,
			export: true,
			delete: true,
		}),
		["read"],
	);
});

test("responders get manual collaboration but not privileged capabilities by default", () => {
	assert.deepEqual(
		capabilitiesForMembership({ ...policy, role: "responder" }),
		["read", "compose", "send", "notes", "labels", "assign", "request_ai"],
	);
	const granted = capabilitiesForMembership({
		...policy,
		role: "responder",
		approveAi: true,
		export: true,
		delete: true,
		manageRules: true,
	});
	for (const capability of [
		"approve_ai",
		"export",
		"delete",
		"manage_rules",
	] as const) {
		assert.ok(granted.includes(capability));
	}
	assert.ok(!granted.includes("manage_templates"));
});

test("manager defaults allow approval and rules but explicit denial takes precedence", () => {
	const defaults = capabilitiesForMembership({ ...policy, role: "manager" });
	assert.ok(defaults.includes("approve_ai"));
	assert.ok(defaults.includes("manage_rules"));
	assert.ok(defaults.includes("manage_templates"));
	assert.ok(!defaults.includes("export"));
	assert.ok(!defaults.includes("delete"));
	const restricted = capabilitiesForMembership({
		...policy,
		role: "manager",
		approveAi: false,
		manageRules: false,
	});
	assert.ok(!restricted.includes("approve_ai"));
	assert.ok(!restricted.includes("manage_rules"));
});
