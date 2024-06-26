import mongoose from "mongoose";
import validator from "validator";
import Candidate from "./candidate.js";

const voteSchema = mongoose.Schema(
  {
    voter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voter",
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
    },
  },
  { timestamps: true }
);

// voteSchema.pre("save", async function (next) {
//   try {
//     // increment candidates vote count
//     await Candidate.findByIdAndUpdate(this.candidate, { $inc: { votes: 1 } });
//     next();
//   } catch (error) {
//     console.log(`error for incrementig votes`, error);
//   }
// });
voteSchema.post("remove", async function (doc) {
  try {
    // await Candidate.findByIdAndUpdate(doc.candidate, { $inc: { votes: -1 } });
    await Candidate.findByIdAndUpdate(doc.candidate, { $inc: { votes: -1 } });
  } catch (error) {
    console.log(`error for decrementig votes`, error);
  }
});
const Vote = mongoose.model("Vote", voteSchema);
export default Vote;
