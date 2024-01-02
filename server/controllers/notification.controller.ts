import Notification from "../models/notification.model";
import { NextFunction, Response, Request } from "express";
import { CatchAsyncErrors } from "../middleware/catchAsyncErros";
import ErrorHandler from "../utils/ErrorHandler";
import cron from "node-cron";

export const getNotifications = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notifications = await Notification.find().sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        notifications,
      });
    } catch (error: any) {
      next(new ErrorHandler(500, error.message));
    }
  }
);

export const updateNotification = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await Notification.findById(req.params.id);

      if (!notification) {
        return next(new ErrorHandler(404, "Notification not found"));
      } else {
        notification.status
          ? (notification.status = "read")
          : notification?.status;
      }

      await notification.save();

      const notifications = await Notification.find().sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        notifications,
      });
    } catch (error: any) {
      return next(new ErrorHandler(500, error.message));
    }
  }
);

cron.schedule("0 0 0 * * *", async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await Notification.deleteMany({
    status: "read",
    createdAt: { $lt: thirtyDaysAgo },
  });
  console.log('Deleted read notifications');
});
