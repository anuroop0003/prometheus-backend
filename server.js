import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "url";
import connectDB from "./database/config/config.js";
import { executeRenewal, initCron } from "./src/cron/renew.subscriptions.js";
import teamsRouter from "./src/teams/router.js";
import userRouter from "./src/user/router.js";
import webhookRouter from "./src/webhooks/router.js";

dotenv.config();

const server = express();
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

server.get("/", (req, res) => {
  res.send("Prometheus Health Is Ok");
});

// Register routes
server.use("/webhook", webhookRouter);
server.use("/teams", teamsRouter);
server.use("/user", userRouter);

// Cron route for Vercel
server.get("/api/cron/renew", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await connectDB();
    const result = await executeRenewal();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const startServer = async () => {
  try {
    await connectDB();
    console.log("Database connected successfully");

    // Start cron if local
    initCron();

    server.listen(4000, "0.0.0.0", () => {
      console.log("Prometheus server is running on port 4000");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}

export default server;
