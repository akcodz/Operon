import prisma from "../config/prisma.js";


export const addComment = async (req,res)=>{
try{
    const { userId } = req.auth();
    const { content, taskId } = req.body;

// Find the task
    const task = await prisma.task.findUnique({
        where: { id: taskId },
    });

    if (!task) {
        return res.status(404).json({ message: "Task not found" });
    }

// Find the project associated with the task
    const project = await prisma.project.findUnique({
        where: { id: task.projectId },
        include: {
            members: {
                include: { user: true },
            },
        },
    });

    if (!project) {
        return res.status(404).json({ message: "Project not found" });
    }

// Check if user is a project member
    const isMember = project.members.some((member) => member.userId === userId);

    if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this project" });
    }

// Continue with your logic (e.g., create comment)
    const comment = await prisma.comment.create({
        data: {
            taskId,
            content,
            userId,
        },
        include: {
            user: true
        }
    });

    return res.json({comment});

}catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
}
}

export const getComments = async (req,res)=>{
    try {
const{taskId} = req.params;
        const comments = await prisma.comment.findMany({where: { taskId },
        include: {user: true}
        });
        res.json({comments});
    }catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
}
