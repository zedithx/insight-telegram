const { db } = require("../utils/firebaseAdmin");
const axios = require("axios");
const EventCache = require("../utils/getEventList"); // ✅ Import the singleton

async function sendEventsList(chatId, API_URL, currentPage, itemsPerPage) {
  try {
    const eventNames = await EventCache.getEvents("24 Feb");
    console.info(`📌 Current Page: ${currentPage}`);

    if (!eventNames || eventNames.length === 0) {
      await axios.post(`${API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "⚠️ No events found.",
        parse_mode: "HTML",
      });
      return;
    }

    const totalPages = Math.ceil(eventNames.length / itemsPerPage);
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    // ✅ Convert events to text-based buttons
    const keyboardButtons = eventNames.slice(startIndex, endIndex).map((event) => [
      { text: event.name }, // ✅ Simple text-based buttons
    ]);

    // ✅ Pagination Buttons
    const paginationButtons = [];
    if (currentPage > 0) {
      paginationButtons.push({ text: "⬅️ Previous" });
    }
    if (currentPage < totalPages - 1) {
      paginationButtons.push({ text: "Next ➡️" });
    }
    if (paginationButtons.length > 0) {
      keyboardButtons.push(paginationButtons);
    }

    // ✅ "Finish Selection" Button
    keyboardButtons.push([{ text: "✅ Finish Selection" }]);

    // ✅ Send reply keyboard
    await axios.post(`${API_URL}/sendMessage`, {
      chat_id: chatId,
      text: "Select the events you are interested in. Reminders are set automatically. Click **Finish ✅** when done.",
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: keyboardButtons,
        resize_keyboard: true, // ✅ Adjust size for better UI
        one_time_keyboard: false, // ✅ Keep keyboard open for multiple selections
      },
    });
  } catch (error) {
    console.error("❌ Error sending events:", error.message);
    await axios.post(`${API_URL}/sendMessage`, {
      chat_id: chatId,
      text: "⚠️ An error occurred. Please try again.",
      parse_mode: "HTML",
    });
  }
}

module.exports = { sendEventsList };