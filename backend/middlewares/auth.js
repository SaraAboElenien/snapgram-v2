import userModel from '../db/models/user.model.js';
import jwt from 'jsonwebtoken';

export const auth = (role = []) => {
    return async (req, res, next) => {
        try {

            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(400).json({ message: "Token not found or invalid format!" });
            }

            const token = authHeader.split(" ")[1];

            const decoded = jwt.verify(token, process.env.sessionKey);

            if (!decoded?.id) {
                return res.status(400).json({ message: "Invalid payload!" });
            }

            const user = await userModel.findById(decoded.id);

            if (!user) {
                return res.status(400).json({ message: "User not found!" });
            }

            // Both checks below mean "this token is no longer a valid credential"
            // (not "you're authenticated but not allowed to do this," which is
            // what 403 means everywhere else in this app) — 401 is the correct
            // status, and it's what the frontend's axios interceptor already
            // auto-clears/redirects on. Found live 2026-07-28: these were both
            // 403 before, which the interceptor didn't catch, so an in-flight
            // request at the moment of logout would show its own raw error
            // toast instead of a clean redirect — a real, pre-existing gap for
            // passwordChangedAt too, just rare enough (a password change mid-session)
            // to never have surfaced before logout made it a routine occurrence.
            const passwordChangedAt = parseInt(user?.passwordChangedAt?.getTime() / 1000);

            if (passwordChangedAt > decoded.iat) {
                return res.status(401).json({ message: "Token expired, please login again!" });
            }

            // Rejects a token issued under an older sessionVersion — bumped on
            // logout (see logout controller), so a logged-out token stops
            // working immediately instead of remaining valid until it expires.
            if (decoded.sessionVersion !== user.sessionVersion) {
                return res.status(401).json({ message: "Session has been logged out, please login again!" });
            }

            if (!role.includes(user.role)) {
                return res.status(401).json({ message: "Sorry! You're not authorized." });
            }

            req.user = user;
            next(); 
        } catch (error) {
            return res.status(401).json({ message: "Session invalid or expired, please login again.", error: error.message });
        }
    };
};
