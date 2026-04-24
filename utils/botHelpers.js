function getServiceOptions(business) {
  return business.services.map((s) => ({
    id: s.id,
    title: s.name,
    desc: `${s.duration} minutes | Base price: $${s.price}`,
  }));
}

function buildServiceTemplate(business, type) {
  let header, body, button;

  if (type === "greeting") {
    header = `${business.name}`;
    body = `Hi! I'm ${business.owner}. Happy to help you choose a service:`;
    button = "View Services";
  } else {
    header = "Services";
    body = "Please select a service from the list below:";
    button = "Show Services";
  }

  return {
    header,
    body,
    button,
    options: getServiceOptions(business),
  };
}

async function matchService(text, business) {
  let serviceMatch = business.services.find(
    (s) =>
      s._id.toString() === text ||
      s.name.trim().toLowerCase() === text.trim().toLowerCase(),
  );

  if (serviceMatch) return serviceMatch;

  const servicesList = business.services.map((s) => s.name).join(", ");

  const prompt = `
    User said: "${text}"
    Available Services (Database Names): ${servicesList}
    
    Identify which service user wants based on meaning.
    Return ONLY the exact Database Name of the service.
    If unsure, return null.
  `;

  try {
    let aiRaw = await getAIResponse(prompt, text).then((r) =>
      r
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim(),
    );

    if (aiRaw && aiRaw !== "null") {
      serviceMatch = business.services.find(
        (s) => s.name.trim().toLowerCase() === aiRaw.trim().toLowerCase(),
      );
    }
  } catch (e) {
    console.log("AI Service Match failed, relying on keywords");
  }

  return serviceMatch;
}
module.exports = {
  getServiceOptions,
  buildServiceTemplate,
  matchService,
};
