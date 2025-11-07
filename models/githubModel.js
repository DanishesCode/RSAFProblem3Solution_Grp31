const axios = require("axios");
const sql = require("mssql");
const { dbConfig } = require("../dbConfig");


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

async function saveGitData(user) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);

    const query = `
      IF NOT EXISTS (SELECT 1 FROM Login WHERE githubId = @githubId)
      BEGIN
        INSERT INTO Login (githubId) VALUES (@githubId);
      END
    `;

    const request = connection.request();
    request.input("githubId", user); // user is the GitHub ID

    await request.query(query);

    return true; // success, whether inserted or skipped
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error closing connection:", closeError);
      }
    }
  }
}

  

module.exports = {
  githubExchangeCode,
  githubGetUser,
  githubGetRepos,
  saveGitData
};
