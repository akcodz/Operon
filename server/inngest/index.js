import { Inngest } from "inngest";
import prisma from "../config/prisma.js";

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
];
