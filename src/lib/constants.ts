export const BRAND = {
  purple: "#5D3A8C",
  purpleLight: "#7B5AA8",
  purpleDark: "#4A2E70",
  purpleMuted: "#F3EEF8",
  white: "#FFFFFF",
  gray50: "#F8F9FA",
  gray100: "#F1F3F5",
  gray200: "#E9ECEF",
  gray500: "#868E96",
  gray700: "#495057",
  gray900: "#212529",
} as const;

export type Feature =
  | "dashboard"
  | "discussion"
  | "whiteboard"
  | "ai_chat"
  | "meeting_notes"
  | "history"
  | "project_board"
  | "personal_notes"
  | "team"
  | "settings"
  | "encryption"
  | "calendar"
  | "concerns";

export const FEATURE_LABELS: Record<Feature, string> = {
  dashboard: "Home",
  discussion: "Discussion",
  whiteboard: "Whiteboard",
  ai_chat: "AI Assistant",
  meeting_notes: "Meetings",
  history: "Activity History",
  project_board: "Project Board",
  personal_notes: "My Notes",
  team: "Team",
  settings: "Settings",
  encryption: "Security",
  calendar: "Calendar",
  concerns: "Report a Concern",
};

export const ROLE_LABELS = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  GUEST: "Guest",
} as const;
