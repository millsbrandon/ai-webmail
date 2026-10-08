import {
	Archive,
	BookOpen,
	Check,
	ChevronLeft,
	CircleAlert,
	Clock3,
	Ellipsis,
	Eye,
	EyeOff,
	FilePenLine,
	Forward,
	Inbox,
	KeyRound,
	LockKeyhole,
	type LucideIcon,
	Menu,
	Paperclip,
	Plus,
	RefreshCw,
	Reply,
	ReplyAll,
	Search,
	Send,
	Settings2,
	ShieldAlert,
	Sparkles,
	Tag,
	Trash2,
	UserRoundCheck,
	Users,
	WifiOff,
} from "lucide-react";

export const appIconRegistry = {
	Inbox,
	Send,
	FilePenLine,
	Archive,
	Trash2,
	ShieldAlert,
	Forward,
	Search,
	Plus,
	Reply,
	ReplyAll,
	Paperclip,
	Clock3,
	UserRoundCheck,
	Users,
	Tag,
	Sparkles,
	BookOpen,
	Settings2,
	KeyRound,
	LockKeyhole,
	Eye,
	EyeOff,
	Ellipsis,
	ChevronLeft,
	Menu,
	Check,
	CircleAlert,
	WifiOff,
	RefreshCw,
} satisfies Record<string, LucideIcon>;

export type AppIconName = keyof typeof appIconRegistry;

export function AppIcon({
	name,
	size = 20,
	strokeWidth = 1.75,
}: {
	name: AppIconName;
	size?: number;
	strokeWidth?: number;
}) {
	const Icon = appIconRegistry[name];

	return (
		<Icon
			aria-hidden="true"
			focusable="false"
			size={size}
			strokeWidth={strokeWidth}
		/>
	);
}
