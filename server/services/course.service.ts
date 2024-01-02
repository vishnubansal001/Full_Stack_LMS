import { Response } from "express";
import Course from "../models/course.model";
import { CatchAsyncErrors } from "../middleware/catchAsyncErros";

export const createCourse = CatchAsyncErrors(
  async (data: any, res: Response) => {
    const course = await Course.create(data);
    res.status(201).json({
      success: true,
      course,
    });
  }
);

export const getAllCoursesService = async (res: Response) => {
  const courses = await Course.find().sort({ createdAt: -1 });
  res.status(201).json({
    success: true,
    courses,
  });
};
