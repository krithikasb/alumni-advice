const express = require("express");
const axios = require("axios");

var app = express();
app.use(express.json());

app.use(express.static("static"));

require("dotenv").config();
const Advice = require("./models/advice");
const Subscriber = require("./models/subscriber");

const zulipInit = require("zulip-js");

let zulipConfig;
if (process.env.NODE_ENV === "production") {
  zulipConfig = {
    username: process.env.ZULIP_USERNAME,
    apiKey: process.env.ZULIP_API_KEY,
    realm: process.env.ZULIP_REALM,
  };
} else {
  const path = require("path");
  const zuliprc = path.resolve(__dirname, "zuliprc");
  zulipConfig = { zuliprc };
}

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
  let advice;
  let responsePayload = {
    response_not_required: true,
  };
  if (request.body.message.type === "private") {
    switch (request.body.message.content.toLowerCase()) {
      case "subscribe":
        const a = new Subscriber({
          zulip_id: request.body.message.sender_id,
          zulip_name: request.body.message.sender_full_name,
        });

        a.save();
        responsePayload = {
          content:
            "You're now subscribed to Advice Bot! You will now receive advice from a Recurse Center alumnus daily!\n\nSubmit your own advice: https://advice.recurse.com",
        };

        response.json(responsePayload);
        break;
      case "unsubscribe":
        Subscriber.find({ zulip_id: request.body.message.sender_id }).then(
          (result) => {
            Subscriber.deleteOne({
              zulip_id: request.body.message.sender_id,
            }).then((result2) => {
              responsePayload = {
                content:
                  "You're unsubscribed!\n\nSubmit your own advice: https://advice.recurse.com",
              };
              response.json(responsePayload);
            });
          }
        );
        break;
      case "advice":
        Advice.aggregate([{ $sample: { size: 1 } }]).then((result) => {
          advice = result[0];

          if (advice.description) {
            responsePayload = {
              content:
                `**${advice.content}**\n\n${advice.description}\n\n` +
                `— [${advice.author_name}](https://www.recurse.com/directory/${advice.author_id})`,
            };
          } else {
            responsePayload = {
              content:
                `${advice.content}\n` +
                `— [${advice.author_name}](https://www.recurse.com/directory/${advice.author_id})`,
            };
          }

          response.json(responsePayload);
        });
        break;
      default:
        responsePayload = {
          content:
            "**How to use Advice Bot:**\n* `subscribe` to start getting advice from Recurse Center alumni daily\n* `unsubscribe` to stop getting advice from Recurse Center alumni\n* `advice` to get advice from a Recurse Center alumnus now\n\nSubmit your own advice: https://advice.recurse.com",
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

// this API gets called everyday from cron-job.org
app.get("/api/sendAdvice", async (request, response) => {
  const client = await zulipInit(zulipConfig);
  // The zulip object now contains the config from the zuliprc file

  // get random advice
  let result = await Advice.aggregate([{ $sample: { size: 1 } }]);
  let advice = result[0];
  let content;

  if (advice.description) {
    content =
      `**${advice.content}**\n\n${advice.description}\n\n` +
      `— [${advice.author_name}](https://www.recurse.com/directory/${advice.author_id})`;
  } else {
    content =
      `${advice.content}\n` +
      `— [${advice.author_name}](https://www.recurse.com/directory/${advice.author_id})`;
  }

  let result2 = await Subscriber.find({}, "zulip_id");
  // send a message
  for (let s of result2) {
    params = {
      to: [s.zulip_id],
      type: "private",
      content: content,
    };
    console.log(await client.messages.send(params));
  }
  response.json({
    status: "success",
  });
});

app.get("/api/getAllAdvice", async (request, response) => {
  let result = await Advice.find({ author_id: request.session.user.id });
  response.json(result);
});

// call this api every wednesday from cron-job.org
app.get("/api/introduceBot", async (request, response) => {
  // make call to /api/v1/batches
  // using personal access token
  axios
    .get("https://recurse.com/api/v1/batches", {
      headers: {
        Authorization: `Bearer ${process.env.PERSONAL_ACCESS_TOKEN}`,
      },
    })
    .then(async (res) => {
      console.log(`statusCode: ${res.status}`);
      // check if latest batch has less than a week old start date
      // and introduce bot in 397 bridge mentioning Currently at RC
      // otherwise do nothing
      const latestBatch = res.data[0];
      console.log(new Date(latestBatch.start_date));
      if (
        new Date(latestBatch.start_date) >
        new Date(new Date() - 7 * 24 * 60 * 60 * 1000)
      ) {
        console.log("less than a week");
        const client = await zulipInit(zulipConfig);

        params = {
          to: "397 Bridge",
          topic: "Advice of the Day!",
          type: "stream",
          content:
            "Hello @*Currently at RC*! You can subscribe to the [Advice of the Day](https://recurse.zulipchat.com/#narrow/pm-with/506831-advice-bot) bot to receive one piece of advice from an RC alum everyday!",
        };
        console.log(await client.messages.send(params));

        response.json({
          status: "success",
          new_batch: true,
        });
      } else {
        response.json({
          status: "success",
          new_batch: false,
        });
      }
    });
});

const PORT = process.env.PORT;
app.listen(PORT);
console.log(`Server running on port ${PORT}`);
