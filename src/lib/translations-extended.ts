import { LOCALE_PACKS } from "./translations-locale-packs";

type LangCode = "en" | "es" | "fr" | "de" | "ar" | "zh" | "ja" | "pt" | "hi" | "ur";

/** Additional translation keys beyond the core set in translations.ts */
export type ExtendedKey =
  // Whiteboard
  | "whiteboard.select" | "whiteboard.pen" | "whiteboard.eraser" | "whiteboard.rect"
  | "whiteboard.circle" | "whiteboard.text_tool" | "whiteboard.share_to_meeting"
  | "whiteboard.clear" | "whiteboard.title" | "whiteboard.description" | "whiteboard.help"
  | "whiteboard.saved_boards" | "whiteboard.new_board" | "whiteboard.new_board_name"
  | "whiteboard.no_saves" | "whiteboard.board_name" | "whiteboard.type_text"
  | "whiteboard.place" | "whiteboard.tip_meeting" | "whiteboard.tip_standalone"
  | "whiteboard.confirm_delete" | "whiteboard.loading"
  | "whiteboard.saved_as" | "whiteboard.deleted" | "whiteboard.sharing"
  | "whiteboard.team_board" | "whiteboard.meeting_board"
  // Home
  | "home.login" | "home.signup_free" | "home.tagline" | "home.subtitle"
  | "home.get_started" | "home.login_google" | "home.demo" | "home.features_title"
  | "home.feature_discussion_title" | "home.feature_discussion_desc"
  | "home.feature_whiteboard_title" | "home.feature_whiteboard_desc"
  | "home.feature_ai_title" | "home.feature_ai_desc"
  | "home.feature_board_title" | "home.feature_board_desc"
  | "home.feature_security_title" | "home.feature_security_desc"
  | "home.feature_roles_title" | "home.feature_roles_desc" | "home.footer"
  // Auth
  | "auth.welcome_back" | "auth.signin_desc" | "auth.switch_account" | "auth.login"
  | "auth.new_here" | "auth.create_account" | "auth.continue_google" | "auth.or_email"
  | "auth.email" | "auth.password" | "auth.signing_in" | "auth.sign_in"
  | "auth.invalid_credentials" | "auth.email_placeholder" | "auth.start_collab"
  | "auth.signup_desc" | "auth.signup_bullet1" | "auth.signup_bullet2"
  | "auth.signup_bullet3" | "auth.signup_bullet4" | "auth.create_account_title"
  | "auth.already_have" | "auth.signup_google" | "auth.your_name" | "auth.work_email"
  | "auth.org_name_optional" | "auth.org_placeholder" | "auth.creating"
  | "auth.create_account_btn" | "auth.signup_failed"
  // Dashboard
  | "dashboard.hello" | "dashboard.there" | "dashboard.welcome" | "dashboard.your_workspace"
  | "dashboard.pick_tool" | "dashboard.your_role" | "dashboard.organization"
  | "dashboard.encrypted" | "dashboard.aes256" | "dashboard.quick_access" | "dashboard.open"
  | "dashboard.new_title" | "dashboard.new_step1" | "dashboard.new_step2"
  | "dashboard.new_step3" | "dashboard.new_step4"
  // Settings extended
  | "settings.desc_admin" | "settings.desc_user" | "settings.profile" | "settings.name"
  | "settings.features_access" | "settings.org_mgmt" | "settings.org_mgmt_desc"
  | "settings.stat_owners" | "settings.stat_admins" | "settings.stat_members"
  | "settings.stat_guests" | "settings.stat_communities" | "settings.stat_live_meetings"
  | "settings.stat_open_concerns" | "settings.stat_org_slug" | "settings.org_name_placeholder"
  | "settings.update_org" | "settings.saving" | "settings.role_updated" | "settings.org_updated"
  | "settings.could_not_role" | "settings.could_not_org" | "settings.member_access"
  | "settings.unnamed" | "settings.security_checks" | "settings.encryption_key"
  | "settings.ai_provider" | "settings.google_sso" | "settings.production_strict"
  | "settings.security_note" | "settings.recent_activity" | "settings.no_details"
  | "settings.by_system" | "settings.google_signin" | "settings.google_desc"
  | "settings.ai_assistant_config" | "settings.ai_desc" | "settings.ok" | "settings.needs_setup"
  // Security
  | "security.desc" | "security.help" | "security.encryption_title" | "security.encryption_desc"
  | "security.key_title" | "security.key_desc" | "security.rbac_title" | "security.rbac_desc"
  | "security.audit_title" | "security.audit_desc" | "security.matrix_title"
  | "security.col_feature" | "security.col_owner" | "security.col_admin"
  | "security.col_member" | "security.col_guest"
  | "security.row_discussion_post" | "security.row_discussion_read"
  | "security.row_whiteboard" | "security.row_ai" | "security.row_meetings"
  | "security.row_board" | "security.row_notes" | "security.row_history"
  | "security.row_team_settings" | "security.row_change_roles"
  // Notes extended
  | "notes.desc" | "notes.help" | "notes.new_note_btn" | "notes.private_encrypted"
  | "notes.title_placeholder" | "notes.add_emoji" | "notes.write_placeholder"
  | "notes.update_note" | "notes.save_note" | "notes.select_or_create" | "notes.no_notes"
  | "notes.untitled" | "notes.saved_success" | "notes.created_success"
  | "notes.deleted" | "notes.confirm_delete"
  // Calendar extended
  | "calendar.desc" | "calendar.help" | "calendar.add_date"
  | "calendar.day_sun" | "calendar.day_mon" | "calendar.day_tue" | "calendar.day_wed"
  | "calendar.day_thu" | "calendar.day_fri" | "calendar.day_sat"
  | "calendar.event_title" | "calendar.event_date" | "calendar.sticky_note"
  | "calendar.reminder" | "calendar.save_event" | "calendar.delete_event"
  | "calendar.edit_event" | "calendar.no_events" | "calendar.reminder_prefix"
  | "calendar.reminder_body" | "calendar.select_day"
  // Concerns
  | "concerns.desc" | "concerns.help" | "concerns.thank_you" | "concerns.submit_report"
  | "concerns.cat_feedback" | "concerns.cat_technical" | "concerns.cat_concern"
  | "concerns.cat_other" | "concerns.subject_placeholder" | "concerns.describe_placeholder"
  | "concerns.submit_btn" | "concerns.all_reports" | "concerns.your_submissions"
  | "concerns.mark_resolved" | "concerns.no_reports" | "concerns.status_open"
  | "concerns.status_resolved"
  // History
  | "history.desc" | "history.help" | "history.organization" | "history.my_activity"
  | "history.no_activity" | "history.system"
  // Meetings hub
  | "meetings.desc" | "meetings.help" | "meetings.new_call" | "meetings.call_ended_msg"
  | "meetings.tab_join" | "meetings.tab_ai" | "meetings.tab_notes"
  | "meetings.start_meeting" | "meetings.meeting_title_placeholder" | "meetings.start_video"
  | "meetings.creating" | "meetings.start_hint" | "meetings.join_title"
  | "meetings.join_placeholder" | "meetings.join_btn" | "meetings.recent"
  | "meetings.link" | "meetings.open" | "meetings.ai_notes_title" | "meetings.ai_notes_desc"
  | "meetings.meeting_link_placeholder" | "meetings.drop_recording"
  | "meetings.recording_formats" | "meetings.uploading" | "meetings.uploaded"
  | "meetings.choose_file" | "meetings.clear_file" | "meetings.transcript_placeholder"
  | "meetings.generate_minutes" | "meetings.generating" | "meetings.minutes_title"
  | "meetings.ask_title" | "meetings.ask_placeholder" | "meetings.manual_note"
  | "meetings.attendees_placeholder" | "meetings.save_note" | "meetings.no_saved_notes"
  | "meetings.loading" | "meetings.upload_failed"
  | "meetings.schedule" | "meetings.schedule_future" | "meetings.schedule_hint"
  | "meetings.attendees_label" | "meetings.meeting_title_label" | "meetings.date_label"
  | "meetings.time_label" | "meetings.add_team_members" | "meetings.external_attendees"
  | "meetings.scheduling" | "meetings.schedule_send" | "meetings.upcoming_scheduled"
  | "meetings.no_scheduled" | "meetings.team_members_selected"
  | "call.with" | "call.group_call"
  // Meeting room
  | "room.loading_whiteboard" | "room.camera_denied" | "room.screen_cancelled"
  | "room.mic_required" | "room.recording_unsupported" | "room.recording_failed"
  | "room.no_recording_data" | "room.upload_image_only" | "room.could_not_save_note"
  | "room.record" | "room.chat" | "room.people" | "room.raise" | "room.react"
  | "room.view" | "room.more" | "room.camera" | "room.camera_off" | "room.effects"
  | "room.background" | "room.bg_none" | "room.bg_blur" | "room.bg_remove"
  | "room.bg_purple" | "room.bg_warm" | "room.bg_office" | "room.bg_scenic"
  | "room.bg_workspace" | "room.bg_library" | "room.bg_custom" | "room.mic"
  | "room.share" | "room.leave" | "room.link_copied" | "room.copy_link"
  | "room.participants" | "room.send_message" | "room.whiteboard" | "room.end_meeting"
  | "room.phone_call" | "room.you" | "room.upload_custom" | "room.quick_note"
  | "room.note_title_placeholder" | "room.jot_down" | "room.effects_title"
  | "room.joining" | "room.hand_raised" | "room.no_participants"
  | "room.notes_btn" | "room.meeting_whiteboard" | "room.personal_note"
  | "room.save_to_notes" | "room.meeting_chat" | "room.download_file" | "room.file"
  | "room.invite_members" | "room.select_to_invite" | "room.no_users_to_invite"
  | "room.ring_invited" | "room.invite_sent" | "room.host_badge" | "room.cohost_badge"
  | "room.mute_participant" | "room.mute" | "room.turn_off_camera"
  | "room.make_cohost" | "room.remove_cohost"
  | "room.allow_mic" | "room.lock_mic" | "room.allow_camera" | "room.lock_camera"
  | "room.mic_locked" | "room.camera_locked"
  | "room.host_settings" | "room.mic_controls" | "room.camera_controls"
  | "room.participant_controls" | "room.target_all" | "room.select_member"
  | "room.mute_all" | "room.lock_all_mics" | "room.allow_all_mics"
  | "room.camera_off_all" | "room.lock_all_cameras" | "room.allow_all_cameras"
  | "room.remove_from_meeting" | "room.kicked_from_meeting"
  | "room.ringing_participants" | "room.no_answer_cancelled" | "room.waiting_seconds"
  // Roles & features
  | "role.owner" | "role.admin" | "role.member" | "role.guest"
  | "feature.dashboard" | "feature.discussion" | "feature.whiteboard"
  | "feature.ai_chat" | "feature.meeting_notes" | "feature.history"
  | "feature.project_board" | "feature.personal_notes" | "feature.team"
  | "feature.settings" | "feature.encryption" | "feature.calendar" | "feature.concerns"
  // Lang & misc
  | "lang.change" | "lang.header"
  | "sidebar.encrypted_rest" | "sidebar.workspace" | "team.in_org"
  | "board.desc" | "board.help" | "board.task_title_placeholder" | "board.unassigned"
  | "board.no_tasks" | "board.overdue" | "board.due_today" | "board.days_left"
  | "board.color_yellow" | "board.color_blue" | "board.color_green" | "board.color_pink"
  | "board.color_indigo" | "board.color_red" | "board.color_gray" | "board.color_purple"
  | "board.comments" | "board.add_comment" | "board.comment_placeholder"
  | "discussion.help" | "discussion.community_name" | "discussion.community_placeholder"
  | "discussion.channel_name" | "discussion.invite_email" | "discussion.invite_failed"
  | "discussion.calling_you" | "discussion.meeting_in"
  | "discussion.meeting_room" | "discussion.room_code"
  | "ai.desc" | "ai.help" | "ai.voice_on" | "ai.voice_off"
  | "guard.restricted" | "guard.no_permission" | "guard.back_home"
  | "error.page_failed" | "error.something_wrong" | "error.chunk_desc"
  | "error.try_again" | "error.full_refresh"
  | "call.declined" | "call.no_answer" | "call.link_copied" | "call.waiting_in_room" | "call.with" | "call.group_call"
  | "general.unnamed" | "general.workspace" | "general.na" | "general.system"
  | "general.no_details" | "general.by" | "general.loading_page"
  | "chat.attach_media" | "chat.attach_file" | "chat.copy_link"
  | "modal.note_saved" | "modal.got_it" | "modal.saved_to_notes"
  | "ai.text_chat" | "ai.disable_voice" | "ai.enable_voice" | "ai.voice"
  | "ai.stop" | "ai.edit" | "ai.delete" | "ai.listen_again" | "ai.voice_hint"
  | "ai.copy" | "ai.like" | "ai.unlike" | "ai.regenerate" | "ai.copied"
  | "discussion.create_community_hint" | "discussion.no_channels"
  | "auth.google_not_configured" | "auth.google_failed"
  | "settings.profile_photo" | "settings.upload_photo" | "settings.change_photo"
  | "settings.remove_photo" | "settings.uploading"
  | "discussion.filter_all" | "discussion.filter_chat" | "discussion.filter_images"
  | "discussion.filter_media"
  | "chat.download"
  | "team.help";

