import express from "express";
import { createProject, updateProject, addMember } from "../controllers/projectController.js";

const projectRouter = express.Router();

// Create project
projectRouter.post("/", createProject);

// Update project
projectRouter.put("/", updateProject);

// Add member to project
projectRouter.post("/:projectId/addMember", addMember);

export default projectRouter;
