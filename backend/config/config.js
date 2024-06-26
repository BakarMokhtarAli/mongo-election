import dotenv from "dotenv";

dotenv.config();

export const dbURL = process.env.DATABASE_URL.replace(
  "<password>",
  process.env.DATABASE_PASSWORD
);
export const JWT_SECRET = process.env.JWT_SECRET;
export const SESSION_SECRET = process.env.SESSION_SECRET;

export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
