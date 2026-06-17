export type ChannelMeta = {
  mode?: string;
  ownerId?: string | null;
  adminIds?: string | null;
  slug?: string;
};

export function isAnnouncementsChannel(ch: ChannelMeta | null | undefined) {
  if (!ch) return false;
  return ch.mode === "announcements" || ch.slug === "announcements";
}

export function canPostInChannel(
  ch: ChannelMeta | null | undefined,
  userId: string,
  orgRole: string
): boolean {
  if (!ch || !isAnnouncementsChannel(ch)) return true;
  if (orgRole === "OWNER" || orgRole === "ADMIN") return true;
  if (ch.ownerId === userId) return true;
  const admins = (ch.adminIds || "").split(",").filter(Boolean);
  return admins.includes(userId);
}
