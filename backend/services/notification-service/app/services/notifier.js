const nodemailer = require("nodemailer");
const { senderEmail } = require("../config");

const transporter = nodemailer.createTransport({
  streamTransport: true,
  newline: "unix",
  buffer: true,
});

async function sendEmail({ to, subject, body }) {
  const message = {
    from: senderEmail,
    to,
    subject,
    text: body,
  };
  const info = await transporter.sendMail(message);
  console.log(`Email queued to ${to}. bytes=${info.message.length}`);
}

async function sendSms({ to, body }) {
  console.log(`SMS queued to ${to}: ${body}`);
}

module.exports = {
  sendEmail,
  sendSms,
};
