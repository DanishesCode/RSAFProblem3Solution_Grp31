const {
    githubExchangeCode,
    githubGetUser
  } = require("../models/githubModel");
  
  const githubRedirect = (req, res) => {
    const redirectUrl = "https://github.com/login/oauth/authorize";
  
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      scope: "read:user user:email"
    });
  
    res.redirect(`${redirectUrl}?${params.toString()}`);
  };
  
  const githubCallback = async (req, res) => {
    try {
      const code = req.query.code;
  
      const accessToken = await githubExchangeCode(code);
      const user = await githubGetUser(accessToken);
  
      console.log(user);
  
      res.send(`
        <h1>Logged in as ${user.login}</h1>
        <img src="${user.avatar_url}" width="120"/>
      `);
  
    } catch (err) {
      console.error(err);
      res.status(500).send("GitHub OAuth failed");
    }
  };
  
  module.exports = {
    githubRedirect,
    githubCallback
  };
  