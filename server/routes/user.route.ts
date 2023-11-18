import express from "express";
import { registerationUser } from "../controllers/user.controller";
const userRouter = express.Router();

userRouter.post("/registration", registerationUser);

export default userRouter;