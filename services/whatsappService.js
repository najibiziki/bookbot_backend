const axios = require("axios");

const sendMessage = async (phoneId, to, text, accessToken) => {
  try {
    await axios.post(
      `https://graph.facebook.com/v17.0/${phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("WhatsApp API Error:", error.response?.data || error.message);
  }
};

async function sendListMessage({
  phoneId,
  from,
  headerText,
  bodyText,
  buttonText,
  options,
  accessToken,
}) {
  const sections = [
    {
      title: "Services",
      rows: options.map((opt) => ({
        id: opt.id,
        title: opt.title,
        description: opt.desc,
      })),
    },
  ];

  const payload = {
    messaging_product: "whatsapp",
    to: from,
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: headerText,
      },
      body: {
        text: bodyText,
      },

      action: {
        button: buttonText,
        sections: sections,
      },
    },
  };

  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

  await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

module.exports = { sendMessage, sendListMessage };
