import React from 'react';
import './Login.css';

const Login = () => {
  const handleGitHubLogin = () => {
    window.location.href = '/github';
  };

  return (
    <div className="login-container">
      <h1>Login</h1>
      <button id="github-login-btn" onClick={handleGitHubLogin}>
        Login with GitHub
      </button>
    </div>
  );
};

export default Login;

