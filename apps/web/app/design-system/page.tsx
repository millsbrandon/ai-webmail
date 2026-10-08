import type { Metadata } from "next";
import Link from "next/link";
import {
	AppIcon,
	type AppIconName,
	appIconRegistry,
} from "../../components/icon";

export const metadata: Metadata = {
	title: "Design System | AI Webmail",
	description:
		"Semantic theme tokens, accessible states, and the icon registry.",
};

const themes = [
	{ name: "light", title: "Light theme" },
	{ name: "dark", title: "Dark theme" },
] as const;

const colorTokens = [
	["Canvas", "--canvas"],
	["Surface", "--surface"],
	["Muted surface", "--surface-muted"],
	["Text", "--text"],
	["Muted text", "--text-muted"],
	["Control border", "--border-control"],
	["Accent", "--accent"],
	["Selected", "--selected-bg"],
	["Success", "--success-bg"],
	["Warning", "--warning-bg"],
	["Danger", "--danger-bg"],
	["AI", "--ai-bg"],
] as const;

const iconNames = Object.keys(appIconRegistry) as AppIconName[];

function DataState({
	className = "",
	icon,
	title,
	children,
}: {
	className?: string;
	icon: AppIconName;
	title: string;
	children: string;
}) {
	return (
		<div className={`data-state ${className}`}>
			<span className="data-state-icon">
				<AppIcon name={icon} size={18} />
			</span>
			<div className="data-state-copy">
				<strong>{title}</strong>
				<p>{children}</p>
			</div>
		</div>
	);
}

