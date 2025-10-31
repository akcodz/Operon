import { Inngest } from "inngest";
import prisma from "../config/prisma.js";
import sendEmail from "../config/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "Operon" });

/* -----------------------------------------------------
 * USER SYNC FUNCTIONS
 * --------------------------------------------------- */

// Function: Sync User Creation
const syncUserCreation = inngest.createFunction(
    { id: "sync-user-from-clerk" },
    { event: "clerk/user.created" },
    async ({ event }) => {
        const data = event?.data;

        await prisma.user.create({
            data: {
                id: data?.id,
                email: data?.email_addresses?.[0]?.email_address,
                name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
                image: data?.image_url,
            },
        });
    }
);

// Function: Sync User Deletion
const syncUserDeletion = inngest.createFunction(
    { id: "delete-user-from-clerk" },
    { event: "clerk/user.deleted" },
    async ({ event }) => {
        console.log(event);
        const data = event?.data;
        await prisma.user.delete({
            where: { id: data?.id },
        });
    }
);

// Function: Sync User Update
const syncUserUpdation = inngest.createFunction(
    { id: "update-user-from-clerk" },
    { event: "clerk/user.updated" },
    async ({ event }) => {
        const data = event?.data;

        await prisma.user.update({
            where: { id: data?.id },
            data: {
                id: data?.id,
                email: data?.email_addresses?.[0]?.email_address,
                name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
                image: data?.image_url,
            },
        });
    }
);

/* -----------------------------------------------------
 * WORKSPACE SYNC FUNCTIONS
 * --------------------------------------------------- */

// Function: Sync Workspace Creation
const syncWorkspaceCreation = inngest.createFunction(
    { id: "sync-workspace-from-clerk" },
    { event: "clerk/organization.created" },
    async ({ event }) => {
        const data = event?.data;

        await prisma.workspace.create({
            data: {
                id: data?.id,
                name: data?.name,
                slug: data?.slug,
                ownerId: data?.created_by,
                image_url: data?.image_url,
            },
        });

        await prisma.workspaceMember.create({
            data: {
                userId: data?.created_by,
                workspaceId: data?.id,
                role: "ADMIN",
            },
        });
    }
);

// Function: Sync Workspace Update
const syncWorkspaceUpdation = inngest.createFunction(
    { id: "update-workspace-from-clerk" },
    { event: "clerk/organization.updated" },
    async ({ event }) => {
        const data = event?.data;

        await prisma.workspace.update({
            where: { id: data?.id },
            data: {
                name: data?.name,
                slug: data?.slug,
                image_url: data?.image_url,
            },
        });
    }
);

// Function: Sync Workspace Deletion
const syncWorkspaceDeletion = inngest.createFunction(
    { id: "delete-workspace-from-clerk" },
    { event: "clerk/organization.deleted" },
    async ({ event }) => {
        console.log(event);
        const data = event?.data;

        await prisma.workspace.delete({
            where: { id: data?.id },
        });
    }
);

// Function: Sync Workspace Member Creation
const syncWorkspaceMemberCreation = inngest.createFunction(
    { id: "sync-workspace-member-from-clerk" },
    { event: "clerk/organizationInvitation.accepted" },
    async ({ event }) => {
        const data = event?.data;

        await prisma.workspaceMember.create({
            data: {
                userId: data?.user_id,
                workspaceId: data?.organization_id,
                role: String(data?.role_name).toUpperCase(),
            },
        });
    }
);


export const sendTaskAssignmentEmail = inngest.createFunction(
    { id: "send-task-assignment-mail" },
    { event: "app/task.assigned" },
    async ({ event, step }) => {
        const { taskId, origin } = event.data;

        // Fetch task with relations
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { assignee: true, project: true },
        });

        if (!task || !task.assignee) return;

        // --- Step 1: Send assignment email ---
        await sendEmail({
            to: task.assignee.email,
            subject: `New Task Assignment in ${task.project.name}`,
            body: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Hi ${task.assignee.name},</h2>
          <p style="font-size: 16px;">You've been assigned a new task:</p>

          <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
            <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">
              ${task.title}
            </p>
            <p style="margin: 6px 0;"><strong>Description:</strong> ${task.description || "No description provided"}</p>
            <p style="margin: 6px 0;"><strong>Due Date:</strong> ${
                task.due_date
                    ? new Date(task.due_date).toLocaleDateString()
                    : "No due date"
            }</p>
          </div>

          <a href="${origin}"
             style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">
            View Task
          </a>

          <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
            Please make sure to review and complete it before the due date.
          </p>
        </div>
      `,
        });

        // --- Step 2: Schedule reminder if not due today ---
        if (
            task.due_date &&
            new Date(task.due_date).toDateString() !== new Date().toDateString()
        ) {
            await step.sleepUntil("wait-for-the-due-date", new Date(task.due_date));

            await step.run("check-if-task-is-complete", async () => {
                const updatedTask = await prisma.task.findUnique({
                    where: { id: taskId },
                    include: { assignee: true, project: true },
                });

                if (!updatedTask || updatedTask.status === "DONE") return;

                await step.run("send-task-reminder-mail", async () => {
                    await sendEmail({
                        to: updatedTask.assignee.email,
                        subject: `Reminder: Task Due in ${updatedTask.project.name}`,
                        body: `
              <div style="max-width: 600px; font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #007bff;">Task Reminder</h2>
                <p style="font-size: 16px;">
                  You have a pending task due in <strong>${updatedTask.project.name}</strong>:
                </p>

                <h3 style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">
                  ${updatedTask.title}
                </h3>

                <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
                  <p style="margin: 6px 0;"><strong>Description:</strong> ${updatedTask.description || "No description provided"}</p>
                  <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(updatedTask.due_date).toLocaleDateString()}</p>
                </div>

                <a href="${origin}"
                   style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff;
                          font-weight: 600; font-size: 16px; text-decoration: none;">
                  View Task
                </a>

                <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
                  Please make sure to complete it as soon as possible.
                </p>
              </div>
            `,
                    });
                });
            });
        }
    }
);

/* -----------------------------------------------------
 * EXPORT FUNCTIONS
 * --------------------------------------------------- */

export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    syncWorkspaceCreation,
    syncWorkspaceDeletion,
    syncWorkspaceUpdation,
    syncWorkspaceMemberCreation,
    sendTaskAssignmentEmail
];
