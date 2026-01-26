const axios = require("axios");
const {
  githubExchangeCode,
  githubGetUser,
  githubGetRepos,
  saveGitData,
  getGitHubAccessToken,
  pushFileToGitHub,
  getFileSha,
  createBranch
} = require("../models/githubModel");

// Redirect user to GitHub login
const githubRedirect = (req, res) => {
  try {
    if (!process.env.GITHUB_CLIENT_ID) {
      console.error("GITHUB_CLIENT_ID is not set");
      return res.status(500).send("GitHub OAuth not configured");
    }

    const url = "https://github.com/login/oauth/authorize";
    const redirectUri = `${req.protocol}://${req.get("host")}/github/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      scope: "read:user repo", // repo scope needed for private repos
      redirect_uri: redirectUri
    });

    const redirectUrl = `${url}?${params.toString()}`;
    console.log("Redirecting to GitHub:", redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in githubRedirect:", error);
    res.status(500).send("Failed to initiate GitHub OAuth");
  }
};

// GitHub callback
const githubCallback = async (req, res) => {
  try {
    const code = req.query.code;
    const redirectUri = `${req.protocol}://${req.get("host")}/github/callback`;

    const accessToken = await githubExchangeCode(code, redirectUri);

    const user = await githubGetUser(accessToken);  // GitHub user profile
    const repos = await githubGetRepos(accessToken); // list of repo names

    // ✅ Firestore: save BOTH githubId + githubName + accessToken (for API operations)
    const data = await saveGitData(user.id, user.login, accessToken);

    res.send(`
      <h1>Redirecting please wait..</h1>
      <script>
        localStorage.setItem("githubId", ${JSON.stringify(user.id)});
        localStorage.setItem("userId", ${JSON.stringify(data.userId)});
        localStorage.setItem("repos", ${JSON.stringify(repos)});
        window.location.href = "/";
      </script>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("GitHub OAuth failed");
  }
};

// Get user by githubId
const getUserByGithubId = async (req, res) => {
  try {
    const { githubId } = req.params;
    const { getUserByGithubId: getUser } = require("../models/githubModel");
    
    const user = await getUser(githubId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json(user);
  } catch (err) {
    console.error("Error getting user:", err);
    res.status(400).json({ error: err.message || "Failed to get user" });
  }
};

/**
 * POST /github/push-code
 * Push code to GitHub repository
 * Body: { githubId, owner, repo, filePath, content, message, branch?, createBranch? }
 */
const pushCodeToGitHub = async (req, res) => {
  try {
    const { githubId, owner, repo, filePath, content, message, branch = "main", createNewBranch = false } = req.body;

    if (!githubId || !owner || !repo || !filePath || !content || !message) {
      return res.status(400).json({ 
        error: "Missing required fields: githubId, owner, repo, filePath, content, message" 
      });
    }

    // Get access token for user
    const accessToken = await getGitHubAccessToken(githubId);
    if (!accessToken) {
      return res.status(401).json({ error: "GitHub access token not found. Please re-authenticate." });
    }

    let targetBranch = branch;

    // Create new branch if requested
    if (createNewBranch) {
      try {
        const branchResult = await createBranch(accessToken, owner, repo, targetBranch);
        if (branchResult && !branchResult.exists) {
          console.log(`Branch "${targetBranch}" created successfully`);
          // Small delay to ensure branch is fully created
          await new Promise(resolve => setTimeout(resolve, 500));
        } else if (branchResult && branchResult.exists) {
          console.log(`Branch "${targetBranch}" already exists, using existing branch`);
        }
      } catch (error) {
        // If branch creation fails, we can't proceed
        console.error("Failed to create branch:", error.message);
        return res.status(500).json({ 
          error: `Failed to create branch "${targetBranch}": ${error.message}` 
        });
      }
    }

    // Verify branch exists before trying to push (with retry logic)
    let branchExists = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const branchCheckUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`;
        await axios.get(branchCheckUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        });
        branchExists = true;
        break;
      } catch (error) {
        if (error.response?.status === 404) {
          // Branch doesn't exist yet, wait and retry if we just created it
          if (createNewBranch && attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          return res.status(404).json({ 
            error: `Branch "${targetBranch}" does not exist. Please create it first or use an existing branch.` 
          });
        }
        throw error;
      }
    }

    if (!branchExists) {
      return res.status(404).json({ 
        error: `Branch "${targetBranch}" does not exist after creation attempts.` 
      });
    }

    // Get file SHA if file exists (for updates)
    let sha = null;
    try {
      sha = await getFileSha(accessToken, owner, repo, filePath, targetBranch);
    } catch (error) {
      // File doesn't exist, will create new file
      console.log("File doesn't exist, will create new file");
    }

    // Push file to GitHub
    const result = await pushFileToGitHub(
      accessToken,
      owner,
      repo,
      filePath,
      content,
      message,
      targetBranch,
      sha
    );

    res.json({
      success: true,
      message: "Code pushed to GitHub successfully",
      commit: {
        sha: result.commit.sha,
        message: result.commit.message,
        url: result.commit.html_url,
      },
      content: {
        path: result.content.path,
        sha: result.content.sha,
        url: result.content.html_url,
      },
    });
  } catch (error) {
    console.error("Error pushing code to GitHub:", error);
    res.status(500).json({ 
      error: error.message || "Failed to push code to GitHub" 
    });
  }
};

module.exports = {
  githubRedirect,
  githubCallback,
  getUserByGithubId,
  pushCodeToGitHub
};
