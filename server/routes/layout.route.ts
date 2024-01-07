import express from "express";
import { createLayout } from "../controllers/layout.controller";
import { isAuthenticated, authorizeRoles } from "../middleware/auth";
const layoutRouter = express.Router();

layoutRouter.post(
  "/create-layout",
  isAuthenticated,
  authorizeRoles("admin"),
  createLayout
);

export default layoutRouter;
