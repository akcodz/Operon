import {Router} from "express";
import { addComment, getComments } from "../controllers/commentContoller.js";

const commentRouter = Router();

// Add a comment to a task
commentRouter.post("/", addComment);

// Get all comments for a specific task
commentRouter.get("/:taskId", getComments);

export default commentRouter;
