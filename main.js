const express = require("express");
const axios = require("axios");

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

const { AuthorizationCode } = require("simple-oauth2");

const client = new AuthorizationCode({
  client: {
    id: process.env.OAUTH_CLIENT_ID,
    secret: process.env.OAUTH_CLIENT_SECRET,
  },
  auth: {
    tokenHost: "https://recurse.com",
    tokenPath: "/oauth/token",
    authorizePath: "/oauth/authorize",
  },
  options: {
    authorizationMethod: "body",
  },
});

// Initial page redirecting to Recurse
app.get("/auth", (req, res) => {
  let callbackUrl = process.env.BASE_URL + "/callback";
  const authorizationUri = client.authorizeURL({
    redirect_uri: callbackUrl,
  });
  if (!req.session.user) {
    console.log(authorizationUri, callbackUrl);
    res.redirect(authorizationUri);
  } else {
    res.redirect("/");
  }
});

// Callback service parsing the authorization token and asking for the access token
app.get("/callback", async (req, res) => {
  const { code } = req.query;
  let callbackUrl = process.env.BASE_URL + "/callback";
  const options = {
    code,
    redirect_uri: callbackUrl,
  };
  let user;

  try {
    const accessToken = await client.getToken(options);

    console.log("The resulting token: ", accessToken.token);
    axios
      .get("https://recurse.com/api/v1/profiles/me", {
        headers: { Authorization: `Bearer ${accessToken.token.access_token}` },
      })
      .then((res2) => {
        console.log(`statusCode: ${res2.status}`);
        user = res2.data;
        req.session.regenerate(function (err) {
          if (err) next(err);

          // store user information in session, typically a user id
          req.session.user = {
            id: user.id,
            name: user.name,
          };

          // save the session before redirection to ensure page
          // load does not happen before session is saved
          req.session.save(function (err) {
            if (err) return next(err);
            res.redirect("/");
          });
        });
      })
      .catch((error) => {
        console.error(error);
      });
  } catch (error) {
    console.error("Access Token Error", error.message);
    return res.status(500).json("Authentication failed");
  }
});

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
