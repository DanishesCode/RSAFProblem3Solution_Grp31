const axios = require("axios");

// Exchange code for access token
const githubExchangeCode = async (code) => {
  const response = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code
    },
    { headers: { Accept: "application/json" } }
  );
  return response.data.access_token;
};

// Get GitHub user profile
const githubGetUser = async (accessToken) => {
  const response = await axios.get("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data; // contains id, login, avatar, etc.
};

// Get all repository names for authenticated user
const githubGetRepos = async (accessToken) => {
  const response = await axios.get("https://api.github.com/user/repos", {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { per_page: 100 } // max 100 repos
  });
  return response.data.map(repo => repo.name);
};

module.exports = {
  githubExchangeCode,
  githubGetUser,
  githubGetRepos
};
