import { NextFunction, Response } from "express";
import { CatchAsyncErrors } from "../middleware/catchAsyncErros";
import Order from "../models/order.model";

export const newOrder = CatchAsyncErrors(
  async (data: any, next: NextFunction, res: Response) => {
    const order = await Order.create(data);
    res.status(200).json({
      success: true,
      order,
    });
  }
);
