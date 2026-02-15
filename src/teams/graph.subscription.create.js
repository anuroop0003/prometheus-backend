import subCreate from "./lib/sub.create.js";
import User from "../../database/model/user.js";

export default async (req, res) => {
  try {
    // In a real app, get user from session or auth middleware.
    // For this MVP backend, we'll expect an email 
    const { email } = req.body;
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else {
      return res.status(401).json({ message: "Email is required" });
    }

    if (!user || !user.accessToken) {
      return res.status(401).json({ message: "User not authenticated or found" });
    }

    const subscription = await subCreate(user.accessToken, user._id);
    return res.json(subscription);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};
