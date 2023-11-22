import { Request, Response, NextFunction } from "express";
import { CatchAsyncErrors } from "./catchAsyncErros";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";

export const isAuthenticated = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.access_token;
    if (!access_token) {
      return next(
        new ErrorHandler(400, "Login first to access this resource.")
      );
    }
    const decoded = jwt.verify(
      access_token,
      process.env.ACCESS_TOKEN as string
    ) as JwtPayload;

    if (!decoded) {
      return next(new ErrorHandler(400, "access token invalid."));
    }

    const user = await redis.get(decoded.id);
    if (!user) {
      return next(new ErrorHandler(400, "User not found."));
    }

    req.user = JSON.parse(user);
    next();
  }
);

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role || "")) {
      return next(
        new ErrorHandler(
          403,
          `Role (${req.user?.role}) is not allowed to access this resource.`
        )
      );
    }
    next();
  };
};
