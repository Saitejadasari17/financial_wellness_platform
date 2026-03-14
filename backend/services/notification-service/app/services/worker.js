const { sendEmail, sendSms } = require("./notifier");
const { queueName } = require("../config");

async function processJob(job) {
  if (job.type === "email") {
    await sendEmail({
      to: job.to,
      subject: job.subject || "Financial Wellness Alert",
      body: job.body || "",
    });
    return;
  }

  if (job.type === "sms") {
    await sendSms({
      to: job.to,
      body: job.body || "",
    });
    return;
  }

  if (job.type === "budget_alert") {
    const body = `Budget Alert: You spent INR ${job.spent} in ${job.category}. Limit is INR ${job.limit}.`;
    if (job.email) {
      await sendEmail({
        to: job.email,
        subject: `Budget Alert: ${job.category}`,
        body,
      });
    }
    if (job.phone) {
      await sendSms({ to: job.phone, body });
    }
    return;
  }

  console.log(`Unknown notification type: ${job.type}`);
}

async function startWorker(redisClient) {
  console.log(`Worker listening on Redis list: ${queueName}`);
  while (true) {
    try {
      const payload = await redisClient.brpop(queueName, 0);
      if (!payload || payload.length < 2) {
        continue;
      }
      const raw = payload[1];
      const job = JSON.parse(raw);
      await processJob(job);
    } catch (error) {
      console.error("Worker error:", error);
    }
  }
}

module.exports = { startWorker };
