console.log("inside main.js");

const express = require("express");
var bodyParser = require("body-parser");
const axios = require("axios");

var app = express();
app.use(bodyParser());

app.use(express.static("static"));

require("dotenv").config();
const Advice = require("./models/advice");

let user = {};

const {
  ClientCredentials,
  ResourceOwnerPassword,
  AuthorizationCode,
} = require("simple-oauth2");

const callbackUrl = "http://localhost:3001/callback";

const client = new AuthorizationCode({
  client: {
    id: process.env.CLIENT_ID,
    secret: process.env.CLIENT_SECRET,
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

// Authorization uri definition
const authorizationUri = client.authorizeURL({
  redirect_uri: callbackUrl,
});

// Initial page redirecting to Recurse
app.get("/auth", (req, res) => {
  if (!user.id) {
    console.log(authorizationUri);
    res.redirect(authorizationUri);
  } else {
    res.redirect("/");
  }
});

// Callback service parsing the authorization token and asking for the access token
app.get("/callback", async (req, res) => {
  const { code } = req.query;
  const options = {
    code,
    redirect_uri: callbackUrl,
  };

  try {
    const accessToken = await client.getToken(options);

    console.log("The resulting token: ", accessToken.token);
    axios
      .get("https://recurse.com/api/v1/profiles/me", {
        headers: { Authorization: `Bearer ${accessToken.token.access_token}` },
      })
      .then((res) => {
        console.log(`statusCode: ${res.status}`);
        console.log(res);
        user = res.data;
      })
      .catch((error) => {
        console.error(error);
      });

    return res.redirect("/");
  } catch (error) {
    console.error("Access Token Error", error.message);
    return res.status(500).json("Authentication failed");
  }
});

// app.get("/", (req, res) => {
//   res.send('Hello<br><a href="/auth">Log in with Recurse</a>');
// });

app.get("/", (req, res) => {
  console.log("in /", user.id);
  if (user.id) {
    res.sendFile(__dirname + "/static/main.html");
  } else {
    res.redirect("/auth");
  }
});

app.post("/api/submit", (request, response) => {
  console.log(
    "in submit",
    request.body,
    request.body.content,
    request.body.description
  );
  console.log("in submit", user);
  const body = request.body;

  if (body.content === undefined) {
    return response.status(400).json({ error: "content missing" });
  }
  const a = new Advice({
    content: body.content,
    description: body.description,
    author_id: user.id,
    author_name: user.name,
  });

  a.save().then((savedAdvice) => {
    response.json(savedAdvice);
  });
});

app.post("/api/handleMessage", (request, response) => {
  console.log(
    "in handleMessage",
    request.body.data,
    request.body.message.type,
    request.body.message.sender_id
  );
  let advice;
  let responsePayload = {
    response_not_required: true,
  };
  Advice.aggregate([{ $sample: { size: 1 } }]).then((result) => {
    console.log(result);
    advice = result[0];

    responsePayload = {
      content: `${advice.content} 
      — [${advice.author_name}](https://www.recurse.com/directory/${advice.author_id})`,
    };

    response.json(responsePayload);
  });
});

app.get("/api/handleMessage", (request, response) => {
  let advice;
  Advice.aggregate([{ $sample: { size: 1 } }]).then((result) => {
    console.log(result);
    advice = result[0];

    const adviceResponse = {
      content: `${advice.content} 
      — [${advice.author_name}](https://www.recurse.com/directory/${advice.author_id})`,
    };
    const responseNotRequiredPayload = {
      response_not_required: true,
    };

    response.json(adviceResponse);
  });
});

const PORT = process.env.PORT;
app.listen(PORT);
console.log(`Server running on port ${PORT}`);
