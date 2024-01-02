import { Response } from "express";
import { redis } from "../utils/redis";
import User from "../models/user.model";

export const getUserById = async (id: string, res: Response) => {
  const userJ = await redis.get(id);

  if (userJ) {
    const user = JSON.parse(userJ);
    res.status(200).json({
      success: true,
      user,
    });
  }
};

export const getAllUsersService = async (res: Response) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.status(201).json({
    success: true,
    users,
  });
};
