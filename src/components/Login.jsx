import React from "react";
import "./Login.css";

export default function Login() {
  return (
    <div className="page page--login">
      <main className="loginShell">
        <section className="brandPanel" aria-label="About Agentic">
          <div className="brand">
  <div className="logo">AI</div>

  <div className="brandText">
    <div className="brandName">Agentic</div>
    <div className="brandTagline">AI Agent Kanban Dashboard</div>
  </div>


          </div>

          <h2 className="brandSubtitle">
            Keep your agents, tasks, and repos in one board.
          </h2>

          <p className="brandDesc">
            Sign in with GitHub to sync repos and manage work across your To Do, In Progress, Review, and Done lanes.
          </p>

          <ul className="featureList">
            <li>Auto-link tasks to GitHub repos</li>
            <li>Track AI agent status (Claude / Gemini / OpenAI)</li>
            <li>Clean dashboard UI with priority tags</li>
          </ul>
        </section>

        <section className="loginCard" aria-label="Sign in">
          <header className="loginHeader">
            <h1>Sign in</h1>
            <p>Use your GitHub account to continue.</p>
          </header>

          <a className="btnSecondary" href="/github">
            Continue with GitHub
          </a>


          <p className="note">
            By continuing, you agree to our Terms and Privacy Policy.
          </p>
        </section>
      </main>
    </div>
  );
}
