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
async function saveGitData(githubId, githubName = "", accessToken = null) {
  try {
    const docId = String(githubId);
    const ref = db.collection(USERS_COLLECTION).doc(docId);

    // Create if missing, update if exists
    const payload = {
      githubId: Number(githubId) || githubId, // keep numeric if possible
      githubName: githubName || "",
      updatedAt: new Date(),
    };

    // Store access token if provided (for GitHub API operations)
    if (accessToken) {
      payload.githubAccessToken = accessToken; // Store securely - consider encryption in production
    }

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

/**
 * Get GitHub access token for a user
 */
async function getGitHubAccessToken(githubId) {
  try {
    const docId = String(githubId);
    const ref = db.collection(USERS_COLLECTION).doc(docId);
    const snap = await ref.get();
    
    if (!snap.exists) {
      return null;
    }
    
    const data = snap.data();
    return data.githubAccessToken || null;
  } catch (error) {
    console.error("Error getting GitHub access token:", error);
    throw error;
  }
}

/**
 * Push code to GitHub repository
 * @param {string} accessToken - GitHub access token
 * @param {string} owner - Repository owner (username or org)
 * @param {string} repo - Repository name
 * @param {string} filePath - File path in repository (e.g., "src/index.js")
 * @param {string} content - File content (base64 encoded)
 * @param {string} message - Commit message
 * @param {string} branch - Branch name (default: "main")
 * @param {string} sha - File SHA if updating existing file (optional)
 */
async function pushFileToGitHub(accessToken, owner, repo, filePath, content, message, branch = "main", sha = null) {
  try {
    // GitHub API requires base64 encoded content
    const base64Content = Buffer.from(content, 'utf8').toString('base64');

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    
    const payload = {
      message: message,
      content: base64Content,
      branch: branch,
    };

    // If updating existing file, include SHA
    if (sha) {
      payload.sha = sha;
    }

    const response = await axios.put(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error pushing file to GitHub:", error.response?.data || error.message);
    throw new Error(`Failed to push file to GitHub: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Get file SHA from GitHub (needed for updating existing files)
 */
async function getFileSha(accessToken, owner, repo, filePath, branch = "main") {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      params: {
        ref: branch,
      },
    });

    return response.data.sha;
  } catch (error) {
    // File doesn't exist yet, return null
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get the default branch of a repository
 */
async function getDefaultBranch(accessToken, owner, repo) {
  try {
    const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const response = await axios.get(repoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    return response.data.default_branch || "main";
  } catch (error) {
    console.error("Error getting default branch:", error.message);
    // Fallback to "main", then "master"
    return "main";
  }
}

/**
 * Create a new branch in GitHub repository
 */
async function createBranch(accessToken, owner, repo, branchName, baseBranch = null) {
  try {
    // If no base branch specified, get the default branch from repository
    if (!baseBranch) {
      baseBranch = await getDefaultBranch(accessToken, owner, repo);
    }

    // First, get the SHA of the base branch
    const baseBranchUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`;
    let baseResponse;
    try {
      baseResponse = await axios.get(baseBranchUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
    } catch (error) {
      // If "main" doesn't exist, try "master"
      if (error.response?.status === 404 && baseBranch === "main") {
        console.log(`Base branch "main" not found, trying "master"...`);
        baseBranch = "master";
        const masterBranchUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/master`;
        baseResponse = await axios.get(masterBranchUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        });
      } else {
        throw error;
      }
    }

    if (!baseResponse.data || !baseResponse.data.object) {
      throw new Error(`Failed to get base branch ${baseBranch}: Invalid response`);
    }

    const baseSha = baseResponse.data.object.sha;

    // Create new branch
    const createBranchUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs`;
    const response = await axios.post(createBranchUrl, {
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
    });

    console.log(`Branch "${branchName}" created successfully from "${baseBranch}"`);
    return response.data;
  } catch (error) {
    // Branch might already exist (422 = Unprocessable Entity)
    if (error.response?.status === 422) {
      // Check if it's because branch already exists
      const errorMessage = error.response?.data?.message || "";
      if (errorMessage.includes("already exists") || errorMessage.includes("Reference already exists")) {
        console.log(`Branch "${branchName}" already exists`);
        return { message: "Branch already exists", exists: true };
      }
      throw new Error(`Failed to create branch: ${errorMessage}`);
    }
    console.error("Error creating branch:", error.response?.data || error.message);
    throw new Error(`Failed to create branch: ${error.response?.data?.message || error.message}`);
  }
}

module.exports = {
  githubExchangeCode,
  githubGetUser,
  githubGetRepos,
  saveGitData,
  getUserByGithubId,
  getGitHubAccessToken,
  pushFileToGitHub,
  getFileSha,
  createBranch,
};
