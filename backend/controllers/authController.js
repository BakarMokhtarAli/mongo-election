// import APIFeatures from "../utils/ApiFeatures.js";
import APPError from "../utils/APPError.js";
import catchAsync from "../utils/catchAsync.js";
import Voter from "../models/voter.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/config.js";
import crypto from "crypto";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../utils/Email.js";
import cloudinary from "../config/cloudinary.js";

export const signUp = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password, passwordConfirm } = req.body;
  if (!passwordConfirm) {
    return next(new APPError("please confirm your password", 400));
  }
  if (password !== passwordConfirm) {
    return next(new APPError("Passwords do not match", 400));
  }
  const existingVoter = await Voter.findOne({ email });
  if (existingVoter) {
    return next(new APPError(`Email is already exist`, 409));
  }

  let result;

  // check if user upload right image
  const imageUpload = req.file.mimetype.startsWith("image");
  if (!imageUpload) {
    return next(
      new APPError(`this is not image, please upload an image!`, 400)
    );
  }

  if (req.file) {
    let encodedImage = `data:image/jpeg;base64,${req.file.buffer.toString(
      "base64"
    )}`;

    result = await cloudinary.uploader.upload(encodedImage, {
      resource_type: "image",
      transformation: [
        { width: 500, height: 500, crop: "crop", gravity: "face:center" },
      ],
      encoding: "base64",
    });
  }

  // Generate a verification code
  const verificationCode = crypto.randomBytes(3).toString("hex").toUpperCase();
  const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // Code valid for 10 minutes

  const voter = await Voter.create({
    firstName,
    lastName,
    email,
    password,
    photo: result?.url,
    verificationCode,
    verificationCodeExpires,
  });
  try {
    await sendVerificationEmail(email, verificationCode);
    res.status(200).json({
      status: "success",
      email,
      message:
        "voter created successfully! Please check your email to verify your account!",
    });
  } catch (err) {
    console.error("Error sending email: ", err);
    voter.passwordResetExpires = undefined;
    voter.passwordResetExpires = undefined;
    await voter.save({ validateBeforeSave: false });
    return next(
      new APPError(
        "there is an error for sending email, please try again later",
        500
      )
    );
  }
  // store email in the session
  // req.session.email = email;
});

export const verifyCode = catchAsync(async (req, res, next) => {
  const { code, email } = req.body;
  // const email = req.session.email; // Get email from session

  if (!email) {
    return next(new APPError("Email is required", 400));
  }

  const voter = await Voter.findOne({ email });

  if (!voter) {
    return next(new APPError("User not found", 404));
  }

  if (voter.verificationCodeExpires < Date.now()) {
    return next(new APPError("Verification code has expired", 400));
  }

  if (voter.verificationCode !== code) {
    return next(new APPError("Invalid verification code", 400));
  }

  voter.isVerified = true;
  voter.verificationCode = undefined;
  voter.verificationCodeExpires = undefined;
  await voter.save();

  // Clear the email from the session
  // req.session.email = null;

  res.status(200).json({
    status: "success",
    message: "Email verified successfully!",
  });
});

export const signIn = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new APPError("please provide a valid email and password"));
  }
  const isVoterExist = await Voter.findOne({ email }).select("+password");
  if (!isVoterExist || !(await isVoterExist.comparePassword(password))) {
    return next(new APPError(`Incorrect email or password`, 401));
  }

  // check if user still validated
  if (!isVoterExist.isVerified) {
    // Generate a new verification code
    const verificationCode = crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();
    const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // Code valid for 10 minutes

    // Update user with new verification code
    isVoterExist.verificationCode = verificationCode;
    isVoterExist.verificationCodeExpires = verificationCodeExpires;
    await isVoterExist.save();

    // Send verification code via email
    sendVerificationEmail(email, verificationCode);

    return res.status(401).json({
      status: "error",
      message:
        "Your account is not yet validated. Another verification code has been sent to your email.",
    });
  }
  if (!isVoterExist.active) {
    return next(
      new APPError(
        `your account is deactivated please contact the admin, or create another account`,
        404
      )
    );
  }
  const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days
  const token = jwt.sign({ id: isVoterExist._id }, JWT_SECRET, {
    expiresIn,
  });
  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    maxAge: expiresIn * 1000,
  });
  //   console.log(token);
  isVoterExist.password = undefined;
  res.status(200).json({
    status: "success",
    message: "logged in success!",
    voter: isVoterExist,
    expiresIn,
  });
});

