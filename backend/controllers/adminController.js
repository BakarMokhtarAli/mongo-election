import Vote from "../models/votes.js";
import catchAsync from "../utils/catchAsync.js";
import APPError from "../utils/APPError.js";
import Candidate from "../models/candidate.js";
import Voter from "../models/voter.js";
import APIFeatures from "../utils/ApiFeatures.js";

export const getAllDeActiveAccounts = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Voter.find({ role: { $eq: "voter" }, active: { $ne: true } }),
    req.query
  )
    .filter()
    .limitingFields()
    .sort()
    .paginate();
  const voters = await features.query.populate({
    path: "vote",
    select: "candidate -voter",
  });
  if (voters.length === 0) {
    return next(new APPError(`there is no deactivated voters`, 404));
  }
  res.status(200).json({
    result: voters.length,
    status: "success",
    voters,
  });
});

export const deactivateAccount = catchAsync(async (req, res, next) => {
  const activateVoter = await Voter.findByIdAndUpdate(req.params.id, {
    active: false,
  });
  // console.log(deactivatedVoter);
  if (!activateVoter.active) {
    return next(
      new APPError(`sorry! this account is already deactivated`, 400)
    );
  }
  res.status(200).json({
    status: "success",
    message: `voter is deactivated successfully`,
  });
});
export const activateAccount = catchAsync(async (req, res, next) => {
  const deactivatedVoter = await Voter.findByIdAndUpdate(req.params.id, {
    active: true,
  });
  //   console.log(deactivatedVoter);
  if (deactivatedVoter.active) {
    return next(new APPError(`sorry! this account is already active`, 400));
  }
  res.status(200).json({
    status: "success",
    message: `voter is now active`,
  });
});

export const deleteVoter = catchAsync(async (req, res, next) => {
  const voterId = req.params.id;
  // Find all votes by the voter
  const votes = await Vote.find({ voter: voterId });

  // Decrement the candidate's vote count for each vote and delete the votes
  for (const vote of votes) {
    await Candidate.findByIdAndUpdate(vote.candidate, { $inc: { votes: -1 } });
    await Vote.findByIdAndDelete(vote._id);
  }

  const deletedVoter = await Voter.findByIdAndDelete(voterId);
  //   console.log(deletedVoter);
  if (!deletedVoter) {
    return next(new APPError(`sorry! this account is not exist`, 404));
  }

  res.status(200).json({
    status: "success",
    message: `voter is deleted succesfully`,
  });
});
export const deleteCandidate = catchAsync(async (req, res, next) => {
  // delete all votes for the candidate
  await Vote.deleteMany({ candidate: req.params.id });

  const deletedCandidate = await Candidate.findByIdAndDelete(req.params.id);
  //   console.log(deletedVoter);
  if (!deletedCandidate) {
    return next(new APPError(`sorry! this candidate is not exist`, 404));
  }
  res.status(200).json({
    status: "success",
    message: `candidate is deleted succesfully`,
  });
});

export const updatedCandidatePassword = catchAsync(async (req, res, next) => {
  if (req.body.password !== req.body.passwordConfirm) {
    return next(new APPError("passwords do not match", 400));
  }
  // Find the candidate by ID
  const candidate = await Candidate.findById(req.params.id);

  if (!candidate) {
    return next(new APPError("Candidate for this ID is not found", 404));
  }

  // Update the password
  candidate.password = req.body.password;
  await candidate.save();
  res.status(200).json({
    status: "success",
    message: "password changed successfully",
  });
});
