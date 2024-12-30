// Function to handle registration flow
import {REG_FINISH} from "./registration";

const axios = require("axios");

export const event_states = {
  SELECT_GENDER: "SELECT_GENDER",
  SELECT_PILLAR: "SELECT_PILLAR",
  SELECT_INTEREST: "SELECT_INTEREST",
  END_EVENT: "END_EVENT",
};

export const EVENT_START = event_states.SELECT_GENDER
export const END_FLOW = event_states.END_FLOW

export async function handleEventPass(chatId, messageText, user, API_URL) {

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
        text: "🌟<b>Wonderful</b>🌟\n\n" +
        "Now, is there any course of study you are particularly interested in? 👇\n" +
        "1️⃣ <b>Computer Science and Design (CSD)</b>\n" +
        "2️⃣ <b>Architecture and Sustainable Design (ASD)</b>\n" +
        "3️⃣ <b>Engineering Systems and Design (ESD)</b>\n" +
        "4️⃣ <b>Engineering Product Development (EPD)</b>\n" +
        "5️⃣ <b>Design and Artificial Intelligence (DAI)</b>\n" +
        "6️⃣ <b>None</b>",
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [
            [{ text: "CSD" }],
            [{ text: "ASD" }],
            [{ text: "ESD" }],
            [{ text: "EPD" }],
            [{ text: "DAI" }],
            [{ text: "None" }],
          ],
          one_time_keyboard: true,
          resize_keyboard: true,
        },
      });
      user.state = event_states.SELECT_PILLAR;
      break;

    case event_states.SELECT_PILLAR:
      if (!["Prospective Student", "Parent", "Other"].includes(messageText)) {
        await axios.post(`${API_URL}/sendMessage`, {
          chat_id: chatId,
          text: "Please select one of the provided options.",
          parse_mode: "HTML",
        });
        return;
      }
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "Lastly, 🌟 Let's get to know you better! 🌟\n" +
            "What are your interests?" +
            "<b>🔬 Science & Technology</b>" +
            "<b>🎨 Art & Design</b>" +
            "<b>💻 Coding & Programming</b>" +
            "<b>🌿 Sustainability</b>" +
            "<b>🤖 Artificial Intelligence</b>" +
            "<b>🏗️ Architecture</b>" +
            "<b>🎮 Gaming</b>" +
            "<b>📊 Data Analysis</b>",
        parse_mode: "HTML", // Enables bold and clean formatting
        reply_markup: {
          keyboard: [
            [{ text: "Science & Technology" }],
            [{ text: "Art & Design" }],
            [{ text: "Coding & Programming" }],
            [{ text: "Sustainability" }],
            [{ text: "Artificial Intelligence" }],
            [{ text: "Architecture" }],
            [{ text: "Gaming" }],
            [{ text: "Data Analysis" }],
          ],
          one_time_keyboard: true,
          resize_keyboard: true,
        },
      });
      user.state = event_states.SELECT_INTEREST;
      break;

    case event_states.SELECT_INTEREST:
      if (!["Science & Technology", "Art & Design", "Coding & Programming", "Sustainability",
      "Artificial Intelligence", "Architecture"].includes(messageText)) {
        await axios.post(`${API_URL}/sendMessage`, {
          chat_id: chatId,
          text: "Please select one of the provided options.",
          parse_mode: "HTML",
        });
        return;
      }
      await axios.post(`${API_URL}/sendMessage`, {
          chat_id: chatId,
          text: "⌛Generating a personalised digital pass for you. Your pass will be ready in a moment! Please wait patiently...⚡️",
          parse_mode: "HTML" // Enables bold and clean formatting
        });
      user.state = END_FLOW;
      break;

    default:
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "Something went wrong with creating your pass. Please try again later",
        parse_mode: "HTML" // Enables bold and clean formatting
      });
  }
}