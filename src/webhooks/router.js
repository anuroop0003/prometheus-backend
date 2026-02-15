import { Router } from "express";
import outLookWebhook from "./outlook.webhook.js";
import teamsWebhook from "./teams.webhook.js";
import teamsChannelsWebhook from "./teams-channels.webhook.js";

const webhookRouter = Router();

webhookRouter.post("/outlook", outLookWebhook);
webhookRouter.post("/teams", teamsWebhook);
webhookRouter.post("/teams-channels", teamsChannelsWebhook);

export default webhookRouter;
