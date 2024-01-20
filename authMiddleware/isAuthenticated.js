const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const isAuthenticated = async (req, res, next) => {
    // Get the token from the request headers
    const tokenWithQuotes = req.headers.authorization && req.headers.authorization.split(' ')[1];

    if (!tokenWithQuotes) {
        console.log("soleil says u are not authenticated");
        return res.status(401).json({ error: 'Unauthorized - Token not provided' });
    }

    // Remove the surrounding quotes
    const tokenWithoutQuotes = tokenWithQuotes.slice(1, -1);

    console.log("------------------------")
    console.log("here is token without quote : "+tokenWithoutQuotes)
    console.log("------------------------")

    console.log("------------------------")
    console.log("here is token with quote : "+tokenWithQuotes)
    console.log("------------------------")

    try {
        // Verify the token using the secret key
        const decodedToken = jwt.verify(tokenWithoutQuotes, 'SoleilApp');

        // Find the user based on the decoded token's userId
        const currentUser = await User.findOne({ uid: decodedToken.userId });

        if (!currentUser) {
            return res.status(401).json({ error: 'Unauthorized - User not found' });
        }

        // Attach the decoded token payload to the request object
        req.currentUser = currentUser;

        // Continue to the next middleware or route handler
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(401).json({ error: 'Unauthorized - Invalid token', details: error.message });
    }
};

module.exports = isAuthenticated;
