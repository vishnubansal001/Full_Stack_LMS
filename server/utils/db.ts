import mongoose from "mongoose";
require("dotenv").config();

const dbUri: string = process.env.DB_URL || "";

const connectDB = async () => {
  try {
    await mongoose.connect(dbUri).then((data: any) => {
      console.log(`MongoDB Connected: ${data.connection.host}`);
    });
  } catch (error: any) {
    console.log(error.message);
    setTimeout(connectDB, 5000);
  }
};

export default connectDB;