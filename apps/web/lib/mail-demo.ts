export type DemoMessage = {
	id: string;
	kind: "email" | "internal-note";
	sender: string;
	senderAddress: string;
	recipient: string;
	time: string;
	body: string;
};

export type DemoThread = {
	id: string;
	sender: string;
	senderAddress: string;
	subject: string;
	preview: string;
	time: string;
	unread: boolean;
	assignee: string;
	messages: DemoMessage[];
};

type DemoThreadSummary = Omit<DemoThread, "messages">;

const threadSummaries: DemoThreadSummary[] = [
	{
		id: "delivery-update",
		sender: "Riley Park",
		senderAddress: "riley@example.invalid",
		subject: "A quick update on the delivery",
		preview: "The replacement arrived this morning. Thank you for the help.",
		time: "10:42 AM",
		unread: true,
		assignee: "Alex Example",
	},
	{
		id: "account-question",
		sender: "Morgan Lee",
		senderAddress: "morgan@example.invalid",
		subject: "Question about my account settings",
		preview:
			"Could you point me to the page where I can change my contact details?",
		time: "9:18 AM",
		unread: true,
		assignee: "Casey Example",
	},
	{
		id: "receipt-copy",
		sender: "Jamie Rivera",
		senderAddress: "jamie@example.invalid",
		subject: "Could I get another copy of the receipt?",
		preview: "I am organizing my records and would appreciate a copy.",
		time: "Yesterday",
		unread: false,
		assignee: "Alex Example",
	},
	{
		id: "opening-hours",
		sender: "Taylor Quinn",
		senderAddress: "taylor@example.invalid",
		subject: "Are you open this weekend?",
		preview: "I could not find the weekend hours on the information page.",
		time: "Yesterday",
		unread: false,
		assignee: "Unassigned",
	},
	{
		id: "product-guide",
		sender: "Avery Jordan",
		senderAddress: "avery@example.invalid",
		subject: "Where can I find the setup guide?",
		preview: "The quick-start card was missing from my package.",
		time: "Tue",
		unread: false,
		assignee: "Casey Example",
	},
	{
		id: "address-change",
		sender: "Robin Ellis",
		senderAddress: "robin@example.invalid",
		subject: "Please confirm an address change",
		preview:
			"I updated my details in the portal and want to make sure it saved.",
		time: "Tue",
		unread: false,
		assignee: "Alex Example",
	},
	{
		id: "subscription-pause",
		sender: "Sam Patel",
		senderAddress: "sam@example.invalid",
		subject: "Pausing my monthly plan",
		preview: "I will be away for a few weeks. What are the available options?",
		time: "Mon",
		unread: false,
		assignee: "Unassigned",
	},
	{
		id: "size-exchange",
		sender: "Drew Kim",
		senderAddress: "drew@example.invalid",
		subject: "Exchange for a different size",
		preview: "The item is unused. Please let me know what to do next.",
		time: "Mon",
		unread: false,
		assignee: "Casey Example",
	},
	{
		id: "order-status",
		sender: "Kai Bennett",
		senderAddress: "kai@example.invalid",
		subject: "Checking on a recent order",
		preview: "I am checking whether the order is still on track.",
		time: "Fri",
		unread: false,
		assignee: "Alex Example",
	},
	{
		id: "thank-you",
		sender: "Emery Blake",
		senderAddress: "emery@example.invalid",
		subject: "Thanks for sorting this out",
		preview: "Everything is working now. I appreciate the clear instructions.",
		time: "Fri",
		unread: false,
		assignee: "Casey Example",
	},
	{
		id: "warranty-details",
		sender: "Finley Gray",
		senderAddress: "finley@example.invalid",
		subject: "Where do I find warranty details?",
		preview: "I would like to read the terms before registering the product.",
		time: "Thu",
		unread: false,
		assignee: "Unassigned",
	},
	{
		id: "feature-feedback",
		sender: "Sage Murphy",
		senderAddress: "sage@example.invalid",
		subject: "A suggestion for the help center",
		preview:
			"A short troubleshooting checklist would have helped me get started.",
		time: "Thu",
		unread: false,
		assignee: "Alex Example",
	},
] as const;

export const demoOrganization = {
	name: "Example Studio",
	members: [
		{ name: "Alex Example", email: "alex@example.invalid", role: "Responder" },
		{ name: "Casey Example", email: "casey@example.invalid", role: "Manager" },
	],
	mailbox: {
		id: "demo",
		name: "Support",
		address: "support@example.invalid",
	},
};

export const demoThreads: DemoThread[] = threadSummaries.map(
	(summary, index) => ({
		...summary,
		messages: [
			{
				id: `${summary.id}-message`,
				kind: "email" as const,
				sender: summary.sender,
				senderAddress: summary.senderAddress,
				recipient: `Support team <${demoOrganization.mailbox.address}>`,
				time: summary.time,
				body: `Hello Support,\n\n${summary.preview}\n\nThis is fictional content for the local webmail layout preview. Please ignore it as an actual request.\n\nThank you,\n${summary.sender}`,
			},
			...(index === 0
				? [
						{
							id: `${summary.id}-note`,
							kind: "internal-note" as const,
							sender: "Casey Example",
							senderAddress: "casey@example.invalid",
							recipient: "Example Studio team",
							time: "10:51 AM",
							body: "Synthetic internal note: the layout preview does not contact a customer or change mailbox data.",
						},
					]
				: []),
		],
	}),
);

export function isSyntheticInboxPreviewEnabled(
	environment = process.env.NODE_ENV,
) {
	return environment !== "production";
}

export function getDemoThread(threadId: string) {
	return demoThreads.find((thread) => thread.id === threadId);
}

export function getDemoThreadSummaries() {
	return threadSummaries.map((summary) => ({ ...summary }));
}
