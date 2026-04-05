const SESSION_TTL = 15 * 60 * 1000;

const sessions = {};

function getSession(from) {
  const now = Date.now();

  if (sessions[from] && sessions[from].expiresAt < now) {
    delete sessions[from];
  }

  if (!sessions[from]) {
    sessions[from] = {
      stage: "GREETING",
      data: {},
      expiresAt: now + SESSION_TTL,
    };
  } else {
    sessions[from].expiresAt = now + SESSION_TTL;
  }

  return sessions[from];
}

function resetSession(from) {
  delete sessions[from];
}

module.exports = { getSession, resetSession };
