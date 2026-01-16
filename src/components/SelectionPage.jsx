import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./SelectionPage.css";

export default function SelectionPage() {
  const navigate = useNavigate();

  // Check authentication - redirect to login if no githubId
  useEffect(() => {
    const githubId = localStorage.getItem("githubId");
    if (!githubId) {
      console.log("[SelectionPage] No githubId found, redirecting to login");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("githubId");
    localStorage.removeItem("userId");
    localStorage.removeItem("repos");

    navigate("/login", { replace: true });
  };

  return (
    <div className="dash">
      <div className="dash-container">

        {/* ===== TOP BAR ===== */}
        <div className="dash-topbar">
          <h1 className="dash-title">Back Agent Dashboard</h1>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* ===== SELECTION CARDS ===== */}
        <div className="dash-grid">

          {/* ---- My Board ---- */}
          <section
            className="dash-card"
            onClick={() => navigate("/myboards")}
          >
            <div className="card-header">
              <h2 className="card-title">My Board</h2>
            </div>

            <div className="card-body">
              <img
                className="card-illustration"
                src="/img/pcIcon.png"
                alt="Board"
              />
            </div>
          </section>

          {/* ---- Collaborations ---- */}
          <section
            className="dash-card"
            onClick={() => navigate("/collaborations")}
          >
            <div className="card-header center">
              <h2 className="card-title">Collaborations</h2>
            </div>

            <div className="card-body">
              <img
                className="card-illustration"
                src="/img/collabIcon.png"
                alt="Collaborations"
              />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
