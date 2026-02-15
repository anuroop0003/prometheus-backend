import User from "../../database/model/user.js";

export default async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ message: "Name, Email and Password are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "User already exists" });
        }

        const user = await User.create({
            name,
            email,
            password, // Note: In production, hash this password!
        });

        // Don't return the password
        user.password = undefined;

        res.status(201).json({ message: "User created successfully", user });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
