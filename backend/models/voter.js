import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import crypto from "crypto";
const voterSchema = mongoose.Schema(
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
    role: {
      type: String,
      default: "voter",
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

// voterSchema.pre(/^find/, function (next) {
//   this.find({ active: { $eq: true } });
//   next();
// });

voterSchema.virtual("FullName").get(function () {
  return this.firstName + " " + this.lastName;
});
voterSchema.set("toJSON", { virtuals: true });
voterSchema.set("toObject", { virtuals: true });

voterSchema.virtual("vote", {
  ref: "Vote",
  foreignField: "voter", // this is the name of the field in the other model. for now author in posts
  localField: "_id",
});
voterSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

voterSchema.methods.comparePassword = async function (pass) {
  return await bcrypt.compare(pass, this.password);
};

voterSchema.methods.createResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  console.log({ resetToken }, this.passwordResetToken);

  return resetToken;
};

const Voter = mongoose.model("Voter", voterSchema);
export default Voter;
