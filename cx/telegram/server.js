/**
 * TODO(developer):
 * Add your service key to the current folder.
 * Uncomment and fill in these variables.
 */
const projectId = '';
const locationId = '';
const agentId = '';
const languageCode = 'en'
const TELEGRAM_TOKEN='';
const SERVER_URL='';

const structProtoToJson =
    require('../../botlib/proto_to_json.js').structProtoToJson;

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const URI = `/webhook/${TELEGRAM_TOKEN}`;
const WEBHOOK = SERVER_URL + URI;

const app = express();
app.use(bodyParser.json());

// Imports the Google Cloud Some API library
const {SessionsClient} = require('@google-cloud/dialogflow-cx');
/**
 * Example for regional endpoint:
 *   const locationId = 'us-central1'
 *   const client = new SessionsClient({apiEndpoint:
 * 'us-central1-dialogflow.googleapis.com'})
 */
const client = new SessionsClient(
    {apiEndpoint: locationId + '-dialogflow.googleapis.com'});

// Converts Telgram request to a detectIntent request.
function telegramToDetectIntent(telegramRequest, sessionPath) {
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: telegramRequest.message.chat.id + ":" + telegramRequest.message.text
      },
      languageCode,
    }
  };

  return request;
}

// Converts detectIntent responses to Telegram message requests.
async function convertToTelegramMessage(responses, chatId) {
  let replies = [];

  for (let response of responses.queryResult.responseMessages) {
    let reply;

    switch (true) {
      case response.hasOwnProperty('text'): {
        reply = {chat_id: chatId, text: response.text.text.join()};
        break;
      };

      /**
       * The layout for the custom payload responses can be found in these
       * sites: Buttons: https://core.telegram.org/bots/api#inlinekeyboardmarkup
       * Photos: https://core.telegram.org/bots/api#sendphoto
       * Voice Audios: https://core.telegram.org/bots/api#sendvoice
       */
      case response.hasOwnProperty('payload'): {
        reply = await structProtoToJson(response.payload);
        reply['chat_id'] = chatId;
        break;
      };

      default:
    };
    if (reply) {
      replies.push(reply);
    };
  }

  return replies;
}

/**
 * Takes as input a request from Telegram and converts the request to
 * detectIntent request which is used to call the detectIntent() function
 * and finally output the response given by detectIntent().
 */
async function detectIntentResponse(telegramRequest) {
  const sessionId = telegramRequest.message.chat.id;
  const sessionPath = client.projectLocationAgentSessionPath(
      projectId, locationId, agentId, sessionId);
  console.info(sessionPath);

  request = telegramToDetectIntent(telegramRequest, sessionPath);
  const [response] = await client.detectIntent(request);

  return response;
};

const setup = async () => {
  const res = await axios.post(`${API_URL}/setWebhook`, {url: WEBHOOK});
  console.log(res.data);
};

const sendTypingAction = async (chatId) => {
  try {
    await axios.post(`${API_URL}/sendChatAction`, {
      chat_id: chatId,
      action: 'typing', // Typing action
    });
  } catch (error) {
    console.error('Error sending typing action:', error.message);
  }
};

app.post(URI, async (req, res) => {
  const chatId = req.body.message.chat.id;

  try {
    // Start typing action
    await sendTypingAction(chatId);

    // Call detectIntentResponse to get the response from Dialogflow
    const response = await detectIntentResponse(req.body);

    // Convert Dialogflow response to Telegram messages
    const requests = await convertToTelegramMessage(response, chatId);

    // Loop through each message and send it
    for (const request of requests) {
      if (request.hasOwnProperty('photo')) {
        await axios.post(`${API_URL}/sendPhoto`, request).catch(function(error) {
          console.error(error);
        });
      } else if (request.hasOwnProperty('voice')) {
        await axios.post(`${API_URL}/sendVoice`, request).catch(function(error) {
          console.error(error);
        });
      } else {
        await axios.post(`${API_URL}/sendMessage`, request).catch(function(error) {
          console.error(error);
        });
      }
    }
  } catch (error) {
    console.error('Error handling webhook:', error.message);
  }

  return res.send();
});

const listener = app.listen(process.env.PORT, async () => {
  console.log(
      'Your Dialogflow integration server is listening on port ' +
      listener.address().port);

  await setup();
});

module.exports = {
  telegramToDetectIntent,
  convertToTelegramMessage
};
