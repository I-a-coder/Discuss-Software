import { Resend } from "resend";

export interface AssignmentEmailPayload {
  assignee: { name: string | null; email: string };
  assigner: { name: string | null; email: string };
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    color: string;
    dueAt: Date | null;
  };
  appUrl: string;
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "#6B7280",
  IN_PROGRESS: "#F59E0B",
  REVIEW: "#3B82F6",
  DONE: "#10B981",
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "In Review",
  DONE: "Done",
};

function buildHtml(p: AssignmentEmailPayload): string {
  const assignerName = p.assigner.name || p.assigner.email.split("@")[0];
  const assigneeName = p.assignee.name || p.assignee.email.split("@")[0];
  const statusColor = STATUS_COLORS[p.task.status] ?? "#6B7280";
  const statusLabel = STATUS_LABELS[p.task.status] ?? p.task.status;
  const dueFormatted = p.task.dueAt
    ? new Date(p.task.dueAt).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>New Task Assigned — ${p.task.title}</title>
</head>
<body style="margin:0;padding:0;background:#F4F1F9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1F9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(93,58,140,0.12);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#5D3A8C 0%,#8B5CF6 100%);padding:32px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:8px 20px;margin-bottom:16px;">
                <span style="color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">📋 Project Board</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">You've been assigned a task!</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">
                <strong>${assignerName}</strong> assigned you to a project card.
              </p>
            </td>
          </tr>

          <!-- Task Card -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 20px;color:#6B7280;font-size:14px;">Hi <strong style="color:#111827;">${assigneeName}</strong>, here are the details of your new task:</p>

              <!-- Card -->
              <div style="background:${p.task.color};border-left:5px solid #5D3A8C;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
                <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">${p.task.title}</h2>
                ${
                  p.task.description
                    ? `<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">${p.task.description}</p>`
                    : ""
                }
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:12px;vertical-align:top;">
                      <span style="display:inline-block;background:${statusColor};color:#ffffff;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;white-space:nowrap;">${statusLabel}</span>
                    </td>
                    ${
                      dueFormatted
                        ? `<td style="vertical-align:top;">
                        <span style="font-size:13px;color:#4B5563;">
                          📅 Due <strong>${dueFormatted}</strong>
                        </span>
                      </td>`
                        : ""
                    }
                  </tr>
                </table>
              </div>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${p.appUrl}/dashboard/projects"
                       style="display:inline-block;background:linear-gradient(135deg,#5D3A8C,#8B5CF6);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;box-shadow:0 4px 12px rgba(93,58,140,0.35);">
                      Open Project Board →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;border-top:1px solid #F3F4F6;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;">
                This email was sent by <strong>Yusi Discuss</strong> because you were assigned to a task.<br/>
                If you believe this is a mistake, please contact your organization admin.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends a task-assignment notification email via Resend.
 * Silently skips if RESEND_API_KEY is not set in env.
 */
export async function sendAssignmentEmail(payload: AssignmentEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.info("[email] RESEND_API_KEY not set — skipping assignment email for", payload.assignee.email);
    return;
  }

  const resend = new Resend(apiKey);
  const fromAddress = process.env.RESEND_FROM ?? "Yusi Discuss <onboarding@resend.dev>";

  try {
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: payload.assignee.email,
      subject: `📋 Task Assigned: ${payload.task.title}`,
      html: buildHtml(payload),
      text: [
        `Hi ${payload.assignee.name ?? payload.assignee.email},`,
        ``,
        `${payload.assigner.name ?? payload.assigner.email} assigned you to the task "${payload.task.title}".`,
        ``,
        `Status: ${STATUS_LABELS[payload.task.status] ?? payload.task.status}`,
        payload.task.description ? `Description: ${payload.task.description}` : "",
        payload.task.dueAt ? `Due: ${new Date(payload.task.dueAt).toDateString()}` : "",
        ``,
        `Open project board: ${payload.appUrl}/dashboard/projects`,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    if (error) {
      console.error("[email] Resend API error:", error);
    } else {
      console.info("[email] Assignment email sent to", payload.assignee.email);
    }
  } catch (err) {
    // Never let email failures crash the request
    console.error("[email] Failed to send assignment email:", err);
  }
}
