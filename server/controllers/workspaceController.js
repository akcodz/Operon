import prisma from "../config/prisma.js";

export const getUserWorkspaces= async (req, res) =>{
    try {
        // Get authenticated user
        const { userId } = req.auth();



        // Fetch workspaces where the user is a member
        const workspaces = await prisma.workspace.findMany({
            where: {
                members: {
                    some: { userId: userId },
                },
            },
            include: {
                members: {
                    include: {
                        user: true, // Include user info for each member
                    },
                },
                projects: {
                    include: {
                        tasks: {
                            include: {
                                assignee: true,
                                comments: {
                                    user: true, // Include user info for each comment
                                },
                            },
                        },
                        members: {
                            include: {
                                user: true,
                            },
                        },
                    },
                },
                owner: true,
            },
        });


        // Respond with the workspace data
        return res.status(200).json({  workspaces });
    } catch (error) {
        console.error("Error fetching workspaces:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

export const addMember = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { email, role, workspaceId, message } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized: User not authenticated." });
        }

        if (!workspaceId || !role || !email) {
            return res.status(400).json({ error: "Missing required parameters." });
        }

        if (!["ADMIN", "MEMBER"].includes(role)) {
            return res.status(400).json({ error: "Invalid role provided." });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { members: true },
        });

        if (!workspace) {
            return res.status(404).json({ error: "Workspace not found." });
        }

        // Only ADMINs can add members
        const isAdmin = workspace.members.some(
            (member) => member.userId === userId && member.role === "ADMIN"
        );

        if (!isAdmin) {
            return res.status(403).json({ error: "You do not have admin privileges." });
        }

        // Check if the user is already a member
        const existingMember = workspace.members.find(
            (member) => member.userId === user.id
        );

        if (existingMember) {
            return res.status(400).json({ error: "User is already a member of this workspace." });
        }

        // Add the new member
        const member = await prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId,
                role,
                message,
            },
        });

        return res.status(201).json({
            message: "Member added successfully.",
            data: member,
        });
    } catch (error) {
        console.error("Error adding member:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error.",
            details: error.message,
        });
    }
};
