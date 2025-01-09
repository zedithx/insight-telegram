// Function to handle registration flow
import config from "../config";
import { createEventPass } from "../comfyUI/generate_event_pass";
const axios = require("axios");

const event_states = {
  SELECT_GENDER: "SELECT_GENDER",
  SELECT_PILLAR: "SELECT_PILLAR",
  SELECT_INTEREST: "SELECT_INTEREST",
  END_EVENT: "END_EVENT",
};

const EVENT_START = event_states.SELECT_GENDER;
const END_FLOW = event_states.END_EVENT;

async function handleEventPass(chatId, messageText, user, API_URL) {
  switch (user.state) {
    case event_states.SELECT_GENDER: // Step 2: Get the choice of pillar
      if (!["Male", "Female", "Other"].includes(messageText)) {
        await axios.post(`${API_URL}/sendMessage`, {
          chat_id: chatId,
          text: "Please select one of the provided options.",
          parse_mode: "HTML",
        });
        return;
      }
      user.data.gender = messageText;
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text:
          "🌟<b>Wonderful</b>🌟\n\n" +
          "Which SUTD pillar interests you the most? 👇\n" +
          "1️⃣ <b>Architecture and Sustainable Design (ASD)</b>\n" +
          "2️⃣ <b>Computer Science and Design (CSD)</b>\n" +
          "3️⃣ <b>Design and Artificial Intelligence (DAI)</b>\n" +
          "4️⃣ <b>Engineering Product Development (EPD)</b>\n" +
          "5️⃣ <b>Engineering Systems and Design (ESD)</b>\n" +
          "6️⃣ <b>No Preferred Pillar</b>",
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [
            [{ text: "ASD" }],
            [{ text: "CSD" }],
            [{ text: "DAI" }],
            [{ text: "EPD" }],
            [{ text: "ESD" }],
            [{ text: "SUTD" }],
          ],
          one_time_keyboard: true,
          resize_keyboard: true,
        },
      });
      user.state = event_states.SELECT_PILLAR;
      break;

    case event_states.SELECT_PILLAR:
      if (!["CSD", "ASD", "ESD", "EPD", "DAI", "SUTD"].includes(messageText)) {
        await axios.post(`${API_URL}/sendMessage`, {
          chat_id: chatId,
          text: "Please select one of the provided options.",
          parse_mode: "HTML",
        });
        return;
      }
      user.data.pillar = messageText;

      // IF DATE IS AFTER 23 FEB OR PREREGISTER == FALSE THEN SKIP THIS STEP CHANGE STATE TO SELECT_INTEREST
      const currentDate = new Date();
      const eventDate = new Date("2025-02-24"); //Open House Date set as 24 Feb 2025
      const isPreRegistered = config.isPreRegistered;

      if (currentDate > eventDate || !isPreRegistered) {
        await axios.post(`${API_URL}/sendMessage`, {
          chat_id: chatId,
          text: "⌛Generating a personalised digital pass for you. Your pass will be ready in a moment! Please wait patiently...⚡️",
          parse_mode: "HTML", // Enables bold and clean formatting
        });

        await createEventPass({
          pillar: user.data.pillar,
          chatID: chatId,
          name: user.data.name,
          customAvatar: false,
          avatarType: user.data.gender,
        });
        //TODO store data into firebase
        //TODO store data into PGSQL on Digital Ocean

        user.state = END_FLOW;
      } else {
        await axios.post(`${API_URL}/sendMessage`, {
          chat_id: chatId,
          text:
            "Lastly, 🌟 Let's get to know you better! 🌟\n" +
            "What are your interests?" +
            "<b>🤖 Robotics & Mechatronics</b>\n" +
            "<b>🛠️ Product Design</b>" +
            "<b>🏗️ Architecture Design</b>\n" +
            "<b>💻 Software development</b>\n" +
            "<b>📊 Data Science & Analytics</b>\n",
          parse_mode: "HTML", // Enables bold and clean formatting
          reply_markup: {
            keyboard: [
              [{ text: "Robotics & Mechatronics" }],
              [{ text: "Product Design" }],
              [{ text: "Architecture Design" }],
              [{ text: "Software development" }],
              [{ text: "Data Science & Analytics" }],
            ],
            one_time_keyboard: true,
            resize_keyboard: true,
          },
        });
        user.state = event_states.SELECT_INTEREST;
      }

      break;

    case event_states.SELECT_INTEREST:
      //TO ADD CONDITIONAL STATEMENT FOR PREREGISTERED IF FALSE THEN GENERATE USING THE SAMPLE
      if (
        ![
          "Robotics & Mechatronics",
          "Product Design",
          "Architecture Design",
          "Software development",
          "Data Science & Analytics",
        ].includes(messageText)
      ) {
        await axios.post(`${API_URL}/sendMessage`, {
          chat_id: chatId,
          text: "Please select one of the provided options.",
          parse_mode: "HTML",
        });
        return;
      }
      user.data.interest = messageText;
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "⌛Generating a personalised digital pass for you. Your pass will be ready in a moment! Please wait patiently...⚡️",
        parse_mode: "HTML", // Enables bold and clean formatting
      });

      //TODO: Generate the pass function

      //TODO store data into firebase
      //  TODO - generate image pass
      user.state = END_FLOW;
      break;

    default:
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "Something went wrong with creating your pass. Please try again later",
        parse_mode: "HTML", // Enables bold and clean formatting
      });
  }
}

module.exports = { EVENT_START, END_FLOW, event_states, handleEventPass };
