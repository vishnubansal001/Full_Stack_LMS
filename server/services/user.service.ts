import { Response } from "express";
import { redis } from "../utils/redis";

export const getUserById = async (id: string, res: Response) => {
  const userJ = await redis.get(id);

  if(userJ){
    const user = JSON.parse(userJ);
    res.status(200).json({
      success: true,
      user,
    });
  }
};
