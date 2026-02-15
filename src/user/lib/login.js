import User from "../../../database/model/user.js";

export default async (email, password) => {
  const user = await User.findOne({ email, password });
  return user;
};
