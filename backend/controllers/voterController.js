import APIFeatures from "../utils/ApiFeatures.js";
import catchAsync from "../utils/catchAsync.js";
import APPError from "../utils/APPError.js";
import Voter from "../models/voter.js";
import { sendVerificationEmail } from "../utils/Email.js";
import crypto from "crypto";

export const getAllVoters = catchAsync(async (req, res) => {
  const features = new APIFeatures(
    Voter.find({ role: { $eq: "voter" }, active: { $eq: true } }),
    req.query
  )
    .filter()
    .limitingFields()
    .sort()
    .paginate();
  const voters = await features.query.populate({
    path: "vote",
    populate: {
      path: "candidate",
      modal: "Candidate",
      select: "firstName lastName photo",
    },
  });
  res.status(200).json({
    result: voters.length,
    status: "success",
    voters,
  });
});

export const getOneVoter = catchAsync(async (req, res, next) => {
  const voter = await Voter.findById(req.params.id);
  if (!voter) return next(new APPError("user not found", 404));
  res.status(200).json({
    status: "success",
    voter,
  });
});

export const getAdmin = catchAsync(async (req, res, next) => {
  const admin = await Voter.findOne({
    role: "admin",
    _id: req.params.id,
  });
  // console.log("admin", admin);
  res.status(200).json({
    status: `success`,
    admin,
  });
});

export const createVoter = catchAsync(async (req, res, next) => {
  const existingVoter = await Voter.findOne({ email: req.body.email });

  if (existingVoter) {
    return next(new APPError(`Email is already exist`, 409));
  }
  const newVoter = await Voter.create(req.body);
  res.status(201).json({
    status: "success",
    message: "voter created successfully!",
    voter: newVoter,
  });
});

export const createAdmin = catchAsync(async (req, res, next) => {
  const role = "admin";
  const { firstName, lastName, email, password, passwordConfirm } = req.body;
  const existingVoter = await Voter.findOne({ email });

  if (password !== passwordConfirm) {
    return next(new APPError("passwords do not match", 400));
  }

  if (existingVoter) {
    return next(new APPError(`Email is already exist`, 409));
  }
  // Generate a verification code
  const verificationCode = crypto.randomBytes(3).toString("hex").toUpperCase();
  const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // Code valid for 10 minutes

  const voter = await Voter.create({
    firstName,
    lastName,
    email,
    role,
    password,
    verificationCode,
    verificationCodeExpires,
  });
  try {
    await sendVerificationEmail(email, verificationCode);
    res.status(200).json({
      status: "success",
      email,
      message:
        "admin created successfully! Please check your email to verify your account!",
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

export const getAllAdmins = catchAsync(async (req, res, next) => {
  const admin = await Voter.find({ role: "admin" });
  if (!admin) {
    return next(new APPError("there is no admin", 404));
  }
  res.status(200).json({
    status: `success`,
    results: admin.length || 0,
    admin,
  });
});

export const updateVoter = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new APPError("this rout is not allowed for password update", 400)
    );
  }
  const updatedVoter = await Voter.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!updatedVoter) {
    return next(new APPError("user for this id is not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: `voter updated success`,
    voter: updatedVoter,
  });
});

export const updatedVoterPassword = catchAsync(async (req, res, next) => {
  if (req.body.password !== req.body.passwordConfirm) {
    return next(new APPError("passwords do not match", 400));
  }
  const updatedPassword = await Voter.findByIdAndUpdate(
    req.params.id,
    req.body.password,
    { new: true, runValidators: true }
  );
  if (!updatedPassword) {
    return next(new APPError("user for this id is not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "password changed successfully",
  });
});

export const deleteVoter = catchAsync(async (req, res, next) => {
  const voter = await Voter.findByIdAndDelete(req.params.id);
  if (!voter) {
    return next(new APPError("voter is not found", 404));
  }
  // if (req.user._id != req.params.id) {
  //   return next(new APPError("you are not enable to delete this user", 403));
  // }
  res.status(200).json({
    status: "success",
    message: "voter deleted success",
  });
});
