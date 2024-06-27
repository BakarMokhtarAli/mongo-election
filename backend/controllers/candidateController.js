import APIFeatures from "../utils/ApiFeatures.js";
import catchAsync from "../utils/catchAsync.js";
import Candidate from "../models/candidate.js";
import APPError from "../utils/APPError.js";
import { sendVerificationEmail } from "../utils/Email.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/config.js";
import Vote from "../models/votes.js";
import cloudinary from "../config/cloudinary.js";

export const getAllCandidates = catchAsync(async (req, res) => {
  const features = new APIFeatures(Candidate.find(), req.query)
    .filter()
    .limitingFields()
    .paginate();

  const candidates = await features.query.sort("-votes").populate({
    path: "all_votes",
    populate: {
      path: "voter",
      modal: "Voter", // refrence the voter modal
      select: "firstName lastName photo",
    },
  });
  res.status(200).json({
    result: candidates.length,
    status: "success",
    candidates,
  });
});

export const createCandidate = catchAsync(async (req, res, next) => {
  const existingCandidate = await Candidate.findOne({ email: req.body.email });

  if (existingCandidate) {
    return next(new APPError(`Email is already exist`, 409));
  }
  if (req.body.password !== req.body.passwordConfirm) {
    return next(new APPError("passwords do not match", 400));
  }
  const newCandidate = await Candidate.create(req.body);
  res.status(201).json({
    status: "success",
    message: "candidate created successfully!",
    candidate: newCandidate,
  });
});

export const signInCandidate = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new APPError("please provide a valid email and password"));
  }
  const isCandidateExist = await Candidate.findOne({ email }).select(
    "+password"
  );
  if (!isCandidateExist) {
    return next(new APPError(`Incorrect email`, 401));
  }
  if (!(await isCandidateExist.comparePassword(password))) {
    return next(new APPError(`Incorrect password`, 401));
  }

  // check if user still validated
  if (!isCandidateExist.isVerified) {
    // Generate a new verification code
    const verificationCode = crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();
    const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // Code valid for 10 minutes

    // Update user with new verification code
    isCandidateExist.verificationCode = verificationCode;
    isCandidateExist.verificationCodeExpires = verificationCodeExpires;
    await isCandidateExist.save();

    // Send verification code via email
    sendVerificationEmail(email, verificationCode);

    return res.status(401).json({
      status: "fail",
      message:
        "Your account is not yet varified. Another verification code has been sent to your email.",
    });
  }
  if (!isCandidateExist.active) {
    return next(
      new APPError(`your account is deactivated please contact the admin`, 404)
    );
  }
  const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days
  const token = jwt.sign({ id: isCandidateExist._id }, JWT_SECRET, {
    expiresIn,
  });
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    maxAge: expiresIn * 1000,
  });
  //   console.log(token);
  isCandidateExist.password = undefined;
  res.status(200).json({
    status: "success",
    message: "logged in success!",
    candidate: isCandidateExist,
    expiresIn,
  });
});

export const verifyCode = catchAsync(async (req, res, next) => {
  const { code, email } = req.body;
  // const email = req.session.email; // Get email from session

  if (!email) {
    return next(new APPError("Email is required", 400));
  }

  const candidate = await Candidate.findOne({ email });

  if (!candidate) {
    return next(new APPError("User not found", 404));
  }

  if (candidate.verificationCodeExpires < Date.now()) {
    return next(new APPError("Verification code has expired", 400));
  }

  if (candidate.verificationCode !== code) {
    return next(new APPError("Invalid verification code", 400));
  }

  candidate.isVerified = true;
  candidate.verificationCode = undefined;
  candidate.verificationCodeExpires = undefined;
  await candidate.save();

  res.status(200).json({
    status: "success",
    message: "Email verified successfully!",
  });
});

export const candidateProtect = catchAsync(async (req, res, next) => {
  const token = req.headers.cookie;
  if (!token) return next(new APPError("Access denied please login", 403));
  const splitToken = token.split("=")[1];
  if (!splitToken) return next(new APPError("Access denied please login", 403));
  const decoded = jwt.verify(splitToken, JWT_SECRET);
  //   check if user still exist
  const currentUser = await Candidate.findById(decoded.id);
  if (!currentUser) {
    return next(
      new APPError(`the user belonging this token does not exist`, 401)
    );
  }
  req.candidate = currentUser;
  next();
});

export const updatePassword = catchAsync(async (req, res, next) => {
  // console.log(req.candidate);
  const candidate = await Candidate.findById(req.candidate.id).select(
    "+password"
  );
  //2) check if POSTED current password is correct
  if (!(await candidate.comparePassword(req.body.passwordCurrent))) {
    return next(new APPError("your current passowrd is incorrect", 401));
  }
  //3) if so, update password
  if (req.body.password !== req.body.passwordConfirm) {
    return next(new APPError("Passwords do not match", 400));
  }
  candidate.password = req.body.password;
  // candidate.passwordConfirm = req.body.passwordConfirm;
  await candidate.save();
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

  if (req.file) {
    // check if user upload right image
    const imageUpload = req.file.mimetype.startsWith("image");
    if (!imageUpload) {
      return next(
        new APPError(`this is not image, please upload an image!`, 400)
      );
    }

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
  const updatedcandidate = await Candidate.findByIdAndUpdate(
    req.candidate.id,
    updatedFields,
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).json({
    status: "success",
    message: "updated success",
    // candidate: updatedcandidate,
  });
});

export const deleteMe = catchAsync(async (req, res, next) => {
  const candidate = await Candidate.findByIdAndUpdate(req.candidate.id, {
    active: false,
  });
  if (!candidate) {
    return next(new APPError(`candidate not found`, 404));
  }
  res.status(200).json({
    status: `success`,
    message: `candidate deactivated success`,
  });
});

export const getVotesOfCurrentCandidate = catchAsync(async (req, res, next) => {
  const candidateId = req.candidate.id;
  const votes = await Vote.find({ candidate: candidateId })
    .select("-candidate")
    .populate({
      path: "voter",
      select: `firstName lastName photo`,
    });
  if (votes.length === 0) {
    return next(new APPError(`you have not get votes yet!`, 400));
  }
  if (!votes) {
    return next(new APPError(`this candidate has not found`, 400));
  }
  res.status(200).json({
    result: votes?.length || 0,
    status: `success`,
    votes,
  });
});
