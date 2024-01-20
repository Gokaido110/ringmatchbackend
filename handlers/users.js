const express = require("express");
const router = express.Router();
const platformAPIClient = require("../services/platformAPIClient");
const User = require("../models/userModel");

// handle the user auth accordingly
router.post("/signin", async (req, res) => {
  console.log("User hit the login route");
  const auth = req.body.authResult;

  try {
    // Verify the user's access token with the /me endpoint:
    const me = await platformAPIClient.get(`/v2/me`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    console.log("User details from /me endpoint:", me.data);
  } catch (err) {
    console.error("Error verifying access token:", err);
    return res.status(401).json({ error: "Invalid access token" });
  }

  try {
    // Check if the user already exists in the database
    let currentUser = await User.findOne({ uid: auth.user.uid });

    if (currentUser) {
      // Update the existing user's accessToken
      await User.updateOne(
        { _id: currentUser._id },
        { $set: { accessToken: auth.accessToken } }
      );
    } else {
      // Create a new user if not found
      const newUser = new User({
        username: auth.user.username,
        uid: auth.user.uid,
        roles: auth.user.roles,
        accessToken: auth.accessToken,
      });

      const savedUser = await newUser.save();
      currentUser = savedUser;
    }

    // Set currentUser in the session
    req.session.currentUser = currentUser;
    req.session.save();

    console.log("-----------current user from login--------");
    console.log(currentUser);
    console.log("-----------current user from login--------");

    return res.status(200).json({ message: "User signed in", currentUser });
  } catch (error) {
    console.error("Error handling user sign-in:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// handle the user auth accordingly
router.get("/signout", async (req, res) => {
  // Clear currentUser from the session upon signout
  req.session.currentUser = null;
  return res.status(200).json({ message: "User signed out" });
});

module.exports = router;
