import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";

const candidateSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "first name is required"],
    },
    lastName: {
      type: String,
      required: [true, "last name is required"],
    },
    email: {
      type: String,
      required: [true, "email is required"],
      validate: [validator.isEmail, "please provide a valid emali address"],
      lowercase: true,
    },
    votes: {
      type: Number,
      default: 0,
    },
    password: {
      type: String,
      required: [true, "password is required"],
      select: false,
    },
    photo: {
      type: String,
      default:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSDvb0w_KsktUynzqLWBnQDqXRq-5um4KAtXA&s",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    verificationCode: String,
    verificationCodeExpires: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true }
);

candidateSchema.virtual("FullName").get(function () {
  return this.firstName + " " + this.lastName;
});

candidateSchema.virtual("all_votes", {
  ref: "Vote", // the model name
  foreignField: "candidate", // this is the name of the field in the other model. for now author in posts
  localField: "_id",
});

candidateSchema.set("toJSON", { virtuals: true });
candidateSchema.set("toObject", { virtuals: true });

candidateSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

candidateSchema.methods.comparePassword = async function (pass) {
  return await bcrypt.compare(pass, this.password);
};

const Candidate = mongoose.model("Candidate", candidateSchema);
export default Candidate;
