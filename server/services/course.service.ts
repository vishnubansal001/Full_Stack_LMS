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
