const axios = require("axios");

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

const githubGetUser = async (accessToken) => {
  const response = await axios.get("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  return response.data;
};

module.exports = {
  githubExchangeCode,
  githubGetUser
};
