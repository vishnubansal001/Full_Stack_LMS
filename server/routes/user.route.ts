import express from "express";
import {
  activateUser,
  loginUser,
  registerationUser,
} from "../controllers/user.controller";
const userRouter = express.Router();

userRouter.post("/registration", registerationUser);
userRouter.post("/activate-user", activateUser);
userRouter.post("/login-user", loginUser);

export default userRouter;
