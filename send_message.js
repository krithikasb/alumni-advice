// separate file for heroku scheduler
async function sendMessage() {
  const Advice = require("./models/advice");
  const Subscriber = require("./models/subscriber");
  const zulipInit = require("zulip-js");

  let config;
  if (process.env.NODE_ENV === "production") {
    config = {
      username: process.env.ZULIP_USERNAME,
      apiKey: process.env.ZULIP_API_KEY,
      realm: process.env.ZULIP_REALM,
    };
  } else {
    const path = require("path");
    const zuliprc = path.resolve(__dirname, "zuliprc");
    console.log(zuliprc);
    config = { zuliprc };
  }
  const client = await zulipInit(config);
  // The zulip object now contains the config from the zuliprc file
  // console.log(await zulip.streams.subscriptions.retrieve());

  // get random advice
  let result = await Advice.aggregate([{ $sample: { size: 1 } }]);
  console.log(result);
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
  console.log(result2);
  // send a message
  for (let s of result2) {
    params = {
      to: [s.zulip_id],
      type: "private",
      content: content,
    };
    console.log(await client.messages.send(params));
  }

  process.exit();
}
sendMessage();
