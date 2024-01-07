import express from "express";
import {
  createLayout,
  editLayout,
  getLayout,
} from "../controllers/layout.controller";
import { isAuthenticated, authorizeRoles } from "../middleware/auth";
const layoutRouter = express.Router();

layoutRouter.post(
  "/create-layout",
  isAuthenticated,
  authorizeRoles("admin"),
  createLayout
);
layoutRouter.put(
  "/edit-layout",
  isAuthenticated,
  authorizeRoles("admin"),
  editLayout
);
layoutRouter.put(
  "/get-layout",
  getLayout
);

export default layoutRouter;
