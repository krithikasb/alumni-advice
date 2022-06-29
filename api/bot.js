// This file defines the API that is called from the zulip bot (outgoing webhook)

const botRouter = require("express").Router();

require("dotenv").config();
const Advice = require("../models/advice");
const Subscriber = require("../models/subscriber");
const { getFormattedAdvice } = require("../utils/utils");

botRouter.post("/handleMessage", (request, response) => {
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

          responsePayload = {
            content: getFormattedAdvice(advice),
          };

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

botRouter.get("/handleMessage", (request, response) => {
  let advice;
  Advice.aggregate([{ $sample: { size: 1 } }]).then((result) => {
    console.log(result);
    advice = result[0];

    const adviceResponse = {
      content: getFormattedAdvice(advice),
    };
    const responseNotRequiredPayload = {
      response_not_required: true,
    };

    response.json(adviceResponse);
  });
});

module.exports = botRouter;
