require("dotenv").config();

module.exports = {
  port: Number(process.env.PORT || 8003),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  queueName: process.env.NOTIFICATION_QUEUE || "notification_queue",
  senderEmail: process.env.SENDER_EMAIL || "no-reply@financialwellness.local",
};
