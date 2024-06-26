import express from "express";
import candidateRouter from "./routes/candidateRoutes.js";
import voterRouter from "./routes/voterRoutes.js";
import authRouter from "./routes/authRoutes.js";
import voteRouter from "./routes/voteRoutes.js";
import globalErrorHandlingMiddleware from "./controllers/errorController.js";
import APPError from "./utils/APPError.js";
import cors from "cors";

import { dbURL, SESSION_SECRET } from "./config/config.js";
import Vote from "./models/votes.js";
const app = express();
app.use(express.json());
app.use(cors);
// Session setup
// app.use(
//   session({
//     secret: SESSION_SECRET, // Replace with a strong secret key
//     resave: false,
//     saveUninitialized: true,
//     store: MongoStore.create({
//       mongoUrl: dbURL, // Replace with your MongoDB connection string
//     }),
//     cookie: { maxAge: 180 * 60 * 1000 }, // Session expiration time in milliseconds
//   })
// );

app.use("/api/v1/candidates", candidateRouter);
app.use("/api/v1/voters", voterRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/vote", voteRouter);
app.get("/test-error", (req, res, next) => {
  next(new APPError("Test error message", 403));
});
app.use("*", (req, res, next) => {
  const message = `Can't find this ${req.originalUrl} url on this server!`;
  next(new APPError(message, 404));
});
app.use(globalErrorHandlingMiddleware);
export default app;
