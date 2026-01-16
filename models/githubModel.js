const axios = require("axios");
const { db } = require("../firebaseAdmin"); // uses your Admin SDK init

// Use your existing collection name in Firestore (you showed "user")
const USERS_COLLECTION = "user";

// Exchange code for access token
const githubExchangeCode = async (code, redirectUri) => {
  const response = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri,
    },
    { headers: { Accept: "application/json" } }
  );
  return response.data.access_token;
};

// Get GitHub user profile
const githubGetUser = async (accessToken) => {
  const response = await axios.get("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data; // contains id, login, avatar, etc.
};

// Get all repository names for authenticated user
const githubGetRepos = async (accessToken) => {
  const response = await axios.get("https://api.github.com/user/repos", {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { per_page: 100 }, // max 100 repos
  });
  return response.data.map((repo) => repo.name);
};

/**
 * Firestore replacement for MSSQL Login table.
 *
 * Creates/updates a user doc keyed by githubId.
 * Returns an object similar to what your SQL row gave you.
 */
async function saveGitData(githubId, githubName = "") {
  try {
    const docId = String(githubId);
    const ref = db.collection(USERS_COLLECTION).doc(docId);

    // Create if missing, update if exists
    const payload = {
      githubId: Number(githubId) || githubId, // keep numeric if possible
      githubName: githubName || "",
      updatedAt: new Date(),
    };

    // Merge avoids overwriting other fields you might store later
    await ref.set(payload, { merge: true });

    const snap = await ref.get();
    return { userId: snap.id, ...snap.data() };
  } catch (error) {
    console.error("Firestore error:", error);
    throw error;
  }
}

/**
 * Get user data by githubId from Firestore
 */
async function getUserByGithubId(githubId) {
  try {
    const docId = String(githubId);
    const ref = db.collection(USERS_COLLECTION).doc(docId);
    const snap = await ref.get();
    
    if (!snap.exists) {
      return null;
    }
    
    return { userId: snap.id, ...snap.data() };
  } catch (error) {
    console.error("Error getting user by githubId:", error);
    throw error;
  }
}

module.exports = {
  githubExchangeCode,
  githubGetUser,
  githubGetRepos,
  saveGitData,
  getUserByGithubId,
};
