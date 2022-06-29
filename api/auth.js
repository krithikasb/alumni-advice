// This file defines the APIs that oauth requires

const authRouter = require("express").Router();
const axios = require("axios");

require("dotenv").config();

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

// Initial page redirecting to recurse.com
authRouter.get("/", (req, res) => {
  let callbackUrl = process.env.BASE_URL + "/auth/callback";
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
authRouter.get("/callback", async (req, res) => {
  const { code } = req.query;
  let callbackUrl = process.env.BASE_URL + "/auth/callback";
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

module.exports = authRouter;
