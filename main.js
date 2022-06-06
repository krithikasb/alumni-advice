console.log("inside main.js");

const express = require("express");
var bodyParser = require("body-parser");
const axios = require("axios");

var app = express();
app.use(bodyParser());

app.use(express.static("static"));

require("dotenv").config();
const Advice = require("./models/advice");

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

const {
  ClientCredentials,
  ResourceOwnerPassword,
  AuthorizationCode,
} = require("simple-oauth2");

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

// Initial page redirecting to Recurse
app.get("/auth", (req, res) => {
  let callbackUrl = req.protocol + "://" + req.get("host") + "/callback";
  console.log("in auth", req.protocol, req.get("host"));
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
  let callbackUrl = req.protocol + "://" + req.get("host") + "/callback";
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
        // console.log(res);
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

// app.get("/", (req, res) => {
//   res.send('Hello<br><a href="/auth">Log in with Recurse</a>');
// });

app.get("/", (req, res) => {
  console.log("in /", req.session.user);
  if (req.session.user) {
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
  console.log("in submit", request.session.user);
  const body = request.body;

  if (body.content === undefined) {
    return response.status(400).json({ error: "content missing" });
  }
  const a = new Advice({
    content: body.content,
    description: body.description,
    author_id: request.session.user.id,
    author_name: request.session.user.name,
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
  if (request.body.message.type === "private") {
    switch (request.body.message.content.toLowerCase()) {
      case "subscribe":
        responsePayload = {
          content:
            "You're now subscribed to Advice Bot! You will now receive advice from a Recurse Center alumnus daily!\n\n[Submit your own advice](https://advice.recurse.com)",
        };

        response.json(responsePayload);
        break;
      case "unsubscribe":
        responsePayload = {
          content:
            "You're unsubscribed!\n\n[Submit your own advice](https://advice.recurse.com)",
        };

        response.json(responsePayload);
        break;
      case "advice":
        Advice.aggregate([{ $sample: { size: 1 } }]).then((result) => {
          console.log(result);
          advice = result[0];

          responsePayload = {
            content: `${advice.content} 
        — [${advice.author_name}](https://www.recurse.com/directory/${advice.author_id})`,
          };

          response.json(responsePayload);
        });
        break;
      default:
        responsePayload = {
          content:
            "**How to use Advice Bot:**\n* `subscribe` to start getting advice from Recurse Center alumni daily\n* `unsubscribe` to stop getting advice from Recurse Center alumni\n* `advice` to get advice from a Recurse Center alumnus now\n\n[Submit your own advice](https://advice.recurse.com)",
        };

        response.json(responsePayload);
        break;
    }
  } else {
    response.json(responsePayload);
  }
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
