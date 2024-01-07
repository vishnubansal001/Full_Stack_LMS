import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncErrors } from "../middleware/catchAsyncErros";
import { generateLast12MonthsData } from "../utils/analytics.generator";
import User from "../models/user.model";
import Course from "../models/course.model";
import Order from "../models/order.model";

export const getUserAnalytics = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await generateLast12MonthsData(User);
      res.status(200).json({
        success: true,
        users,
      });
    } catch (error: any) {
      next(new ErrorHandler(500, error.message));
    }
  }
);

export const getCoursesAnalytics = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await generateLast12MonthsData(Course);
      res.status(200).json({
        success: true,
        courses,
      });
    } catch (error: any) {
      next(new ErrorHandler(500, error.message));
    }
  }
);

export const getOrderAnalytics = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orders = await generateLast12MonthsData(Order);
      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error: any) {
      next(new ErrorHandler(500, error.message));
    }
  }
);
