import prisma from "../config/prisma.js";

// ✅ Create Project
export const createProject = async (req, res) => {
    try {
        const { userId } = req.auth();
        const {
            workspaceId,
            description,
            name,
            status,
            start_date,
            end_date,
            team_members,
            team_lead,
            progress,
            priority
        } = req.body;

        // Validate workspace
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                members: {
                    include: { user: true }
                }
            }
        });

        if (!workspace) {
            return res.status(404).json({ message: "No workspace found" });
        }

        // Verify admin privileges
        const isAdmin = workspace.members.some(
            (member) => member.userId === userId && member.role === "ADMIN"
        );

        if (!isAdmin) {
            return res.status(403).json({ message: "You don't have admin privileges!" });
        }

        // Find team lead
        const teamLead = await prisma.user.findUnique({
            where: { email: team_lead },
            select: { id: true }
        });

        // Create project
        const project = await prisma.project.create({
            data: {
                workspaceId,
                name,
                description,
                status,
                priority,
                progress,
                team_lead: teamLead?.id || null,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null
            }
        });

        // Add members
        if (Array.isArray(team_members) && team_members.length > 0) {
            const membersToAdd = workspace.members
                .filter((member) => team_members.includes(member.user.email))
                .map((member) => member.user.id);

            if (membersToAdd.length > 0) {
                await prisma.projectMember.createMany({
                    data: membersToAdd.map((memberId) => ({
                        projectId: project.id,
                        userId: memberId
                    }))
                });
            }
        }

        // Fetch project with relationships
        const projectWithMembers = await prisma.project.findUnique({
            where: { id: project.id },
            include: {
                members: { include: { user: true } },
                tasks: { include: { assignee: true, comments: { include: { user: true } } } },
                owner: true
            }
        });

        return res.json({
            project: projectWithMembers,
            message: "Project created successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

// ✅ Update Project
export const updateProject = async (req, res) => {
    try {
        const { userId } = req.auth();
        const {
            id,
            workspaceId,
            description,
            name,
            status,
            start_date,
            end_date,
            progress,
            priority
        } = req.body;

        // Validate workspace
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                members: {
                    include: { user: true }
                }
            }
        });

        if (!workspace) {
            return res.status(404).json({ message: "No workspace found" });
        }

        // Verify admin or team lead privileges
        const isAdmin = workspace.members.some(
            (member) => member.userId === userId && member.role === "ADMIN"
        );

        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) {
            return res.status(404).json({ message: "No project found" });
        }

        if (!isAdmin && project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have permission to update this project." });
        }

        // Update project
        const updatedProject = await prisma.project.update({
            where: { id },
            data: {
                workspaceId,
                name,
                description,
                status,
                priority,
                progress,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null
            }
        });

        return res.json({
            project: updatedProject,
            message: "Project updated successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

// ✅ Add Member to Project
export const addMember = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { projectId } = req.params;
        const { email } = req.body;

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                members: { include: { user: true } }
            }
        });

        if (!project) {
            return res.status(404).json({ message: "No project found" });
        }

        // Only team lead or admin can add members
        const workspace = await prisma.workspace.findUnique({
            where: { id: project.workspaceId },
            include: { members: true }
        });

        const isAdmin = workspace.members.some(
            (member) => member.userId === userId && member.role === "ADMIN"
        );

        if (!isAdmin && project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have permission to add members." });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check for duplicate member
        const existingMember = project.members.some(
            (member) => member.user.email === email
        );
        if (existingMember) {
            return res.status(400).json({ message: "User is already a member." });
        }

        // Add member
        const member = await prisma.projectMember.create({
            data: {
                projectId,
                userId: user.id
            }
        });

        return res.json({
            member,
            message: "Member added successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};
