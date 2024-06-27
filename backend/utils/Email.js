import transporter from "./transporter.js";

export const sendVerificationEmail = async (userEmail, verificationCode) => {
  const mailOptions = {
    from: `walaal pakar`,
    to: userEmail,
    subject: "Email Verification",
    html: `<p>Your verification code is: <b>${verificationCode}</b></p><p>This code will expire in 10 minutes.</p>`,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("verfication email sent");
  } catch (error) {
    console.log(`an error occured for sent the verification email ${error}`);
  }
};

export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetURL = `https://mongo-election.onrender.com/reset-password/${resetToken}`;
  //   const resetURL = `https://your-frontend-service.onrender.com/reset-password/${resetToken}`;

  const mailOptions = {
    to: user.email,
    from: process.env.EMAIL_USER,
    subject: "Password Reset",
    text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
             Please click on the following link, or paste this into your browser to complete the process:\n\n
             ${resetURL}\n\n
             If you did not request this, please ignore this email and your password will remain unchanged.\n`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Recovery email sent");
  } catch (err) {
    console.error("There was an error sending the email: ", err);
  }
};

export const sendVoteNotificationToCandidate = async (
  candidateEmail,
  voterName
) => {
  const mailOptions = {
    from: `walaal pakar`,
    to: candidateEmail,
    subject: "New Vote received",
    html: `Dear candidate, \n\nYou have received new vote from from ${voterName}. \n\nBest regards, \nElection App`,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("vote notification email sent");
  } catch (error) {
    console.log(`an error occured for sent the verification email ${error}`);
  }
};
export const sendVoteConfirmationToVoter = async (
  voterEmail,
  candidateName
) => {
  const mailOptions = {
    from: `walaal pakar`,
    to: voterEmail,
    subject: "Vote confirmation",
    html: `Dear Voter, \n\nThank you for voting for ${candidateName}. \n\nBest regards, \nElection App`,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("vote confirmation email sent");
  } catch (error) {
    console.log(
      `an error occured for sent the vote confirmation email ${error}`
    );
  }
};
export const sendVoteAlertToCandidate = async (candidateEmail, voterName) => {
  const mailOptions = {
    from: `walaal pakar`,
    to: candidateEmail,
    subject: "Vote alert",
    html: `Dear candidate, \n\nwe're sorry! the voter ${voterName} has deleted his vote or he vote and other candidate. \n\nBest regards, \nElection App`,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("vote alert email sent");
  } catch (error) {
    console.log(
      `an error occured for sent the vote aler verification email ${error}`
    );
  }
};
