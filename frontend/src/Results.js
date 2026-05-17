import React, { useState } from "react";

const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://backend-theaterscholensongfestival.onrender.com";

export default function Results() {
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");

  const fetchResults = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setHtml("");
    try {
      const resp = await fetch(`${API_URL}/results?password=${encodeURIComponent(password)}`);
      const txt = await resp.text();
      if (resp.status === 401 || txt.includes("Niet geautoriseerd")) {
        setError("Wachtwoord onjuist.");
      } else {
        setSubmitted(true);
        setHtml(txt);
      }
    } catch {
      setError("Kon resultaten niet ophalen.");
    }
    setLoading(false);
  };

  if (!submitted) {
    return (
      <div style={{
        maxWidth: 350,
        margin: "70px auto",
        background: "#fffbe6",
        padding: 32,
        borderRadius: 16,
        boxShadow: "0 2px 16px #0001"
      }}>
        <h2 style={{ color: "#6a1b9a" }}>Resultaten bekijken</h2>
        <form onSubmit={fetchResults}>
          <input
            type="password"
            placeholder="Admin-wachtwoord"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ fontSize: 17, padding: 8, width: "100%" }}
          />
          <button type="submit" style={{ marginTop: 16, width: "100%" }} disabled={loading}>
            {loading ? "Laden..." : "Resultaten tonen"}
          </button>
        </form>
        <div style={{ color: "red", minHeight: 28, marginTop: 10 }}>{error}</div>
      </div>
    );
  }

  // Inject de HTML van de backend
  return (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  );
}
