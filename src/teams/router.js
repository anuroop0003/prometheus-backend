import { Router } from "express";
import graphSubscriptionCreate from "./graph.subscription.create.js";

const teamsRouter = Router();

teamsRouter.post("/subscription/create", graphSubscriptionCreate);

export default teamsRouter;
