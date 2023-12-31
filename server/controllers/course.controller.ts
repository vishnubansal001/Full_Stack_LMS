import { NextFunction, Request, Response } from "express";
import { CatchAsyncErrors } from "../middleware/catchAsyncErros";
import ErrorHandler from "../utils/ErrorHandler";
import cloudinary from "cloudinary";
import { createCourse, getAllCoursesService } from "../services/course.service";
import Course from "../models/course.model";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import path from "path";
import ejs from "ejs";
import { sendMail } from "../utils/sendMail";
import Notification from "../models/notification.model";

export const uploadCourse = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const mc = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: mc.public_id,
          url: mc.secure_url,
        };
      }
      createCourse(data, res, next);
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);

export const editCourse = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const mc = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: mc.public_id,
          url: mc.secure_url,
        };
      }
      const courseId = req.params.id;

      const course = await Course.findByIdAndUpdate(
        courseId,
        {
          $set: data,
        },
        {
          new: true,
        }
      );
      res.status(201).json({
        status: true,
        course,
      });
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);

export const getSingleCourse = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const isCacheExist = await redis.get(courseId);

      if (isCacheExist) {
        const course = JSON.parse(isCacheExist);
        return res.status(200).json({
          status: true,
          course,
        });
      } else {
        const course = await Course.findById(courseId).select(
          "-courseData.videoUrl -courseData.suggestion -courseData.links -courseData.questions"
        );
        await redis.set(courseId, JSON.stringify(course));
        res.status(200).json({
          status: true,
          course,
        });
      }
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);

export const getAllCourses = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isCacheExist = await redis.get("allCourses");
      if (isCacheExist) {
        const courses = JSON.parse(isCacheExist);
        return res.status(200).json({
          status: true,
          courses,
        });
      } else {
        const courses = await Course.find().select(
          "-courseData.videoUrl -courseData.suggestion -courseData.links -courseData.questions"
        );
        await redis.set("allCourses", JSON.stringify(courses));
        res.status(200).json({
          status: true,
          courses,
        });
      }
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);

export const getCourseByUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;
      const courseExists = userCourseList?.find(
        (course: any) => course._id.toString() === courseId
      );
      if (!courseExists) {
        return next(
          new ErrorHandler(400, "You don't have access to this course")
        );
      }
      const course = await Course.findById(courseId);
      const content = course?.courseData;

      res.status(200).json({
        status: true,
        content,
      });
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);

interface IAddQuestionData {
  question: string;
  answer: string;
  contentId: string;
}

export const addQuestion = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, answer, contentId }: IAddQuestionData = req.body;
      const course = await Course.findById(contentId);
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler(400, "Invalid Content Id"));
      }

      const courseContent = course?.courseData.find((item: any) =>
        item._id.equals(contentId)
      );
      if (!courseContent) {
        return next(new ErrorHandler(400, "Invalid Content Id"));
      }

      const newQuestion: any = {
        user: req.user,
        question,
        questionReplies: [],
      };

      courseContent.questions.push(newQuestion);

      await Notification.create({
        user: req.user?._id,
        title: "New Question",
        message: `You have a new question in ${courseContent.title}`,
      });

      await course?.save();

      res.status(200).json({
        success: true,
        course,
      });
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);

interface IAddAnswerData {
  answer: string;
  courseId: string;
  contentId: string;
  questionId: string;
}

export const addAnswer = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answer, courseId, contentId, questionId }: IAddAnswerData =
        req.body;
      const course = await Course.findById(courseId);
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler(400, "Invalid Content Id"));
      }

      const courseContent = course?.courseData?.find((item: any) =>
        item._id.equals(contentId)
      );
      if (!courseContent) {
        return next(new ErrorHandler(400, "Invalid Content Id"));
      }

      const courseQuestion = courseContent?.questions?.find((item: any) =>
        item._id.equals(questionId)
      );

      if (!courseQuestion) {
        return next(new ErrorHandler(400, "Invalid Question Id"));
      }

      const newAnswer: any = {
        user: req.user,
        answer,
      };

      courseQuestion.questionReplies.push(newAnswer);

      await course?.save();

      if (req.user?._id === courseQuestion.user._id) {
        await Notification.create({
          user: req.user?._id,
          title: "New Answer",
          message: `You have a new answer in ${courseContent.title}`,
        });
      } else {
        const data = {
          name: courseQuestion.user.name,
          title: courseContent.title,
        };

        const html = await ejs.renderFile(
          path.join(__dirname, "../views/question-reply.ejs"),
          data
        );

        try {
          await sendMail({
            email: courseQuestion.user.email,
            subject: "Question Reply",
            template: "question-reply.ejs",
            data,
          });
        } catch (err: any) {
          return next(new ErrorHandler(err.message, 500));
        }

        res.status(200).json({
          success: true,
          course,
        });
      }
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);

interface IAddReviewData {
  rating: number;
  review: string;
  courseId: string;
  userId: string;
}

export const addReview = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;
      const courseExists = userCourseList?.find(
        (course: any) => course._id.toString() === courseId.toString()
      );
      if (!courseExists) {
        return next(
          new ErrorHandler(404, "You are not eligible to access this course")
        );
      }
      const course = await Course.findById(courseId);
      const { review, rating } = req.body as IAddReviewData;

      const reviewData: any = {
        user: req.user,
        comment: review,
        rating,
      };
      course?.reviews.push(reviewData);

      let avg = 0;

      course?.reviews.push(reviewData);
      course?.reviews.forEach((rev: any) => {
        avg += rev.rating;
      });

      if (course) {
        course.ratings = avg / course.reviews.length;
      }

      await course?.save();
      const notification = {
        title: "New Review Received",
        message: `${req.user?.name} has given a review in ${course?.name}`,
      };

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

interface IAddReviewData {
  comment: string;
  courseId: string;
  reviewId: string;
}

export const addReplyToReview = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId } = req.body as IAddReviewData;

      const course = await Course.findById(courseId);

      if (!course) {
        return next(new ErrorHandler(404, "Course not found"));
      }

      const review = course?.reviews.find(
        (item: any) => item._id.toString() === reviewId.toString()
      );

      if (!review) {
        return next(new ErrorHandler(404, "Review not found"));
      }

      const newReply: any = {
        user: req.user,
        comment,
      };

      if (!review.commentReplies) {
        review.commentReplies = [];
      }

      // course.reviews?.push(newReply);
      review.commentReplies?.push(newReply);

      await course?.save();

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getAllCourse = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllCoursesService(res);
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

export const deleteCourse = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const course = await Course.findById(id);

      if (!course) {
        return next(new ErrorHandler(400, "course not found"));
      }

      await course.deleteOne();

      await redis.del(id);

      res.status(200).json({
        success: true,
        message: "course deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);
