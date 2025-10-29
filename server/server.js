import express from 'express';
import 'dotenv/config'
import cors from 'cors'
import { clerkMiddleware } from '@clerk/express'
import {serve} from "inngest/express";
import {functions, inngest} from "./inngest/index.js";
import workspaceRouter from "./routes/workspaceRoute.js";
import {protect} from "./middleware/authMiddleware.js";

const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());
app.use(cors());

app.use(clerkMiddleware())

app.get('/', (req, res) => {
    res.send('server is running');
})
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/workspaces",protect, workspaceRouter);

app.listen(PORT, () => {
    console.info(`listening on port ${PORT}`);
})





