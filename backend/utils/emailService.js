const nodemailer = require("nodemailer");

let transporter;

const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  const port = Number(SMTP_PORT);

  if (!SMTP_HOST || !Number.isInteger(port) || port < 1 || !SMTP_USER || !SMTP_PASS) {
    const error = new Error("Email delivery is not configured. Set the SMTP environment variables.");
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }

  return transporter;
};

const sendOtpEmail = ({ to, otp, expiresInMinutes }) =>
  getTransporter().sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: "Your student voting verification code",
    text: `Your verification code is ${otp}. It expires in ${expiresInMinutes} minute(s). If you did not request this code, ignore this email.`,
  });

module.exports = { sendOtpEmail };