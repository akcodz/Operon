import { Inngest } from "inngest";
import prisma from "../config/prisma.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "Operon" });

// Function: Sync User Creation
const syncUserCreation = inngest.createFunction(
    { id: "sync-user-from-clerk" },
    { event: "clear/user.created" },
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
    { event: "clear/user.deleted" },
    async ({ event }) => {
        const data = event?.data;
        await prisma.user.delete({
            where: {
                id: data?.id,
            },
        });
    }
);

// Function: Sync User Update
const syncUserUpdation = inngest.createFunction(
    { id: "update-user-from-clerk" },
    { event: "clear/user.updated" },
    async ({ event }) => {
        const data = event?.data;
        await prisma.user.update({
            where: {
                id: data?.id,
            },
            data: {
                id: data?.id,
                email: data?.email_addresses?.[0]?.email_address,
                name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
                image: data?.image_url,
            },
        });
    }
);

export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdation];
