import prisma from "../config/prisma.js";
import {inngest} from "../inngest/index.js";

export const createTask = async (req, res) => {
    try {
        const { userId } = req.auth(); // Assuming middleware adds auth context
        const {
            projectId,
            title,
            description,
            type,
            due_date,
            status,
            priority,
            assigneeId
        } = req.body;
       const origin =req.get('origin');
        // Validate project
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                members: {
                    include: { user: true }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        } else if (assigneeId && !project.members.find((member) => member.user.id === assigneeId)) {
            return res.status(400).json({ message: "Assignee must be a project member" });
        }

        // Create task
        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                due_date: due_date ? new Date(due_date) : null,
                status,
                type,
                priority,
                assigneeId,
            }
        });
       const taskWithAssignee = await prisma.task.findUnique({
           where: { id: task.id },
           include: {
               assignee: true
           }
       })
        await inngest.send({
            name:"app/task.assigned",
            data:{
                taskId: task.id,origin
            }
        })
        return res.json({
            taskWithAssignee,
            message: "Task created successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};


export const updateTask = async (req, res) => {
    try {
        const { userId } = req.auth();
        const {id} = req.params;

        // Fetch task with project relation
        const task = await prisma.task.findUnique({
            where: { id },});

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const project = await prisma.project.findUnique({
            where: { id: task.projectId },
        include: {
                members: {
                    include: {
                        user: true,
                    }
                }
        }});


        if (project.team_lead !== userId) {
            return res.status(403).json({
                message: "You don't have permission to update this task."
            });
        }

        // Update the task
        const updatedTask = await prisma.task.update({
            where: { id },
            data:req.body
        });

        return res.json({
            task: updatedTask,
            message: "Task updated successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

export const deleteTask = async (req, res) => {
    try{
        const {userId} = req.auth();
        const {tasksIds} = req.body
        const tasks = await prisma.task.findMany({where: { id: {in:tasksIds} }})

        if (tasks.length === 0) {
            return res.status(404).json({ message: "Task not found" });
        }

        const project = await prisma.project.findUnique({where: {id: tasks[0].projectId}, include: {members:{include: {user: true}}}});

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        }

        await prisma.task.deleteMany({where: { id: {in:tasksIds} }})

        return res.json({message: "Task deleted successfully"});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
}

