const {
    githubExchangeCode,
    githubGetUser,
    githubGetRepos,
    saveGitData
  } = require("../models/githubModel");
  
  // Redirect user to GitHub login
  const githubRedirect = (req, res) => {
    try {
      if (!process.env.GITHUB_CLIENT_ID) {
        console.error('GITHUB_CLIENT_ID is not set');
        return res.status(500).send('GitHub OAuth not configured');
      }
      
      const url = "https://github.com/login/oauth/authorize";
      const redirectUri = `${req.protocol}://${req.get('host')}/github/callback`;
      const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        scope: "read:user repo", // repo scope needed for private repos
        redirect_uri: redirectUri
      });
      
      const redirectUrl = `${url}?${params.toString()}`;
      console.log('Redirecting to GitHub:', redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error in githubRedirect:', error);
      res.status(500).send('Failed to initiate GitHub OAuth');
    }
  };
  
  // GitHub callback
  const githubCallback = async (req, res) => {
    try {
      const code = req.query.code;
      const redirectUri = `${req.protocol}://${req.get('host')}/github/callback`;
      const accessToken = await githubExchangeCode(code, redirectUri);
  
      const user = await githubGetUser(accessToken); // GitHub user profile
      const repos = await githubGetRepos(accessToken); // list of repo names
  
      let data = await saveGitData(user.id)
      res.send(`
        <h1>Redirecting please wait..</h1>
        <script>
          localStorage.setItem("githubId", ${user.id});
          localStorage.setItem("userId", ${data.userId});
          localStorage.setItem("repos", ${JSON.stringify(repos)});
          window.location.href = "/";
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
