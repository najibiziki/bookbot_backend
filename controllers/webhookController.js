const { processMessage } = require("../services/boockingService");

exports.verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  console.log(token, mode);
  if (mode && token) {
    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }
  res.sendStatus(400);
};

exports.receiveMessage = async (req, res) => {
  const data = req.body;
  console.log(data);
  res.sendStatus(200);

  if (data.object && data.entry) {
    for (const entry of data.entry) {
      for (const change of entry.changes) {
        if (change.field === "messages") {
          if (change.value.messages && change.value.messages.length > 0) {
            const message = change.value.messages[0];
            const phoneId = change.value.metadata.phone_number_id;
            const from = message.from;

            let text = "";

            if (message.type === "text") {
              text = message.text.body;
            } else if (message.type === "interactive") {
              const interactive = message.interactive;

              if (interactive.type === "list_reply") {
                text = interactive.list_reply.id;
              } else if (interactive.type === "button_reply") {
                text = interactive.button_reply.id;
              } else {
                text =
                  interactive.button_reply?.id ||
                  interactive.list_reply?.id ||
                  "";
              }
            }

            try {
              await processMessage(from, text, phoneId);
            } catch (err) {
              console.error("Error processing message:", err);
            }
          }
        }
      }
    }
  }
};
