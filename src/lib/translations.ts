import { EXTENDED_LOCALES, type ExtendedKey } from "./translations-extended";

export type LangCode = "en" | "es" | "fr" | "de" | "ar" | "zh" | "ja" | "pt" | "hi" | "ur";


export const LANGUAGES: { code: LangCode; label: string; nativeName: string; rtl?: boolean }[] = [
  { code: "en", label: "English",    nativeName: "English" },
  { code: "es", label: "Spanish",    nativeName: "Español" },
  { code: "fr", label: "French",     nativeName: "Français" },
  { code: "de", label: "German",     nativeName: "Deutsch" },
  { code: "ar", label: "Arabic",     nativeName: "العربية", rtl: true },
  { code: "zh", label: "Chinese",    nativeName: "中文" },
  { code: "ja", label: "Japanese",   nativeName: "日本語" },
  { code: "pt", label: "Portuguese", nativeName: "Português" },
  { code: "hi", label: "Hindi",      nativeName: "हिन्दी" },
  { code: "ur", label: "Urdu",       nativeName: "اردو", rtl: true },
];

export type TranslationKey =
  // Nav
  | "nav.dashboard" | "nav.discussion" | "nav.whiteboard" | "nav.ai_chat"
  | "nav.meeting_notes" | "nav.history" | "nav.project_board" | "nav.personal_notes"
  | "nav.team" | "nav.settings" | "nav.calendar" | "nav.concerns" | "nav.security"
  // Discussion
  | "discussion.title" | "discussion.desc" | "discussion.new_meeting" | "discussion.encrypted"
  | "discussion.search" | "discussion.chats" | "discussion.channels" | "discussion.dm"
  | "discussion.new_community" | "discussion.direct_chat" | "discussion.channel"
  | "discussion.meet" | "discussion.call" | "discussion.add_member" | "discussion.send_invite"
  | "discussion.announcements_only" | "discussion.announcements_hint"
  | "discussion.type_message" | "discussion.guest_read_only"
  | "discussion.network" | "discussion.network_hint"
  // Meetings
  | "meeting.start" | "meeting.start_now" | "meeting.cancel" | "meeting.title"
  | "meeting.invite_sent" | "meeting.copy_link" | "meeting.join" | "meeting.calling"
  | "meeting.incoming" | "meeting.accept" | "meeting.decline" | "meeting.ended"
  | "meeting.audio_call" | "meeting.video_call" | "meeting.all_invited"
  // Project Board
  | "board.title" | "board.new_task" | "board.edit_task" | "board.delete_task"
  | "board.todo" | "board.in_progress" | "board.review" | "board.done"
  | "board.assignee" | "board.due_date" | "board.description" | "board.status"
  | "board.save" | "board.cancel" | "board.confirm_delete"
  // General
  | "general.save" | "general.cancel" | "general.delete" | "general.edit"
  | "general.close" | "general.search" | "general.loading" | "general.send"
  | "general.download" | "general.copy" | "general.copied" | "general.create"
  | "general.sign_out" | "general.add_account" | "general.switch_account"
  // AI
  | "ai.title" | "ai.placeholder" | "ai.thinking"
  // Settings
  | "settings.title" | "settings.language" | "settings.language_desc"
  // Calendar
  | "calendar.title" | "calendar.new_event" | "calendar.today"
  // Notes
  | "notes.title" | "notes.new_note" | "notes.save"
  // Team
  | "team.title" | "team.members" | "team.invite"
  | "team.group_meeting" | "team.meeting_title_placeholder"
  | "team.select_participants" | "team.selected" | "team.select_all"
  | "team.no_other_members" | "team.invite_hint" | "team.meeting_created"
  | "team.invites_sent" | "team.participants" | "team.you" | "team.no_members"
  | "team.message" | "team.member_col" | "team.email_col" | "team.role_col" | "team.actions_col"
  // Account
  | "account.accounts_orgs" | "account.add_account" | "account.sign_out"
  | ExtendedKey;

type CoreTranslationKey = Exclude<TranslationKey, ExtendedKey>;
type CoreTranslations = Record<CoreTranslationKey, string>;
type Translations = Record<TranslationKey, string>;
type AllTranslations = Record<LangCode, Translations>;

