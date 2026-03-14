const express = require("express");
const Redis = require("ioredis");
const { port, redisUrl, queueName } = require("./config");
const { startWorker } = require("./services/worker");

const app = express();
app.use(express.json());

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on("connect", () => {
  console.log("Connected to Redis");
});

redis.on("error", (error) => {
  console.error("Redis error:", error);
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/api/v1/notifications/enqueue", async (req, res) => {
  try {
    await redis.lpush(queueName, JSON.stringify(req.body || {}));
    return res.status(202).json({ success: true });
  } catch (error) {
    console.error("Enqueue error:", error);
    return res.status(500).json({ error: "Failed to enqueue notification" });
  }
});

app.listen(port, () => {
  console.log(`Notification service running on port ${port}`);
  startWorker(redis).catch((error) => {
    console.error("Worker crashed:", error);
  });
});
