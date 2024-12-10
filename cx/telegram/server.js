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
const API_KEY = '';

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

const userStates = {}; // In-memory store for tracking user registration state

// Function to handle registration flow
async function handleRegistration(chatId, messageText) {
  if (!userStates[chatId]) {
    // Initialize registration state
    userStates[chatId] = { step: 1, data: {} };
  }

  const state = userStates[chatId];

  switch (state.step) {
    case 1: // Step 1: Ask for name
      state.step++;
      state.data.name = messageText; // Save the name
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "Nice to meet you! What's your favorite color?",
      });
      break;

    case 2: // Step 2: Ask for favorite color
      state.step++;
      state.data.color = messageText; // Save the favorite color
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "Great choice! Finally, what's your hobby?",
      });
      break;

    case 3: // Step 3: Ask for hobby
      state.step++;
      state.data.hobby = messageText; // Save the hobby

      // Generate the card using DALL-E
      const cardDescription = `A personalized card with the user's name "${state.data.name}", favorite color "${state.data.color}", and hobby "${state.data.hobby}" in an artistic design.`;
      const dalleImageResponse = await generateCardImage(cardDescription);

      if (dalleImageResponse && dalleImageResponse.data && dalleImageResponse.data[0]) {
        const imageUrl = dalleImageResponse.data[0].url; // Extract the image URL

        try {
          // Debug: Log the URL to ensure it's correctly extracted
          console.log("Image URL to send:", imageUrl);

          await axios.post(`${API_URL}/sendPhoto`, {
            chat_id: chatId,
            photo: imageUrl, // Use the URL as-is
            caption: `Here's your personalized card, ${state.data.name}!`,
          });
        } catch (error) {
          console.error('Error sending photo to Telegram:', error.response?.data || error.message);
        }
      }
      else {
        await axios.post(`${API_URL}/sendMessage`, {
          chat_id: chatId,
          text: "Oops, something went wrong while generating your card. Please try again later.",
        });
      }

      // Clear the user state after completion
      delete userStates[chatId];
      break;

    default:
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "Something went wrong with your registration. Let's start over. What's your name?",
      });
      delete userStates[chatId]; // Reset state
  }
}

// Function to generate the card using DALL-E
async function generateCardImage(description) {
  try {
    const response = await axios.post('https://api.openai.com/v1/images/generations', {
      prompt: description,
      size: "1024x1024",
      n: 1,
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`, // Replace with your OpenAI API key
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error generating DALL-E image:', error.message);
    return null;
  }
}

app.post(URI, async (req, res) => {
  const chatId = req.body.message.chat.id;
  const messageText = req.body.message.text;

  try {
    // Check if the user is in the registration flow
    if (userStates[chatId]?.step != 4 || messageText === '/start') {
      if (messageText === '/start') {
        // Start the registration flow
        userStates[chatId] = { step: 1, data: {} };
        await axios.post(`${API_URL}/sendMessage`, {
          chat_id: chatId,
          text: "Welcome! Let's get started with registration. What's your name?",
        });
      } else {
        // Continue the registration flow
        await handleRegistration(chatId, messageText);
      }
    } else {
      // Proceed with Dialogflow interaction if not in registration flow
      const response = await detectIntentResponse(req.body);
      const requests = await convertToTelegramMessage(response, chatId);

      for (const request of requests) {
        if (request.hasOwnProperty('photo')) {
          await axios.post(`${API_URL}/sendPhoto`, request).catch((error) => console.error(error));
        } else if (request.hasOwnProperty('voice')) {
          await axios.post(`${API_URL}/sendVoice`, request).catch((error) => console.error(error));
        } else {
          await axios.post(`${API_URL}/sendMessage`, request).catch((error) => console.error(error));
        }
      }
    }
  } catch (error) {
    console.error('Error handling webhook:', error.message);
  }

  res.send();
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