const en: CoreTranslations = {
  "nav.dashboard": "Dashboard",
  "nav.discussion": "Discussion",
  "nav.whiteboard": "Whiteboard",
  "nav.ai_chat": "AI Assistant",
  "nav.meeting_notes": "Meetings",
  "nav.history": "History",
  "nav.project_board": "Project Board",
  "nav.personal_notes": "Personal Notes",
  "nav.team": "Team",
  "nav.settings": "Settings",
  "nav.calendar": "Calendar",
  "nav.concerns": "Concerns",
  "nav.security": "Security",
  "discussion.title": "Discussion",
  "discussion.desc": "Connect with your organization: communities, channels, and direct messages",
  "discussion.new_meeting": "New meeting",
  "discussion.encrypted": "Encrypted",
  "discussion.search": "Search by name, email, or chat…",
  "discussion.chats": "Chats",
  "discussion.channels": "Channels",
  "discussion.dm": "Direct messages",
  "discussion.new_community": "New community",
  "discussion.direct_chat": "Direct chat",
  "discussion.channel": "Channel",
  "discussion.meet": "Meet",
  "discussion.add_member": "Add member",
  "discussion.send_invite": "Send Invite",
  "discussion.announcements_only": "Announcements: react only",
  "discussion.type_message": "Type a message…",
  "discussion.guest_read_only": "Guests can read but not send messages.",
  "discussion.call": "Call",
  "discussion.announcements_hint": "Only the channel owner or admins can post here.",
  "discussion.network": "Your network",
  "discussion.network_hint": "Search for colleagues, open a channel, or start a direct chat.",
  "meeting.start": "Start Meeting",
  "meeting.start_now": "Start now",
  "meeting.cancel": "Cancel",
  "meeting.title": "Meeting",
  "meeting.invite_sent": "Invite sent via DM",
  "meeting.copy_link": "Copy Link",
  "meeting.join": "Join Meeting",
  "meeting.calling": "Calling…",
  "meeting.incoming": "Incoming call",
  "meeting.accept": "Accept",
  "meeting.decline": "Decline",
  "meeting.ended": "Call ended",
  "meeting.audio_call": "Audio call",
  "meeting.video_call": "Video call",
  "meeting.all_invited": "All org members will receive a meeting invite",
  "board.title": "Project Board",
  "board.new_task": "New Task",
  "board.edit_task": "Edit Task",
  "board.delete_task": "Delete Task",
  "board.todo": "To Do",
  "board.in_progress": "In Progress",
  "board.review": "Review",
  "board.done": "Done",
  "board.assignee": "Assignee",
  "board.due_date": "Due Date",
  "board.description": "Description",
  "board.status": "Status",
  "board.save": "Save Task",
  "board.cancel": "Cancel",
  "board.confirm_delete": "Are you sure you want to delete this task?",
  "general.save": "Save",
  "general.cancel": "Cancel",
  "general.delete": "Delete",
  "general.edit": "Edit",
  "general.close": "Close",
  "general.search": "Search",
  "general.loading": "Loading…",
  "general.send": "Send",
  "general.download": "Download",
  "general.copy": "Copy",
  "general.copied": "Copied!",
  "general.create": "Create",
  "general.sign_out": "Sign out",
  "general.add_account": "Add account",
  "general.switch_account": "Switch account",
  "ai.title": "AI Assistant",
  "ai.placeholder": "Ask anything…",
  "ai.thinking": "Thinking…",
  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.language_desc": "Choose your display language",
  "calendar.title": "Calendar",
  "calendar.new_event": "New Event",
  "calendar.today": "Today",
  "notes.title": "Personal Notes",
  "notes.new_note": "New Note",
  "notes.save": "Save",
  "team.title": "Team",
  "team.members": "Members",
  "team.invite": "Invite",
  "team.group_meeting": "Group Meeting",
  "team.meeting_title_placeholder": "Meeting title (optional)",
  "team.select_participants": "Select participants",
  "team.selected": "selected",
  "team.select_all": "Select all",
  "team.no_other_members": "No other members in your organisation yet.",
  "team.invite_hint": "Each selected participant will receive a DM invite.",
  "team.meeting_created": "Meeting created!",
  "team.invites_sent": "Invite links sent to",
  "team.participants": "participants via DM.",
  "team.you": "You",
  "team.no_members": "No team members yet.",
  "team.message": "Message",
  "team.member_col": "Member",
  "team.email_col": "Email",
  "team.role_col": "Role",
  "team.actions_col": "Actions",
  "account.accounts_orgs": "Accounts & Orgs",
  "account.add_account": "Add account",
  "account.sign_out": "Sign out",
};

// Non-English locale objects removed — handled by the global DB + AI pipeline.

// Only `en` is active; all other languages are handled by the AI translation pipeline.
const CORE: Record<LangCode, CoreTranslations> = {
  en,
  es: en, fr: en, de: en, ar: en, zh: en,
  ja: en, pt: en, hi: en, ur: en,
};

export const TRANSLATIONS: AllTranslations = Object.fromEntries(
  (Object.keys(CORE) as LangCode[]).map((code) => [
    code,
    { ...CORE[code], ...EXTENDED_LOCALES[code] } satisfies Translations,
  ])
) as AllTranslations;

export function t(lang: LangCode, key: TranslationKey): string {
  return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}

export function tFeature(lang: LangCode, feature: string): string {
  const key = `feature.${feature}` as TranslationKey;
  return t(lang, key);
}

export function tRole(lang: LangCode, role: string): string {
  const key = `role.${role.toLowerCase()}` as TranslationKey;
  return t(lang, key);
}
