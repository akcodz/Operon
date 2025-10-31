import {Router} from "express";
import { createTask, updateTask, deleteTask } from "../controllers/taskController.js";

const taskRouter = Router();

// Create a new task
taskRouter.post("/", createTask);

// Update an existing task
taskRouter.put("/:id", updateTask);

// Delete one or multiple tasks
taskRouter.post("/delete", deleteTask);

export default taskRouter;
