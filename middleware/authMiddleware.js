const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // 1. Look for the "Authorization: Bearer <token>" header
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).json({ error: "A token is required for authentication" });
    }

    // 2. Split the string to grab just the token part
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(403).json({ error: "Malformed token" });
    }

    try {
        // 3. Verify the token using secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. Attach the decoded payload (which contains user_id) to the request
        // This is how all our controllers know WHO is making the request.
        req.user = decoded;
        
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }

    // 5. Pass control to the actual controller function
    return next();
};

module.exports = verifyToken;