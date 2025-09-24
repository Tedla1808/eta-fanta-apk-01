// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    // The token is sent in the headers like: "Authorization: Bearer <token>"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Get token from header
            token = req.headers.authorization.split(' ')[1]; // Splits "Bearer <token>" and gets the token part

            // 2. Verify the token using our secret
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Attach the user's ID to the request object
            // We don't need the password anymore, just the ID from the token
            req.user = { id: decoded.user.id }; 
            
            // 4. Call next() to proceed to the actual route handler (e.g., place bet)
            next(); 

        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };