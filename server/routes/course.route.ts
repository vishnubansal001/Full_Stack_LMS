import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  editCourse,
  getAllCourses,
  getSingleCourse,
  uploadCourse,
} from "../controllers/course.controller";
const courseRouter = express.Router();

courseRouter.post(
  "/create-course",
  isAuthenticated,
  authorizeRoles("admin"),
  uploadCourse
);
courseRouter.put(
  "/edit-course/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  editCourse
);
courseRouter.put("/get-course/:id", getSingleCourse);
courseRouter.put("/get-courses", getAllCourses);

export default courseRouter;
