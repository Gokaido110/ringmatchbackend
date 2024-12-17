const fs = require("fs");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const logger = require("morgan");
const cors = require("cors");
const MongoStore = require("connect-mongo");
const cookieParser = require("cookie-parser"); 
const dotenv = require("dotenv");

dotenv.config()

// routes
const userRoutes = require("./handlers/users");
const paymentRoutes = require("./handlers/payments");
const transactionRoutes = require("./handlers/transactions");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(`Received request: ${req.method} ${req.url}`);
  next();
});

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = ["http://localhost:3000", "https://pisetupistesting.netlify.app"];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));


app.use(cors(corsOptions));
app.use(cookieParser()); // Use cookie-parser middleware

app.use(
  logger("common", {
    stream: fs.createWriteStream(path.join(__dirname, ".", "access.log"), {
      flags: "a",
    }),
  })
);


app.use("/user", userRoutes);
app.use("/payments", paymentRoutes);
app.use("/transactions", transactionRoutes);

mongoose.connect(`${process.env.MONGODB_URL}`)
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(
        `Successfully connected to db ${process.env.MONGODB_URL} and app running on port ${process.env.PORT}`
      );
    });
  })
  .catch(err => {
    console.error("Error connecting to the database:", err.message);
    console.log(err);
  });



