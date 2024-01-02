require("dotenv").config();
import User, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { Request, Response, NextFunction } from "express";
import { CatchAsyncErrors } from "../middleware/catchAsyncErros";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import { sendMail } from "../utils/sendMail";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";
import { redis } from "../utils/redis";
import {
  getAllUsersService,
  getUserById,
  updateUserRoleService,
} from "../services/user.service";
import cloudinary from "cloudinary";

interface IRegisterationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export const registerationUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      const isEmailExist = await User.findOne({ email });

      if (isEmailExist) {
        return next(new ErrorHandler(400, "Email already exists"));
      }

      const user: IRegisterationBody = {
        name,
        email,
        password,
      };

      const activationToken = createActivationToken(user);
      const activationCode = activationToken.activationCode;
      const data = { user: { name: user.name }, activationCode };
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data
      );
      try {
        await sendMail({
          email: user.email,
          subject: "Account Activation",
          template: "activation-mail.ejs",
          data,
        });

        console.log(data);

        res.status(200).json({
          success: true,
          message: `Activation code sent to ${user.email}`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(400, error.message));
      }
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationToken = (payload: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    {
      data: payload,
    },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "5m",
    }
  );

  return { token, activationCode };
};

interface IActivationRequest {
  activation_code: string;
  activation_token: string;
}

export const activateUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_code, activation_token } =
        req.body as IActivationRequest;

      if (!activation_code || !activation_token) {
        return next(new ErrorHandler(400, "Invalid activation token"));
      }

      const newUser: { user: IUser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as Secret
      ) as { user: IUser; activationCode: string };

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler(400, "Invalid activation code"));
      }

      const { name, email, password } = newUser.user;
      const existUser = await User.findOne({ email });
      if (existUser) {
        return next(new ErrorHandler(400, "Email already exists"));
      }

      const user = await User.create({
        name,
        email,
        password,
      });

      res.status(200).json({
        success: true,
        // message: "Account activated successfully",
        // user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;
      if (!email || !password) {
        return next(new ErrorHandler(400, "Please enter email and password"));
      }

      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        return next(new ErrorHandler(400, "Invalid email or password"));
      }

      const isPasswordMatched = await user.comparePassword(password);
      if (!isPasswordMatched) {
        return next(new ErrorHandler(400, "Invalid email or password"));
      }

      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

export const logoutUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_token", "", {
        maxAge: 1,
      });

      res.cookie("refresh_token", "", {
        maxAge: 1,
      });

      const userId = req.user?._id || "";
      await redis.del(userId);

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

export const updateAccessToken = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refresh_token as string;
      // if (!refresh_token) {
      //   return next(new ErrorHandler(400, "Please login to continue"));
      // }

      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;

      const message = "Could not find user";
      if (!decoded) {
        return next(new ErrorHandler(400, message));
      }

      const session = await redis.get(decoded.id as string);
      if (!session) {
        return next(new ErrorHandler(400, message));
      }

      const user = JSON.parse(session);
      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        { expiresIn: "5m" }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        { expiresIn: "3d" }
      );

      req.user = user;

      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);

      res.status(200).json({
        success: "success",
        accessToken,
      });
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

export const getUserInfo = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user?._id;
      getUserById(user as string, res);
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

interface ISocialAuthBody {
  email: string;
  name: string;
  avatar: string;
}

export const socialAuth = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, avatar } = req.body as ISocialAuthBody;
      const user = await User.findOne({ email });
      if (!user) {
        const newUser = await User.create({
          name,
          email,
          avatar,
        });
        sendToken(newUser, 200, res);
      } else {
        sendToken(user, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

interface IUpdateUserInfo {
  name?: string;
  email?: string;
}

export const updateUserInfo = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email } = req.body as IUpdateUserInfo;
      const userId = req.user?._id;
      const user = await User.findById(userId);

      if (email && user) {
        const isEmailExist = await User.findOne({ email });
        if (isEmailExist) {
          return next(new ErrorHandler(400, "Email already exists"));
        }

        user.email = email;
      }

      if (name && user) {
        user.name = name;
      }

      await user?.save();
      await redis.set(userId, JSON.stringify(user));

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

export const updatePassword = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdatePassword;

      if (!oldPassword || !newPassword) {
        return next(new ErrorHandler(400, "Please enter old and new password"));
      }
      const user = await User.findById(req.user?._id).select("+password");

      if (user?.password === undefined) {
        return next(new ErrorHandler(400, "User not found"));
      }

      const isPasswordMatched = await user?.comparePassword(oldPassword);
      if (!isPasswordMatched) {
        return next(new ErrorHandler(400, "Invalid password"));
      }

      user.password = newPassword;
      await user.save();
      await redis.set(req.user?._id, JSON.stringify(user));

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

interface IUpdateProfilePicture {
  avatar: string;
}

export const updateProfilePicture = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body;
      const userId = req.user?._id;
      const user = await User.findById(userId);
      if (avatar && user) {
        if (user?.avatar?.public_id) {
          await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        } else {
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        }
      }

      user?.save();
      await redis.set(userId, JSON.stringify(user));

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

export const getAllUsers = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllUsersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

export const updateUserRole = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, role } = req.body;
      updateUserRoleService(res, id, role);
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);

export const deleteUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id);

      if (!user) {
        return next(new ErrorHandler(400, "User not found"));
      }

      await user.deleteOne();

      await redis.del(id);

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(400, error.message));
    }
  }
);
