// This file defines APIs that are scheduled via cron-job.org

const scheduledRouter = require("express").Router();
const axios = require("axios");

require("dotenv").config();
const Advice = require("../models/advice");
const Subscriber = require("../models/subscriber");

const zulipInit = require("zulip-js");
const { getFormattedAdvice } = require("../utils/utils");

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

// this API gets called everyday from cron-job.org
scheduledRouter.get("/sendAdvice", async (request, response) => {
  const client = await zulipInit(zulipConfig);
  // The zulip object now contains the config from the zuliprc file

  // get random advice
  let result = await Advice.aggregate([{ $sample: { size: 1 } }]);
  let advice = result[0];
  let content = getFormattedAdvice(advice);

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

// call this api every wednesday from cron-job.org
scheduledRouter.get("/introduceBot", async (request, response) => {
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

module.exports = scheduledRouter;
