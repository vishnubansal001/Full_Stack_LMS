import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  userId: string;
  message: string;
  status: string;
  title: string;
}

const notificationSchema = new Schema<INotification>(
  {
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "unread",
    },
    title: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Notification: Model<INotification> = mongoose.model(
  "Notification",
  notificationSchema
);

export default Notification;