export type ExtendedTranslations = Record<ExtendedKey, string>;

const en: ExtendedTranslations = {
  "whiteboard.select": "Select",
  "whiteboard.pen": "Pen",
  "whiteboard.eraser": "Eraser",
  "whiteboard.rect": "Rectangle",
  "whiteboard.circle": "Circle",
  "whiteboard.text_tool": "Text",
  "whiteboard.share_to_meeting": "Share to meeting",
  "whiteboard.clear": "Clear canvas",
  "whiteboard.title": "Whiteboard",
  "whiteboard.description": "Draw, annotate, and save boards for your team",
  "whiteboard.help": "Use the toolbar to draw shapes, add text, and save your work.",
  "whiteboard.saved_boards": "Saved boards",
  "whiteboard.new_board": "New board",
  "whiteboard.new_board_name": "Untitled board",
  "whiteboard.no_saves": "No saved boards yet",
  "whiteboard.board_name": "Board name",
  "whiteboard.type_text": "Type text…",
  "whiteboard.place": "Place on canvas",
  "whiteboard.tip_meeting": "Changes sync live with everyone in the meeting.",
  "whiteboard.tip_standalone": "Save boards to reopen later or share in a meeting.",
  "whiteboard.confirm_delete": "Delete this saved whiteboard?",
  "whiteboard.loading": "Loading whiteboard…",
  "whiteboard.saved_as": "Whiteboard saved",
  "whiteboard.deleted": "Whiteboard deleted",
  "whiteboard.sharing": "Sharing whiteboard to all participants…",
  "whiteboard.team_board": "Team Whiteboard",
  "whiteboard.meeting_board": "Meeting board",
  "home.login": "Log in",
  "home.signup_free": "Sign up free",
  "home.tagline": "Collaborate simply. Discuss boldly.",
  "home.subtitle": "Empower your team with a smart workspace built for collaboration, productivity, and organized communication.",
  "home.get_started": "Get started",
  "home.login_google": "Log in with Google",
  "home.demo": "Demo: owner@yusi.com / demo1234",
  "home.features_title": "Everything your team needs",
  "home.feature_discussion_title": "Team Discussion",
  "home.feature_discussion_desc": "Real-time channels with encrypted messages",
  "home.feature_whiteboard_title": "Whiteboard",
  "home.feature_whiteboard_desc": "Sketch ideas together on a shared canvas",
  "home.feature_ai_title": "AI Assistant",
  "home.feature_ai_desc": "Get help summarizing, planning, and writing",
  "home.feature_board_title": "Project Board",
  "home.feature_board_desc": "Sticky-note tasks with assignees and deadlines",
  "home.feature_security_title": "Secure by Design",
  "home.feature_security_desc": "AES-256 encryption for notes and sensitive data",
  "home.feature_roles_title": "Role-Based Access",
  "home.feature_roles_desc": "Control who sees what: Owner, Admin, Member, Guest",
  "home.footer": "Encrypted & secure collaboration",
  "auth.welcome_back": "Welcome back",
  "auth.signin_desc": "Sign in to access discussions, whiteboard, AI assistant, and your team workspace.",
  "auth.switch_account": "Switch account",
  "auth.login": "Log in",
  "auth.new_here": "New here?",
  "auth.create_account": "Create an account",
  "auth.continue_google": "Continue with Google",
  "auth.or_email": "or email",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.signing_in": "Signing in…",
  "auth.sign_in": "Sign in",
  "auth.invalid_credentials": "Invalid email or password. Try demo: owner@yusi.com / demo1234",
  "auth.email_placeholder": "you@company.com",
  "auth.start_collab": "Start collaborating",
  "auth.signup_desc": "Create your free workspace in under a minute. No credit card required.",
  "auth.signup_bullet1": "Team discussions & whiteboard",
  "auth.signup_bullet2": "AI assistant & meeting notes",
  "auth.signup_bullet3": "Project board with sticky tasks",
  "auth.signup_bullet4": "Encrypted personal notes",
  "auth.create_account_title": "Create account",
  "auth.already_have": "Already have one?",
  "auth.signup_google": "Sign up with Google",
  "auth.your_name": "Your name",
  "auth.work_email": "Work email",
  "auth.org_name_optional": "Organization name (optional)",
  "auth.org_placeholder": "My Team",
  "auth.creating": "Creating…",
  "auth.create_account_btn": "Create account",
  "auth.signup_failed": "Signup failed",
  "dashboard.hello": "Hello",
  "dashboard.there": "there",
  "dashboard.welcome": "Welcome to",
  "dashboard.your_workspace": "your workspace",
  "dashboard.pick_tool": "Pick a tool below to get started.",
  "dashboard.your_role": "Your role",
  "dashboard.organization": "Organization",
  "dashboard.encrypted": "Encrypted",
  "dashboard.aes256": "AES-256 at rest",
  "dashboard.quick_access": "Quick access",
  "dashboard.open": "Open →",
  "dashboard.new_title": "New to Yusi Discuss?",
  "dashboard.new_step1": "Post a message in Discussion",
  "dashboard.new_step2": "Add tasks on the Project Board",
  "dashboard.new_step3": "Try the AI Assistant for summaries",
  "dashboard.new_step4": "Save private ideas in My Notes",
  "settings.desc_admin": "Admin center to manage organization, people, and software security",
  "settings.desc_user": "Your account and workspace preferences",
  "settings.profile": "Profile",
  "settings.name": "Name",
  "settings.features_access": "Features you can access",
  "settings.org_mgmt": "Organization management",
  "settings.org_mgmt_desc": "Manage workspace identity, member roles, and software posture.",
  "settings.stat_owners": "Owners",
  "settings.stat_admins": "Admins",
  "settings.stat_members": "Members",
  "settings.stat_guests": "Guests",
  "settings.stat_communities": "Communities",
  "settings.stat_live_meetings": "Live meetings",
  "settings.stat_open_concerns": "Open concerns",
  "settings.stat_org_slug": "Org slug",
  "settings.org_name_placeholder": "Organization name",
  "settings.update_org": "Update organization",
  "settings.saving": "Saving…",
  "settings.role_updated": "Role updated",
  "settings.org_updated": "Organization updated",
  "settings.could_not_role": "Could not change role",
  "settings.could_not_org": "Could not update organization",
  "settings.member_access": "Member access control",
  "settings.unnamed": "Unnamed",
  "settings.security_checks": "Software security checks",
  "settings.encryption_key": "Encryption key configured",
  "settings.ai_provider": "AI provider configured",
  "settings.google_sso": "Google SSO configured",
  "settings.production_strict": "Production strict mode",
  "settings.security_note": "Cross-organization access is blocked by API checks, role controls, and encryption at rest.",
  "settings.recent_activity": "Recent admin activity",
  "settings.no_details": "No details",
  "settings.by_system": "System",
  "settings.google_signin": "Google Sign-In",
  "settings.google_desc": "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local. Create credentials at Google Cloud Console → APIs → OAuth 2.0.",
  "settings.ai_assistant_config": "AI assistant",
  "settings.ai_desc": "Add these to .env.local for full AI (Groq free tier works well for testing):",
  "settings.ok": "OK",
  "settings.needs_setup": "Needs setup",
  "security.desc": "How Yusi Discuss protects your data",
  "security.help": "All sensitive notes and messages use AES-256-GCM encryption at rest.",
  "security.encryption_title": "Encryption at rest",
  "security.encryption_desc": "Discussion messages, meeting notes, and personal notes are encrypted with AES-256-GCM before storage.",
  "security.key_title": "Your encryption key",
  "security.key_desc": "Set ENCRYPTION_KEY in .env.local. Never commit this key. Rotate it periodically in production.",
  "security.rbac_title": "Role-based access",
  "security.rbac_desc": "Owner, Admin, Member, and Guest roles control which features each person can use.",
  "security.audit_title": "Activity audit",
  "security.audit_desc": "History logs track organization and personal actions for transparency and compliance.",
  "security.matrix_title": "Permission matrix",
  "security.col_feature": "Feature",
  "security.col_owner": "Owner",
  "security.col_admin": "Admin",
  "security.col_member": "Member",
  "security.col_guest": "Guest",
  "security.row_discussion_post": "Discussion (post)",
  "security.row_discussion_read": "Discussion (read)",
  "security.row_whiteboard": "Whiteboard",
  "security.row_ai": "AI Assistant",
  "security.row_meetings": "Meeting Notes",
  "security.row_board": "Project Board",
  "security.row_notes": "My Notes",
  "security.row_history": "History",
  "security.row_team_settings": "Team / Settings",
  "security.row_change_roles": "Change roles",
  "notes.desc": "Private notes. Only you can see them.",
  "notes.help": "Your notes are encrypted and never shared with the team.",
  "notes.new_note_btn": "New note",
  "notes.private_encrypted": "Private & encrypted",
  "notes.title_placeholder": "Note title",
  "notes.add_emoji": "Add emoji",
  "notes.write_placeholder": "Write your thoughts…",
  "notes.update_note": "Update note",
  "notes.save_note": "Save note",
  "notes.select_or_create": "Select a note or create a new one",
  "notes.no_notes": "No notes yet",
  "notes.untitled": "Untitled",
  "notes.saved_success": "Note updated successfully",
  "notes.created_success": "Note saved successfully",
  "notes.deleted": "Note deleted",
  "notes.confirm_delete": "Delete this note?",
  "calendar.desc": "Important dates with sticky notes and automatic reminders",
  "calendar.help": "Set a reminder time and you'll get a browser notification when it's due.",
  "calendar.add_date": "Add date",
  "calendar.day_sun": "Sun",
  "calendar.day_mon": "Mon",
  "calendar.day_tue": "Tue",
  "calendar.day_wed": "Wed",
  "calendar.day_thu": "Thu",
  "calendar.day_fri": "Fri",
  "calendar.day_sat": "Sat",
  "calendar.event_title": "Event title",
  "calendar.event_date": "Date",
  "calendar.sticky_note": "Sticky note",
  "calendar.reminder": "Reminder",
  "calendar.save_event": "Save event",
  "calendar.delete_event": "Delete",
  "calendar.edit_event": "Edit",
  "calendar.no_events": "No events this month",
  "calendar.reminder_prefix": "Reminder",
  "calendar.reminder_body": "From your Yusi Discuss calendar",
  "calendar.select_day": "Select a day to view or add events",
  "concerns.desc": "Share feedback, report technical issues, or raise concerns. Authorities are notified.",
  "concerns.help": "Owners and admins see all reports for your organization.",
  "concerns.thank_you": "Thank you. Your report was submitted to authorities.",
  "concerns.submit_report": "Submit a report",
  "concerns.cat_feedback": "Feedback",
  "concerns.cat_technical": "Technical problem",
  "concerns.cat_concern": "Report a concern",
  "concerns.cat_other": "Other",
  "concerns.subject_placeholder": "Subject",
  "concerns.describe_placeholder": "Describe your feedback or issue in detail…",
  "concerns.submit_btn": "Submit to authorities",
  "concerns.all_reports": "All reports (authority view)",
  "concerns.your_submissions": "Your submissions",
  "concerns.mark_resolved": "Mark resolved",
  "concerns.no_reports": "No reports yet",
  "concerns.status_open": "open",
  "concerns.status_resolved": "resolved",
  "history.desc": "See what your organization and you have done",
  "history.help": "Organization view shows team actions. Personal shows only yours.",
  "history.organization": "Organization",
  "history.my_activity": "My activity",
  "history.no_activity": "No activity yet",
  "history.system": "System",
  "meetings.desc": "Teams-style calls with hand raise, reactions, screen share, recording, plus AI minutes",
  "meetings.help": "Start a call to get a shareable link. AI notes work from the link, live transcript, or uploaded recording.",
  "meetings.new_call": "New call",
  "meetings.call_ended_msg": "Your last meeting ended. Generate AI minutes from the AI tab.",
  "meetings.tab_join": "Join / Start",
  "meetings.tab_ai": "AI Meeting Notes",
  "meetings.tab_notes": "Saved Notes",
  "meetings.start_meeting": "Start a meeting",
  "meetings.meeting_title_placeholder": "Meeting title",
  "meetings.start_video": "Start video meeting",
  "meetings.creating": "Creating…",
  "meetings.start_hint": "A shareable link will be created. Invite teammates from Discussion or Team.",
  "meetings.join_title": "Join with code or link",
  "meetings.join_placeholder": "Room code or paste meeting link",
  "meetings.join_btn": "Join meeting",
  "meetings.recent": "Recent meetings",
  "meetings.link": "Link",
  "meetings.open": "Open",
  "meetings.ai_notes_title": "AI Meeting Notes",
  "meetings.ai_notes_desc": "Paste a meeting link, upload a recording, or add a transcript to generate structured minutes.",
  "meetings.meeting_link_placeholder": "https://…/dashboard/meetings/room/ABC123",
  "meetings.drop_recording": "Drop a recording here or click to upload",
  "meetings.recording_formats": "WebM, MP4, or audio files supported",
  "meetings.uploading": "Uploading…",
  "meetings.uploaded": "File uploaded — ready to generate",
  "meetings.choose_file": "Choose file",
  "meetings.clear_file": "Clear",
  "meetings.transcript_placeholder": "Optional: paste transcript or extra notes…",
  "meetings.generate_minutes": "Generate meeting minutes",
  "meetings.generating": "Generating…",
  "meetings.minutes_title": "Meeting minutes",
  "meetings.ask_title": "Ask about this meeting",
  "meetings.ask_placeholder": "e.g. What were the action items? Who raised their hand?",
  "meetings.manual_note": "Manual note",
  "meetings.attendees_placeholder": "Attendees, agenda, decisions…",
  "meetings.save_note": "Save note",
  "meetings.no_saved_notes": "No saved meeting notes yet",
  "meetings.loading": "Loading meetings…",
  "meetings.upload_failed": "Upload failed",
  "room.loading_whiteboard": "Loading whiteboard…",
  "room.camera_denied": "Camera/microphone access denied. You can still use chat and reactions.",
  "room.screen_cancelled": "Screen share cancelled or not allowed.",
  "room.mic_required": "Allow microphone (and camera optional) to record.",
  "room.recording_unsupported": "Recording is not supported in this browser.",
  "room.recording_failed": "Recording failed. Try again.",
  "room.no_recording_data": "No recording data captured.",
  "room.upload_image_only": "Please upload an image file",
  "room.could_not_save_note": "Could not save note",
  "room.record": "Record",
  "room.chat": "Chat",
  "room.people": "People",
  "room.raise": "Raise",
  "room.react": "React",
  "room.view": "View",
  "room.more": "More",
  "room.camera": "Camera",
  "room.camera_off": "Camera off",
  "room.effects": "Effects",
  "room.background": "Background",
  "room.bg_none": "None",
  "room.bg_blur": "Blur background",
  "room.bg_remove": "Background remover",
  "room.bg_purple": "Purple tint",
  "room.bg_warm": "Warm tint",
  "room.bg_office": "Office workspace",
  "room.bg_scenic": "Scenery",
  "room.bg_workspace": "Modern desk",
  "room.bg_library": "Library",
  "room.bg_custom": "Custom image",
  "room.mic": "Mic",
  "room.share": "Share",
  "room.leave": "Leave",
  "room.link_copied": "Link copied!",
  "room.copy_link": "Copy link",
  "room.participants": "Participants",
  "room.send_message": "Send a message…",
  "room.whiteboard": "Whiteboard",
  "room.end_meeting": "End",
  "room.phone_call": "Phone call",
  "room.you": "You",
  "room.upload_custom": "Upload custom image",
  "room.quick_note": "Quick personal note",
  "room.note_title_placeholder": "Note title",
  "room.jot_down": "Jot down during the meeting…",
  "room.effects_title": "Background effects",
  "room.joining": "Joining meeting…",
  "room.hand_raised": "Hand raised",
  "room.no_participants": "Waiting for others to join…",
  "room.notes_btn": "Notes",
  "room.meeting_whiteboard": "Meeting whiteboard",
  "room.personal_note": "Personal note",
  "room.save_to_notes": "Save to My Notes",
  "room.meeting_chat": "Meeting chat",
  "room.download_file": "Download",
  "room.file": "file",
  "room.invite_members": "Invite",
  "room.select_to_invite": "Select members to ring into this meeting",
  "room.no_users_to_invite": "No one else to invite",
  "room.ring_invited": "Ring selected members",
  "room.invite_sent": "Invitation sent — ringing members",
  "room.host_badge": "Host",
  "room.cohost_badge": "Co-host",
  "room.mute_participant": "Mute participant",
  "room.mute": "Mute",
  "room.turn_off_camera": "Turn off camera",
  "room.make_cohost": "Make co-host",
  "room.remove_cohost": "Remove co-host",
  "room.allow_mic": "Allow mic",
  "room.lock_mic": "Lock mic off",
  "room.allow_camera": "Allow camera",
  "room.lock_camera": "Lock camera off",
  "room.mic_locked": "Host has locked your microphone off",
  "room.camera_locked": "Host has locked your camera off",
  "room.host_settings": "Host settings",
  "room.mic_controls": "Microphone",
  "room.camera_controls": "Camera",
  "room.participant_controls": "Participants",
  "room.target_all": "All participants",
  "room.select_member": "Select member…",
  "room.mute_all": "Mute all",
  "room.lock_all_mics": "Lock all mics off",
  "room.allow_all_mics": "Allow all mics",
  "room.camera_off_all": "Turn off all cameras",
  "room.lock_all_cameras": "Lock all cameras off",
  "room.allow_all_cameras": "Allow all cameras",
  "room.remove_from_meeting": "Remove from meeting",
  "room.kicked_from_meeting": "You were removed from the meeting",
  "room.ringing_participants": "Ringing participants…",
  "room.no_answer_cancelled": "No one joined — meeting cancelled",
  "room.waiting_seconds": "Waiting for others to join",
  "role.owner": "Owner",
  "role.admin": "Admin",
  "role.member": "Member",
  "role.guest": "Guest",
  "feature.dashboard": "Home",
  "feature.discussion": "Discussion",
  "feature.whiteboard": "Whiteboard",
  "feature.ai_chat": "AI Assistant",
  "feature.meeting_notes": "Meetings",
  "feature.history": "Activity History",
  "feature.project_board": "Project Board",
  "feature.personal_notes": "My Notes",
  "feature.team": "Team",
  "feature.settings": "Settings",
  "feature.encryption": "Security",
  "feature.calendar": "Calendar",
  "feature.concerns": "Report a Concern",
  "lang.change": "Change language",
  "lang.header": "Language",
  "sidebar.encrypted_rest": "AES-256 encrypted at rest",
  "sidebar.workspace": "Workspace",
  "team.in_org": "in your organisation",
  "board.desc": "Sticky-note tasks. Drag between columns by clicking status.",
  "board.help": "Each note shows assignee, status, deadline, and comments.",
  "board.task_title_placeholder": "Task title…",
  "board.unassigned": "Unassigned",
  "board.no_tasks": "No tasks yet",
  "board.overdue": "overdue",
  "board.due_today": "Due today",
  "board.days_left": "left",
  "board.color_yellow": "Yellow",
  "board.color_blue": "Blue",
  "board.color_green": "Green",
  "board.color_pink": "Pink",
  "board.color_indigo": "Indigo",
  "board.color_red": "Red",
  "board.color_gray": "Gray",
  "board.color_purple": "Purple",
  "board.comments": "Comments",
  "board.add_comment": "Add comment",
  "board.comment_placeholder": "Write a comment…",
  "discussion.help": "Search people to start a chat. Admins can create communities and channels.",
  "discussion.community_name": "Community name",
  "discussion.community_placeholder": "e.g. Engineering",
  "discussion.channel_name": "Channel name",
  "discussion.invite_email": "Email to invite",
  "discussion.invite_failed": "Failed to send invite.",
  "discussion.calling_you": "is calling you",
  "discussion.meeting_in": "Start meeting in",
  "discussion.meeting_room": "Meeting Room",
  "discussion.room_code": "Code",
  "ai.desc": "Get help with notes, tasks, and team communication. Type or speak your prompts.",
  "ai.help": "Built-in assistant works offline. Connect OpenAI in Settings for advanced AI. Enable Voice for speech input and spoken replies.",
  "ai.voice_on": "Voice on",
  "ai.voice_off": "Voice off",
  "guard.restricted": "Access restricted",
  "guard.no_permission": "Your role does not have permission to use this feature. Contact your organization owner or admin for access.",
  "guard.back_home": "Back to Home",
  "error.page_failed": "Page failed to load",
  "error.something_wrong": "Something went wrong",
  "error.chunk_desc": "The app was updated or the dev server restarted. Refresh to load the latest version.",
  "error.try_again": "Try again",
  "error.full_refresh": "Full refresh",
  "call.declined": "Call was declined.",
  "call.no_answer": "No answer.",
  "call.link_copied": "Link copied!",
  "call.waiting_in_room": "You are in the meeting room, waiting for others to join.",
  "general.unnamed": "Unnamed",
  "general.workspace": "Workspace",
  "general.na": "n/a",
  "general.system": "System",
  "general.no_details": "No details",
  "general.by": "by",
  "general.loading_page": "Loading…",
  "chat.attach_media": "Attach media",
  "chat.attach_file": "Attach file",
  "chat.copy_link": "Copy link",
  "modal.note_saved": "Note saved!",
  "modal.got_it": "Got it",
  "modal.saved_to_notes": "Saved to My Notes",
  "ai.text_chat": "Text chat",
  "ai.disable_voice": "Disable voice",
  "ai.enable_voice": "Enable voice",
  "ai.voice": "Voice",
  "ai.stop": "Stop",
  "ai.edit": "Edit",
  "ai.delete": "Delete",
  "ai.listen_again": "Listen again",
  "ai.voice_hint": "Tap the mic to speak your prompt. Replies can be read aloud when voice is on.",
  "ai.copy": "Copy",
  "ai.like": "Like",
  "ai.unlike": "Dislike",
  "ai.regenerate": "Regenerate",
  "ai.copied": "Copied!",
  "discussion.create_community_hint": "Owners and admins can create communities and channels.",
  "discussion.no_channels": "No communities yet. Create one to get started.",
  "auth.google_not_configured": "Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local.",
  "auth.google_failed": "Google sign-in failed. Check your connection and try again, or use email login.",
  "settings.profile_photo": "Profile photo",
  "settings.upload_photo": "Upload photo",
  "settings.change_photo": "Change photo",
  "settings.remove_photo": "Remove photo",
  "settings.uploading": "Uploading…",
  "discussion.filter_all": "All",
  "discussion.filter_chat": "Chat",
  "discussion.filter_images": "Images",
  "discussion.filter_media": "Media",
  "chat.download": "Download",
  "team.help": "Start a group or 1:1 meeting, or message anyone directly.",
  "meetings.schedule": "Schedule",
  "meetings.schedule_future": "Schedule a Future Meeting",
  "meetings.schedule_hint": "Create a meeting link up to 7 days ahead. Attendees receive a DM invite.",
  "meetings.attendees_label": "Attendees",
  "meetings.meeting_title_label": "Meeting Title",
  "meetings.date_label": "Date",
  "meetings.time_label": "Time",
  "meetings.add_team_members": "Add Team Members",
  "meetings.external_attendees": "External Attendees (Email)",
  "meetings.scheduling": "Scheduling…",
  "meetings.schedule_send": "Schedule Meeting & Send Invites",
  "meetings.upcoming_scheduled": "Upcoming Scheduled Meetings",
  "meetings.no_scheduled": "No scheduled meetings yet.",
  "meetings.team_members_selected": "team member(s) selected",
  "call.with": "Call with",
  "call.group_call": "Group Call",
};

/** Build locale overrides by merging with English fallback */
function L(
  code: LangCode,
  overrides: Partial<ExtendedTranslations> = {}
): ExtendedTranslations {
  const pack = LOCALE_PACKS[code] || {};
  return { ...en, ...pack, ...overrides };
}

export const EXTENDED_LOCALES: Record<LangCode, ExtendedTranslations> = {
  en,

  // Non-English extended locales removed — handled by the global DB + AI pipeline.


  // All non-English languages fall back to English and are translated dynamically.
  es: L("es"), fr: L("fr"), de: L("de"), ar: L("ar"), zh: L("zh"),
  ja: L("ja"), pt: L("pt"), hi: L("hi"), ur: L("ur"),
};

