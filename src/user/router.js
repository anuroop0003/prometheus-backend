import { Router } from "express";
import azureLogin from "./auth.azure.js";
import azureCallback from "./callback.js";
import localLogin from "./auth.local.js";
import localSignup from "./signup.js";

const userRouter = Router();

// Azure AD Auth
userRouter.get("/auth/url", azureLogin);
userRouter.get("/auth/callback", azureCallback);

// Local Auth
userRouter.post("/login", localLogin);
userRouter.post("/signup", localSignup);

export default userRouter; 
