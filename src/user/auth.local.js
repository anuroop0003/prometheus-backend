import login from "./lib/login.js";

export default async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and Password are required" });
        }

        const user = await login(email, password);

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Return the user (which acts as the session token in this simple model if using ID, 
        // or specifically the accessToken if they have one linked, but for local it's just the user profile)
        res.json({ message: "Login successful", user });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
