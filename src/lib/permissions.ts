import type { Feature } from "./constants";

export type UserRole = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";

/** Which features each role can access */
export const ROLE_PERMISSIONS: Record<UserRole, Feature[]> = {
  OWNER: [
    "dashboard",
    "discussion",
    "whiteboard",
    "ai_chat",
    "meeting_notes",
    "history",
    "project_board",
    "personal_notes",
    "team",
    "settings",
    "encryption",
    "calendar",
    "concerns",
  ],
  ADMIN: [
    "dashboard",
    "discussion",
    "whiteboard",
    "ai_chat",
    "meeting_notes",
    "history",
    "project_board",
    "personal_notes",
    "team",
    "settings",
    "encryption",
    "calendar",
    "concerns",
  ],
  MEMBER: [
    "dashboard",
    "discussion",
    "whiteboard",
    "ai_chat",
    "meeting_notes",
    "history",
    "project_board",
    "personal_notes",
    "team",
    "encryption",
    "calendar",
    "concerns",
  ],
  GUEST: ["dashboard", "discussion", "history", "personal_notes", "calendar", "concerns"],
};

export function canAccess(role: UserRole, feature: Feature): boolean {
  return ROLE_PERMISSIONS[role]?.includes(feature) ?? false;
}

export function getAccessibleFeatures(role: UserRole): Feature[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/** Fine-grained actions within features */
export const ACTION_PERMISSIONS = {
  createTask: ["OWNER", "ADMIN", "MEMBER"] as UserRole[],
  editAnyTask: ["OWNER", "ADMIN"] as UserRole[],
  deleteTask: ["OWNER", "ADMIN"] as UserRole[],
  manageTeam: ["OWNER", "ADMIN"] as UserRole[],
  changeRoles: ["OWNER"] as UserRole[],
  viewEncryptionSettings: ["OWNER", "ADMIN", "MEMBER"] as UserRole[],
  exportHistory: ["OWNER", "ADMIN"] as UserRole[],
  useWhiteboard: ["OWNER", "ADMIN", "MEMBER"] as UserRole[],
  useAiChat: ["OWNER", "ADMIN", "MEMBER"] as UserRole[],
  takeMeetingNotes: ["OWNER", "ADMIN", "MEMBER"] as UserRole[],
  postDiscussion: ["OWNER", "ADMIN", "MEMBER"] as UserRole[],
  readDiscussion: ["OWNER", "ADMIN", "MEMBER", "GUEST"] as UserRole[],
  manageCommunities: ["OWNER", "ADMIN"] as UserRole[],
  viewConcerns: ["OWNER", "ADMIN"] as UserRole[],
  viewMeetingReviews: ["OWNER", "ADMIN"] as UserRole[],
};

export function canPerform(
  role: UserRole,
  action: keyof typeof ACTION_PERMISSIONS
): boolean {
  return ACTION_PERMISSIONS[action].includes(role);
}
