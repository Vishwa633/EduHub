import jwt from 'jsonwebtoken';
import User from "../models/User.js";

const protectRoute = async (req, res, next) => {
    try {
        //get token
        const authHeader = req.header("Authorization");
        
        if (!authHeader) {
            return res.status(401).json({ message: "No token, authorization denied" });
        }
        
        const token = authHeader.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ message: "No token, authorization denied" });
        }

        //verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            console.error("JWT verification error:", jwtError.message);
            return res.status(401).json({ message: "Invalid or expired token", error: jwtError.message });
        }

        //find user
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            console.error("User not found for token userId:", decoded.userId);
            return res.status(401).json({ message: "User not found. Please login again" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        res.status(500).json({ message: "Server error during authentication" });
    }
};

export default protectRoute;