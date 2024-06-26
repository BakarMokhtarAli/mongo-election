import Vote from "../models/votes.js";
import catchAsync from "../utils/catchAsync.js";
import APPError from "../utils/APPError.js";
import Candidate from "../models/candidate.js";
import Voter from "../models/voter.js";
import {
  sendVoteNotificationToCandidate,
  sendVoteConfirmationToVoter,
  sendVoteAlertToCandidate,
} from "../utils/Email.js";

export const vote = catchAsync(async (req, res, next) => {
  const voterId = req.voter;

  // check if user has already voted
  const existingVote = await Vote.findOne({ voter: voterId });
  if (existingVote) {
    return next(new APPError(`you have already voted`, 400));
  }
  // check if candidate still exist
  const existingCandidate = await Candidate.findById(req.params.id);
  if (!existingCandidate) {
    return next(new APPError(`candidate is not found`, 404));
  }
  // check if candiate is active: true
  if (!existingCandidate.active) {
    return next(new APPError(`this candidate is deactivated`, 404));
  }

  // check if the voter is admin or not!
  const isAdmin = await Voter.findById(voterId);
  if (isAdmin.role === "admin") {
    return next(new APPError(`you are an admin you can't vote`, 401));
  }
  await Candidate.findByIdAndUpdate(existingCandidate._id, {
    $inc: { votes: 1 },
  });

  // send the email to voter and candidate
  sendVoteNotificationToCandidate(
    existingCandidate.email,
    `${req.voter.firstName} ${req.voter.lastName}`
  );
  sendVoteConfirmationToVoter(
    req.voter.email,
    `${existingCandidate.firstName} ${existingCandidate.lastName}`
  );
  // create new vote
  const newVote = new Vote({
    voter: voterId,
    candidate: req.params.id,
  });
  await newVote.save();
  res.status(201).json({
    status: "success",
    message: "your vote have been accepted!",
  });
});

export const updateVote = catchAsync(async (req, res, next) => {
  const voterId = req.voter.id; // Assuming req.voter contains the authenticated voter
  const newCandidateId = req.params.id; // Assuming the new candidate ID is sent in the request body

  // Find the existing vote by the voter
  const existingVote = await Vote.findOne({ voter: voterId });
  if (!existingVote) {
    return next(new APPError("You have not voted yet!", 400));
  }
  //check new candidate and exist one have same id inthe paramas
  if (existingVote.candidate == newCandidateId) {
    return next(new APPError(`you have already voted this candidate`, 400));
  }

  // Decrement the vote count of the old candidate
  await Candidate.findByIdAndUpdate(existingVote.candidate, {
    $inc: { votes: -1 },
  });

  // find existing candidate to send the vote alert email
  const existingCandidate = await Candidate.findById(existingVote.candidate);

  // Update the vote document with the new candidate
  existingVote.candidate = newCandidateId;
  await existingVote.save({ validateBeforeSave: false }); // Save without running the pre-save hook

  // Increment the vote count of the new candidate
  await Candidate.findByIdAndUpdate(newCandidateId, { $inc: { votes: 1 } });

  // sending the vote alert email to existing candidate
  const candidateEmail = await Candidate.findById(req.params.id);

  sendVoteAlertToCandidate(
    existingCandidate.email,
    `${req.voter.firstName} ${req.voter.lastName}`
  );

  // send vote notification email to new upadated candidate
  sendVoteNotificationToCandidate(
    candidateEmail.email,
    `${req.voter.firstName} ${req.voter.lastName}`
  );
  res.status(200).json({
    status: "success",
    message: "Your vote has been updated successfully",
    vote: existingVote,
  });
});

export const deleteVote = catchAsync(async (req, res, next) => {
  const voterId = req.voter.id;
  // Find the existing vote by the voter
  const existingVote = await Vote.findOne({ voter: voterId });
  if (!existingVote) {
    return next(new APPError("You have not voted yet!", 400));
  }

  // Decrement the vote count of the candidate
  await Candidate.findByIdAndUpdate(existingVote.candidate, {
    $inc: { votes: -1 },
  });

  const candidateEmail = await Candidate.findById(existingVote.candidate);
  // console.log(candidateEmail);
  sendVoteAlertToCandidate(
    candidateEmail.email,
    `${req.voter.firstName} ${req.voter.lastName}`
  );
  // Delete the vote document
  await Vote.findByIdAndDelete(existingVote._id);
  res.status(200).json({
    status: "success",
    message: "vote deleted success",
  });
});

export const getAllVotes = catchAsync(async (req, res, next) => {
  const votes = await Vote.find()
    .populate({
      path: "voter",
      select: "firstName lastName photo",
    })
    .populate({
      path: "candidate",
      select: "firstName lastName photo",
    })
    .sort("-createdAt");
  res.status(200).json({
    result: votes?.length || 0,
    status: "success",
    votes,
  });
});

export const getCandidateVotes = catchAsync(async (req, res, next) => {
  const votes = await Vote.find({ candidate: req.params.id })
    .select("-candidate")
    .populate({
      path: "voter",
      select: `firstName lastName photo`,
    });
  if (votes.length === 0) {
    return next(new APPError(`this candidate has not get votes yet!`, 400));
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
