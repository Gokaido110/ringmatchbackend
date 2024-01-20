const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  uid: String,
  role: [String],
  accessToken: String,
});

module.exports = mongoose.model("User", userSchema);
