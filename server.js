const fs = require("fs");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const logger = require("morgan");
const cors = require("cors");
const MongoStore = require("connect-mongo");
const cookieParser = require("cookie-parser"); // Import cookie-parser

// routes
const userRoutes = require("./handlers/users");
const paymentRoutes = require("./handlers/payments");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(`Received request: ${req.method} ${req.url}`);
  next();
});

const corsOptions = {
  origin: "http://localhost:3314",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser()); // Use cookie-parser middleware

app.use(
  logger("common", {
    stream: fs.createWriteStream(path.join(__dirname, ".", "access.log"), {
      flags: "a",
    }),
  })
);

app.use(
  session({
    secret: "SoleilApp",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 * 10 },
    store: MongoStore.create({
      mongoUrl: "mongodb://localhost:27017/SoleilAppDB",
      ttl: 60000 * 10,
      autoRemove: "native",
    }),
  })
);

app.use("/user", userRoutes);
app.use("/payments", paymentRoutes);

mongoose.connect(`mongodb://localhost:27017/SoleilAppDB`).then(() => {
  app.listen(9000, () => {
    console.log(
      `App is running on port 9000 and successfully connected to the database`
    );
  });
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/test", (req, res) => {
  res.send("test");
});