export const protect = catchAsync(async (req, res, next) => {
  const token = req.headers.cookie;
  if (!token) return next(new APPError("Access denied please login", 403));
  const splitToken = token.split("=")[1];
  if (!splitToken) return next(new APPError("Access denied please login", 403));
  const decoded = jwt.verify(splitToken, JWT_SECRET);
  //   check if user still exist
  const currentUser = await Voter.findById(decoded.id);
  if (!currentUser) {
    return next(
      new APPError(`the user belonging this token does not exist`, 401)
    );
  }
  req.voter = currentUser;
  next();
});

export const restricTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.voter.role)) {
      return next(
        new APPError(`you don't have permission to perform this action`, 403)
      );
    }
    next();
  };
};

export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const voter = await Voter.findOne({ email });
  if (!voter) {
    return res.status(404).send("User not found");
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  voter.passwordResetToken = resetToken;
  voter.passwordResetExpires = Date.now() + 10 * 60 * 1000; // Token valid for 10 minutes
  await voter.save();

  try {
    await sendPasswordResetEmail(voter, resetToken);
    res.status(200).json({
      status: "success",
      message: "please go to your email to reset your password",
    });
  } catch (err) {
    console.error("Error sending email: ", err);
    voter.passwordResetExpires = undefined;
    voter.passwordResetExpires = undefined;
    await voter.save({ validateBeforeSave: false });
    return next(
      new APPError(
        "there is an error for sending email, please try again later",
        500
      )
    );
  }
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const resetToken = req.params.token;
  // console.log("Received token", resetToken);
  //get user based on reset token reset token
  const voter = await Voter.findOne({
    passwordResetToken: resetToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // console.log("voter", voter);
  if (!voter) {
    return next(
      new APPError("Password reset token is invalid or has expired", 400)
    );
  }
  const { password, passwordConfirm } = req.body;
  if (password !== passwordConfirm) {
    return next(new APPError("Passwords do not match", 400));
  }
  voter.password = req.body.password;
  voter.passwordConfirm = req.body.passwordConfirm;
  voter.passwordResetToken = undefined;
  voter.passwordResetExpires = undefined;
  await voter.save();

  res.status(200).json({
    status: "success",
    message: "your password has been changes successfulyy",
  });
});

export const updatePassword = catchAsync(async (req, res, next) => {
  console.log(req.voter);
  const voter = await Voter.findById(req.voter.id).select("+password");
  //2) check if POSTED current password is correct
  if (!(await voter.comparePassword(req.body.passwordCurrent))) {
    return next(new APPError("your current passowrd is incorrect", 401));
  }
  //3) if so, update password
  if (req.body.password !== req.body.passwordConfirm) {
    return next(new APPError("Passwords do not match", 400));
  }
  voter.password = req.body.password;
  // voter.passwordConfirm = req.body.passwordConfirm;
  await voter.save();
  res.status(200).json({
    status: "success",
    message: "password changed successfully",
  });
});

export const updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new APPError("this rout is not allowed for password update", 400)
    );
  }
  let updatedFields = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
  };

  // check if user upload right image
  const imageUpload = req.file.mimetype.startsWith("image");
  if (!imageUpload) {
    return next(
      new APPError(`this is not image, please upload an image!`, 400)
    );
  }

  if (req.file) {
    let encodedImage = `data:image/jpeg;base64,${req.file.buffer.toString(
      "base64"
    )}`;
    const result = await cloudinary.uploader.upload(encodedImage, {
      resource_type: "image",
      transformation: [
        { width: 500, height: 500, crop: "fill", gravity: "face:center" },
      ],
      encoding: "base64",
    });
    updatedFields.photo = result.url;
  }

  // update user document
  const updatedVoter = await Voter.findByIdAndUpdate(
    req.voter.id,
    updatedFields,
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).json({
    status: "success",
    message: "updated success",
    data: {
      user: updatedVoter,
    },
  });
});

export const deleteMe = catchAsync(async (req, res, next) => {
  const voter = await Voter.findByIdAndUpdate(req.voter.id, { active: false });
  if (!voter) {
    return next(new APPError(`voter not found`, 404));
  }
  res.status(200).json({
    status: `success`,
    message: `voter deactivated success`,
  });
});
