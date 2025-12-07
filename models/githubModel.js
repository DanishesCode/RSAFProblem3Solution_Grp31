const axios = require("axios");
const sql = require("mssql");
const { dbConfig } = require("../dbConfig");


// Exchange code for access token
const githubExchangeCode = async (code, redirectUri) => {
  const response = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri
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

async function saveGitData(githubId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);

    const query = `
      IF NOT EXISTS (SELECT 1 FROM Login WHERE githubId = @githubId)
      BEGIN
        INSERT INTO Login (githubId)
        VALUES (@githubId);
      END;

      SELECT *
      FROM Login
      WHERE githubId = @githubId;
    `;

    const request = connection.request();
    request.input("githubId", githubId);

    const result = await request.query(query);

    // The SELECT result is always in result.recordsets[1] or result.recordset
    return result.recordset[0]; // return the row
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
