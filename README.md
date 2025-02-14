# In App Calling Demo

<a href="http://dev.bandwidth.com">
  <img src="icon-in-app.svg" title="Product Quick Start Guide" alt="Product Quick Start Guide"/> <!--src should be image located in repo-->
</a>

# Table of Contents

* [Description](#description)
* [Pre-Requisites](#pre-requisites)
* [Environmental Variables](#environmental-variables)
* [Running the Application](#running-the-application)
* [Callback URLs](#callback-urls)
    * [Ngrok](#ngrok)

# Description

This sample app demonstrates using Bandwidth's In App Calling product to make outbound calls from a browser and receive inbound calls from a PSTN number.  

The app uses the Bandwidth Voice API to handle the call legs from the browser and customer, and bridge them together.

The app is built using a React frontend and a python FastAPI backend, using Redis PubSub to broker messages between the 2 via websocket. 

# Pre-Requisites

In order to use the Bandwidth API, users need to set up the appropriate application at the [Bandwidth Dashboard](https://dashboard.bandwidth.com/) and create an API user.

To create an application, log into the [Bandwidth Dashboard](https://dashboard.bandwidth.com/) and navigate to the `Applications` tab.  Fill out the **New Application** form; selecting the service (Voice) that the application will be used for.  All Bandwidth services require publicly accessible Callback URLs, for more information on how to set one up see [Callback URLs](#callback-urls).

For more information about API credentials see our [Account Credentials](https://dev.bandwidth.com/docs/credentials) page.

When configuring your application, make sure to set the `Call-Initiated Callback URL` as `http://<your-ngrok-url>/bandwidth/webhooks/voice/initiate` and the `Call Status Callback URL` as `http://<your-ngrok-url>/bandwidth/webhooks/voice/disconnect`.

# Environmental Variables

The sample app uses the below environmental variables. The can be configured in the [`.env`](.env) file.

```sh
BW_USERNAME                          # Your Bandwidth API Username
BW_PASSWORD                          # Your Bandwidth API Password
BW_FROM_NUMBER                       # The Bandwidth phone number involved with this application
```

# Running the Application

This application utilizes a makefile and docker compose to run the application. 

Before running the application, make sure you modify the `.env` file with the appropriate environmental variables.

To run the application, run the following command:

```sh
make run-local
```

After running - the frontend will be available on localhost:3000 and the backend will be available on localhost:3001.

# Callback URLs

For a detailed introduction, check out our [Voice Callbacks](https://dev.bandwidth.com/docs/voice/webhooks/) page.

Below are the callback paths:

* `/health` - A health check endpoint
* `/bandwidth/authorization/token` - Generates a Bandwidth token for the frontend to use
* `/bandwidth/notifications/ws` - Websocket endpoint for the frontend to receive notifications
* `/bandwidth/webhooks/voice/initiate` - Endpoint that returns BXML when a call is received
* `/bandwidth/webhooks/voice/redirect` - Endpoint that returns BXML to keep and inbound customer call parked
* `/bandwidth/webhooks/voice/disconnect` - Status endpoint for when a call is disconnected

## Ngrok

A simple way to set up a local callback URL for testing is to use the free tool [ngrok](https://ngrok.com/).  
After you have downloaded and installed `ngrok` run the following command to open a public tunnel to your port (`$LOCAL_PORT`)

```sh
ngrok http $LOCAL_PORT
```

You can view your public URL at `http://127.0.0.1:4040` after ngrok is running.  You can also view the status of the tunnel and requests/responses here.
