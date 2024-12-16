/**
 * TODO(developer):
 * Add your service key to the current folder.
 * Uncomment and fill in these variables.
 */
// const projectId = '';
// const locationId = '';
// const agentId = '';
// const languageCode = 'en'
// const TELEGRAM_TOKEN='';
// const SERVER_URL=''
// const API_KEY = '';

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
    case 1: // Step 2: Get email
      state.step++;
      state.data.name = messageText; // Save the name
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: `Nice to meet you, **${messageText}**! 🤝\n
        Can I grab your email so I can share updates and help you even after the Open House? 📧`,
        parse_mode: "Markdown" // Enables bold and clean formatting
      });
      break;

    case 2: // Step 3: Get contact number
      state.step++;
      state.data.email = messageText; // Save the email
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "Thanks a bunch! 🙌 Just one more thing – could you share your phone number? " +
            "In case we need to contact you after Open House! 📱",
        parse_mode: "Markdown" // Enables bold and clean formatting
      });
      break;

    case 3: // Step 3: Prospective student, parent or other?
      state.step++;
      state.data.contactNumber = messageText; // Save the contact number
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "Awesome! 🚀 Before we dive in, I’d love to know – which best describes you? \n" +
            "1. **Prospective Student** 🎓\n" +
            "2. **Parent** 🧑‍🤝‍🧑\n" +
            "3. **Other** 🌟",
        parse_mode: "Markdown", // Enables bold and clean formatting
        reply_markup: {
      keyboard: [
        [{ text: "Prospective Student" }],
        [{ text: "Parent" }],
        [{ text: "Others" }]
      ],
      one_time_keyboard: true, // The keyboard disappears after selection
      resize_keyboard: true // Resizes the keyboard for a better UI
      }});
      break;

    case 4:
      state.step++;
      state.data.groupType = messageText; // Save the group type
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "🌟 **Wonderful to have you here at the SUTD Open House 2025!** 🌟\n\n" +
        "Before we proceed, is there any course of study you are particularly interested in? 👇\n" +
        "1️⃣ **Computer Science and Design (CSD)**\n" +
        "2️⃣ **Architecture and Sustainable Design (ASD)**\n" +
        "3️⃣ **Engineering Systems and Design (ESD)**\n" +
        "4️⃣ **Engineering Product Development (EPD)**\n" +
        "5️⃣ **Design and Artificial Intelligence (DAI)**\n" +
        "6️⃣ **None**",
        parse_mode: "Markdown", // Enables bold and clean formatting
        reply_markup: {
      keyboard: [
        [{ text: "CSD" }],
        [{ text: "ASD" }],
        [{ text: "ESD" }],
        [{ text: "EPD" }],
        [{ text: "DAI" }],
        [{ text: "None" }]
      ],
      one_time_keyboard: true, // The keyboard disappears after selection
      resize_keyboard: true // Resizes the keyboard for a better UI
      }});
      break;

    case 5:
      state.step++;
      state.data.pillar = messageText; // Save the contact number
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "✅ **Please review your details carefully before submitting.**\n\n" +
          "By clicking ‘Yes,’ you consent to your data being used for event purposes. Be assured that you will not be contacted unless you have expressed your interest. 📢\n\n" +
          "**Name:** " + state.data.name + "\n" +
          "**Email Address:** " + state.data.email + "\n" +
          "**Contact Number:** " + state.data.contactNumber + "\n" +
          "**Group Type:** " + state.data.groupType + "\n" +
          "**Pillar of Interest:** " + state.data.pillar + "\n\n" +
          "If all looks good, please click ‘Yes’ to proceed! 😊",
        parse_mode: "Markdown", // Enables bold and clean formatting
        reply_markup: {
      keyboard: [
        [{ text: "Yes" }],
        [{ text: "No" }],
      ],
      one_time_keyboard: true, // The keyboard disappears after selection
      resize_keyboard: true // Resizes the keyboard for a better UI
      }});
      break;


    case 6:
      state.step++;
      state.data.audienceType = messageText; // Save the audienceType
      //  Respond first due to long wait time
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "Generating a personalised card for you and saving your data. Please wait patiently...",
        parse_mode: "Markdown" // Enables bold and clean formatting
      });
      // Generate the card using DALL-E
      // const cardDescription = `A personalized card with the user's name "${state.data.name}", email "${state.data.color}", contact number "${state.data.hobby}", and the character will be a "${state.data.audienceType}" in a retro game design.`;
      // const dalleImageResponse = await generateCardImage(cardDescription);
      //
      // if (dalleImageResponse && dalleImageResponse.data && dalleImageResponse.data[0]) {
      //   const imageUrl = dalleImageResponse.data[0].url; // Extract the image URL
      //
      //   try {
      //     // Debug: Log the URL to ensure it's correctly extracted
      //     console.log("Image URL to send:", imageUrl);
      //
      //     await axios.post(`${API_URL}/sendPhoto`, {
      //       chat_id: chatId,
      //       photo: imageUrl, // Use the URL as-is
      //       caption: `Here's your personalized card, ${state.data.name}!`,
      //     });
      //   } catch (error) {
      //     console.error('Error sending photo to Telegram:', error.response?.data || error.message);
      //   }
      // }
      // else {
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "Here will be generating of the card but disabled to avoid expenses. I will explain here" +
            "how to use the bot"
        // text: "Oops, something went wrong while generating your card. Please try again later with /start.",
      });
      // }
      break;

    default:
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "Something went wrong with your registration. Please try again with /start",
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
    if (userStates[chatId]?.step != 7 || messageText === '/start') {
      if (messageText === '/start') {
        // Start the registration flow
        userStates[chatId] = { step: 1, data: {} };
        await axios.post(`${API_URL}/sendMessage`, {
          chat_id: chatId,
          text: "🎉 **Welcome to the SUTD Open House!** 🎉\n" +
              "I’m your friendly AI chatbot here to help you make the most of your day. Let’s get started! What’s your name? 😊",
          parse_mode: "Markdown" // Enables bold and clean formatting
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
