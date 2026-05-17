import React, { useState, useEffect } from "react";

const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://stemapp-nieuw.onrender.com";

// ---- ADMIN WACHTWOORD: Zet hier je geheime wachtwoord, hetzelfde als in je backend ----
const ADMIN_PASSWORD = "4sZ_apCc"; // <-- vervang door je echte wachtwoord!

export default function SongfestivalAdminPanel() {
  // ---- Alle React states bovenaan ----
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem("adminLoggedIn") === "true");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [lijnenOpen, setLijnenOpen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Na login: status van lijnen ophalen
  useEffect(() => {
    if (loggedIn) fetchStatus();
    // eslint-disable-next-line
  }, [loggedIn]);

  async function fetchStatus() {
    setLoading(true);
    setMsg("");
    try {
      const resp = await fetch(`${API_URL}/lijnen-status`);
      const data = await resp.json();
      setLijnenOpen(data.open);
    } catch (e) {
      setMsg("Kon status niet ophalen");
    }
    setLoading(false);
  }

  async function setLijnen(open) {
    setLoading(true);
    setMsg("");
    try {
      const resp = await fetch(`${API_URL}/lijnen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": ADMIN_PASSWORD,
        },
        body: JSON.stringify({ open, password: ADMIN_PASSWORD }),
      });
      const data = await resp.json();
      setMsg(data.message);
      setLijnenOpen(data.open);
    } catch (e) {
      setMsg("Fout bij openen/sluiten");
    }
    setLoading(false);
  }

  async function resetStemmen() {
    setLoading(true);
    setMsg("");
    if (!window.confirm("Weet je zeker dat je ALLE stemmen wilt wissen?")) {
      setLoading(false);
      return;
    }
    try {
      const resp = await fetch(`${API_URL}/reset-stemmen`, {
        method: "POST",
        headers: {
          "x-admin-password": ADMIN_PASSWORD,
        },
        body: JSON.stringify({ password: ADMIN_PASSWORD }),
      });
      const data = await resp.json();
      setMsg(data.message);
    } catch (e) {
      setMsg("Fout bij resetten");
    }
    setLoading(false);
  }

  function handleLogout() {
    localStorage.removeItem("adminLoggedIn");
    setLoggedIn(false);
    setMsg("");
  }

  // ---- Login scherm ----
  if (!loggedIn) {
    return (
      <div style={{
        maxWidth: 350,
        margin: "70px auto",
        background: "#fffbe6",
        padding: 32,
        borderRadius: 16,
        boxShadow: "0 2px 16px #0001"
      }}>
        <h2>Admin login</h2>
        <form
          onSubmit={e => {
            e.preventDefault();
            if (pw === ADMIN_PASSWORD) {
              setLoggedIn(true);
              localStorage.setItem("adminLoggedIn", "true");
              setPw("");
              setErr("");
            } else {
              setErr("Wachtwoord onjuist");
            }
          }}>
          <input
            type="password"
            placeholder="Wachtwoord"
            value={pw}
            autoFocus
            onChange={e => setPw(e.target.value)}
            style={{ fontSize: 17, padding: 8, width: "100%" }}
          />
          <button type="submit" style={{ marginTop: 16, width: "100%" }}>Inloggen</button>
        </form>
        <div style={{ color: "red", minHeight: 28, marginTop: 10 }}>{err}</div>
      </div>
    );
  }

  // ---- Admin panel ----
  return (
    <div style={{
      maxWidth: 400,
      margin: "40px auto",
      fontFamily: "sans-serif",
      background: "#fffbe6",
      borderRadius: 16,
      boxShadow: "0 2px 16px #0001",
      padding: 32,
      position: "relative"
    }}>
      <button
        style={{
          position: "absolute",
          top: 20,
          right: 30,
          background: "none",
          border: "none",
          color: "#363171",
          cursor: "pointer",
          fontSize: 14
        }}
        onClick={handleLogout}
        title="Uitloggen"
      >
        Uitloggen
      </button>
      <h2 style={{ color: "#6a1b9a" }}>Songfestival Admin Panel</h2>
      <p>
        <b style={{ color: "#1976d2" }}>Lijnen status:</b>{" "}
        {lijnenOpen === null ? (
          <span style={{ color: "#999" }}>Laden...</span>
        ) : lijnenOpen ? (
          <span style={{ color: "#388e3c", fontWeight: "bold" }}>OPEN</span>
        ) : (
          <span style={{ color: "#d32f2f", fontWeight: "bold" }}>GESLOTEN</span>
        )}
      </p>
      <button
        style={{ marginRight: 10 }}
        disabled={loading || lijnenOpen}
        onClick={() => setLijnen(true)}
      >
        Lijnen openen
      </button>
      <button
        disabled={loading || lijnenOpen === false}
        onClick={() => setLijnen(false)}
        style={{ marginRight: 10 }}
      >
        Lijnen sluiten
      </button>
      <hr style={{ margin: "24px 0" }} />
      <button
        disabled={loading}
        style={{
          background: "#f66",
          color: "#fff",
          padding: "12px 20px",
          border: 0,
          borderRadius: 8
        }}
        onClick={resetStemmen}
      >
        Reset stemmen (alles wissen)
      </button>
      <div style={{ marginTop: 24, minHeight: 30, color: "#363171" }}>{msg}</div>
      <div style={{ marginTop: 30, fontSize: 13, color: "#999" }}>
        <i>Deze pagina is beveiligd met een wachtwoord.</i>
      </div>
    </div>
  );
}
