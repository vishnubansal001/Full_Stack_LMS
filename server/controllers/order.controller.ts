import { NextFunction, Request, Response } from "express";
import { CatchAsyncErrors } from "../middleware/catchAsyncErros";
import ErrorHandler from "../utils/ErrorHandler";
import Order, { IOrder } from "../models/order.model";
import path from "path";
import ejs from "ejs";
import { sendMail } from "../utils/sendMail";
import User from "../models/user.model";
import Notification from "../models/notification.model";
import Course from "../models/course.model";
import { getAllOrdersService, newOrder } from "../services/order.service";

export const createOrder = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, payment_info } = req.body as IOrder;
      const user = await User.findById(req.user?._id);

      const courseExists = user?.courses.some((course: any) => {
        return course.toString() === courseId;
      });

      if (courseExists) {
        return next(new ErrorHandler(400, "You already have this course"));
      }

      const course = await Course.findById(courseId);

      if (!course) {
        return next(new ErrorHandler(404, "Course not found"));
      }

      const data: any = {
        user: user?._id,
        courseId: course._id,
      };

      const mailData = {
        order: {
          _id: course._id.toString().slice(0, 6),
          name: course.name,
          price: course.price,
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      };

      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/order-confirmation.ejs"),
        { order: mailData }
      );

      try {
        if (user) {
          await sendMail({
            email: user.email,
            subject: "Order Confirmation",
            template: "order-confirmation.ejs",
            data: mailData,
          });
        }
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
      }

      user?.courses.push(course._id);

      await user?.save();

      await Notification.create({
        user: user?._id,
        title: "New Order",
        message: `You have successfully purchased the course ${course?.name}`,
      });

      course.purchased ? (course.purchased += 1) : course.purchased;

      await course.save();

      newOrder(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getAllOrder = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllOrdersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);
