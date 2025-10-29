import {Router} from "express";
import {getUserWorkspaces,addMember} from "../controllers/workspaceController.js";

const router = Router();



router.get("/",getUserWorkspaces )
router.post("/add-member",addMember )

export default router;