import dotenv from "dotenv";
import express from "express";
import connectDB from "./database/config/config.js";
import teamsRouter from "./src/teams/router.js";
import userRouter from "./src/user/router.js";
import webhookRouter from "./src/webhooks/router.js";
import "./src/cron/renew.subscriptions.js";

dotenv.config();

const server = express();
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

server.get("/", (req, res) => {
  res.send("Prometheus Health Is Ok");
});

const startServer = async () => {
  try {
    await connectDB();
    console.log("Database connected successfully");

    server.use("/webhook", webhookRouter);
    server.use("/teams", teamsRouter);
    server.use("/user", userRouter);

    server.listen(4000, "0.0.0.0", () => {
      console.log("Prometheus server is running on port 4000");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