function ThemeGallery({ name, title }: (typeof themes)[number]) {
	return (
		<section
			aria-labelledby={`${name}-theme-title`}
			className="theme-panel"
			data-theme={name}
		>
			<header className="theme-panel-header">
				<h2 id={`${name}-theme-title`}>{title}</h2>
			</header>
			<div className="theme-panel-content">
				<section
					aria-labelledby={`${name}-theme-title ${name}-buttons-title`}
					className="gallery-section"
				>
					<h3 id={`${name}-buttons-title`}>Buttons and focus</h3>
					<p className="gallery-help">
						Controls keep a 44px target and a visible keyboard focus ring.
					</p>
					<div className="button-examples">
						<div className="button-example">
							<span className="example-label">Default</span>
							<button className="button button-primary" type="button">
								<AppIcon name="Plus" size={18} />
								Primary action
							</button>
						</div>
						<div className="button-example">
							<span className="example-label">Hover</span>
							<button
								className="button button-primary is-hovered"
								type="button"
							>
								Hover state
							</button>
						</div>
						<div className="button-example">
							<span className="example-label">Keyboard focus</span>
							<button
								className="button button-secondary is-focus-demo"
								type="button"
							>
								Focus state
							</button>
						</div>
						<div className="button-example">
							<span className="example-label">Selected</span>
							<button
								aria-pressed="true"
								className="button button-selected"
								type="button"
							>
								<AppIcon name="Check" size={18} />
								Selected
							</button>
						</div>
						<div className="button-example">
							<span className="example-label">Disabled</span>
							<button className="button button-primary" disabled type="button">
								Unavailable
							</button>
						</div>
						<div className="button-example">
							<span className="example-label">Loading</span>
							<button
								aria-label="Loading, please wait"
								className="button button-primary"
								disabled
								type="button"
							>
								<AppIcon name="RefreshCw" size={18} />
								Loading…
							</button>
						</div>
						<div className="button-example">
							<span className="example-label">Destructive</span>
							<button className="button button-danger" type="button">
								<AppIcon name="Trash2" size={18} />
								Delete
							</button>
						</div>
						<div className="button-example">
							<span className="example-label">Icon-only</span>
							<button
								aria-label="Search (example)"
								className="button-icon"
								type="button"
							>
								<AppIcon name="Search" />
							</button>
						</div>
					</div>
				</section>

				<section
					aria-labelledby={`${name}-theme-title ${name}-fields-title`}
					className="gallery-section"
				>
					<h3 id={`${name}-fields-title`}>Fields</h3>
					<div className="field-examples">
						<div className="field-example">
							<label htmlFor={`${name}-search`}>Search</label>
							<input
								id={`${name}-search`}
								placeholder="Search messages"
								type="search"
							/>
							<p className="gallery-help">Default input state</p>
						</div>
						<div className="field-example">
							<label htmlFor={`${name}-error`}>Mailbox name</label>
							<input
								aria-describedby={`${name}-error-message`}
								aria-invalid="true"
								id={`${name}-error`}
								type="text"
								value=""
								readOnly
							/>
							<p className="field-error" id={`${name}-error-message`}>
								Enter a mailbox name.
							</p>
						</div>
						<div className="field-example">
							<label htmlFor={`${name}-disabled`}>Disabled field</label>
							<input
								disabled
								id={`${name}-disabled`}
								type="text"
								value="Unavailable"
								readOnly
							/>
							<p className="gallery-help">This setting is not available.</p>
						</div>
					</div>
				</section>

				<section
					aria-labelledby={`${name}-theme-title ${name}-data-title`}
					className="gallery-section"
				>
					<h3 id={`${name}-data-title`}>Content and connection states</h3>
					<div className="status-examples">
						<DataState
							icon="CircleAlert"
							title="Error"
							className="state-danger"
						>
							Unable to load messages. Try again.
						</DataState>
						<DataState icon="Inbox" title="Empty">
							No messages yet. New messages appear here after setup.
						</DataState>
						<DataState
							icon="WifiOff"
							title="Offline"
							className="state-warning state-offline"
						>
							Reconnect to resume syncing. Mailbox data is not cached offline.
						</DataState>
						<DataState
							className="state-permission"
							icon="LockKeyhole"
							title="Access revoked"
						>
							Mailbox access is no longer available. Contact the organization
							owner to review access.
						</DataState>
						<DataState
							className="state-stale"
							icon="RefreshCw"
							title="Stale data"
						>
							This view may be out of date. Refresh to check again.
						</DataState>
						<DataState
							className="state-success"
							icon="Check"
							title="Up to date"
						>
							Your changes have been saved.
						</DataState>
						<DataState
							className="state-ai"
							icon="Sparkles"
							title="AI suggestion"
						>
							Suggestions are optional and require human review.
						</DataState>
					</div>
				</section>

				<section
					aria-labelledby={`${name}-theme-title ${name}-tokens-title`}
					className="gallery-section"
				>
					<h3 id={`${name}-tokens-title`}>Color tokens</h3>
					<div className="swatch-grid">
						{colorTokens.map(([label, token]) => (
							<div className="swatch" key={token}>
								<span
									aria-hidden="true"
									className="swatch-chip"
									style={{ backgroundColor: `var(${token})` }}
								/>
								<span>{label}</span>
							</div>
						))}
					</div>
				</section>

				<section
					aria-labelledby={`${name}-theme-title ${name}-icons-title`}
					className="gallery-section"
				>
					<h3 id={`${name}-icons-title`}>Icon registry</h3>
					<p className="gallery-help">
						Named Lucide SVGs use currentColor and are decorative when paired
						with visible labels.
					</p>
					<div className="icon-grid">
						{iconNames.map((iconName) => (
							<div className="icon-sample" key={iconName}>
								<AppIcon name={iconName} size={18} />
								<span>{iconName}</span>
							</div>
						))}
					</div>
				</section>
			</div>
		</section>
	);
}

export default function DesignSystemPage() {
	return (
		<main className="design-system">
			<a className="skip-link" href="#gallery-content">
				Skip to component gallery
			</a>
			<header className="gallery-header">
				<div className="gallery-heading">
					<p className="eyebrow">Design system</p>
					<h1>Tokens and component gallery</h1>
					<p>
						A visual reference for shared interface styles, interaction states,
						and the named icon registry.
					</p>
				</div>
				<nav aria-label="Design system navigation">
					<Link className="button button-secondary" href="/">
						<AppIcon name="ChevronLeft" size={18} />
						Back to home
					</Link>
				</nav>
			</header>
			<div className="theme-grid" id="gallery-content">
				{themes.map((theme) => (
					<ThemeGallery key={theme.name} {...theme} />
				))}
			</div>
		</main>
	);
}
