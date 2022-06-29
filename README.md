# Advice Bot

A combination repo of a web-app and a zulip bot.

## Web app

Collects advice from RC alums! Uses mongodb atlas for a DB and hosted on heroku.

https://advice.recurse.com

![demo-web-app-gif](https://user-images.githubusercontent.com/76915822/176476343-36b32844-1dc9-4ad7-ac4f-d6728b0925aa.gif)

Steps to run locally:

1. Create a file called `.env` in the root of the project similar to the `.env.example` file
2. You will need an OAUTH client ID and client secret, you can generate this in recurse.com settings > apps and copy it into your `.env` file as `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET`
3. You will need a MongoDB atlas DB. You can create one and copy it into your `.env` file as `MONGODB_URI`
4. `SESSION_SECRET` can be any random string
5. Run `npm install` to install all dependencies
6. Run `npm run dev` to run it locally
7. Go to `http://localhost:3001`, you should see the front-end
8. Ping me on zulip if this doesn't work

## Zulip bot

Recursers can subscribe to the "Advice of the Day!" bot to get one piece of advice from an RC alum everyday

https://recurse.zulipchat.com/#narrow/pm-with/506831-advice-bot

![demo-zulip-bot-gif](https://user-images.githubusercontent.com/76915822/176476363-c510a28b-2385-4be5-8afa-bb7993c14fb8.gif)

Steps to run locally:

1. You will need to do all the steps to run the web app locally above (since the bot needs the APIs)
2. Run an ngrok tunnel that points to `http://localhost:3001`
3. Create a new file in the project root called zuliprc
4. Create a new bot in Zulip > gear icon > Personal settings > Bots as an outgoing webhook with the Endpoint URL set to `<your-ngrok-url>/api/bot/handleMessage`
5. Copy paste the bot config (zuliprc) into your zuliprc file
6. Now if you DM your bot, you should get a response

## Scheduled APIs

(Defined in the `/api/scheduled.js` file)

This project uses cron-job.org to schedule tasks:

1.  `/api/scheduled/sendAdvice` is called everyday. This API sends one random piece of advice from the database to all subscribers.
2.  `/api/scheduled/introduceBot` is called every week on Wednesdays. This API checks whether a new batch has started in the last week, and sends an introductory message on Zulip if so.

    **NOTE**: You will need a recurse.com personal access token to run this API locally, since it needs to check whether a new batch has started. You can get a personal access token from recurse.com settings > apps and paste it to your `.env` file as `PERSONAL_ACCESS_TOKEN`

## Bot API

(Defined in the `/api/bot.js` file)

1. `/api/bot/handleMessage` is called from the zulip bot (which is defined as an outgoing webhook)

## Advice APIs

(Defined in the `/api/advice.js` file, these APIs are called from the frontend)

1. `/api/advice/submit`
2. `/api/advice/list` lists all the advice submitted by a logged-in user
