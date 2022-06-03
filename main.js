console.log("inside main.js");

const express = require("express");
var bodyParser = require("body-parser");

var app = express();
app.use(bodyParser());

app.use(express.static("static"));

app.get("/", (req, res) => {
  res.sendFile("./static/index.html");
});

require("dotenv").config();
const Advice = require("./models/advice");

app.post("/api/submit", (request, response) => {
  console.log(
    "in submit",
    request.body,
    request.body.content,
    request.body.description,
    request.body.author_id,
    request.body.author_name
  );
  const body = request.body;

  if (body.content === undefined) {
    return response.status(400).json({ error: "content missing" });
  }
  const a = new Advice({
    content: body.content,
    description: body.description,
    author_id: body.author_id,
    author_name: body.author_name,
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
