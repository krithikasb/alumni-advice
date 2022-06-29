const express = require("express");

var app = express();
app.use(express.json());

app.use(express.static("static"));

require("dotenv").config();
var session = require("express-session");

const oneDay = 1000 * 60 * 60 * 24;
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: false,
  })
);

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1); // trust first proxy
  // session.cookie.secure = true; // serve secure cookies
}

const authRouter = require("./api/auth.js");
app.use("/auth", authRouter);

app.get("/", (req, res) => {
  console.log("in /", req.session.user);
  if (req.session.user) {
    res.sendFile(__dirname + "/static/main.html");
  } else {
    res.redirect("/auth");
  }
});

const adviceRouter = require("./api/advice");
app.use("/api/advice", adviceRouter);

const botRouter = require("./api/bot.js");
app.use("/api/bot", botRouter);

const scheduledRouter = require("./api/scheduled.js");
app.use("/api/scheduled", scheduledRouter);

const PORT = process.env.PORT;
app.listen(PORT);
console.log(`Server running on port ${PORT}`);
