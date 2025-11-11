const {
    githubExchangeCode,
    githubGetUser,
    githubGetRepos,
    saveGitData
  } = require("../models/githubModel");
  
  // Redirect user to GitHub login
  const githubRedirect = (req, res) => {
    const url = "https://github.com/login/oauth/authorize";
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      scope: "read:user repo" // repo scope needed for private repos
    });
    res.redirect(`${url}?${params.toString()}`);
  };
  
  // GitHub callback
  const githubCallback = async (req, res) => {
    try {
      const code = req.query.code;
      const accessToken = await githubExchangeCode(code);
  
      const user = await githubGetUser(accessToken); // GitHub user profile
      const repos = await githubGetRepos(accessToken); // list of repo names
  
      let data = await saveGitData(user.id)
      res.send(`
        <h1>Redirecting please wait..</h1>
        <script>
          localStorage.setItem("githubId", ${user.id});
          localStorage.setItem("userId", ${data.userId});
          localStorage.setItem("repos", ${JSON.stringify(repos)});
          window.location.href = "../index.html";
        </script>
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
  