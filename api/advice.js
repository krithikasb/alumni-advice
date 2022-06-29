const adviceRouter = require("express").Router();

require("dotenv").config();
const Advice = require("../models/advice");

adviceRouter.post("/submit", (request, response) => {
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

adviceRouter.get("/list", async (request, response) => {
  //API lists all advice from logged-in user
  let result = await Advice.find({ author_id: request.session.user.id });
  response.json(result);
});

module.exports = adviceRouter;
