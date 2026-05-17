import React, { useState } from "react";

const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://stemapp-nieuw.onrender.com";

export default function Results() {
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  const fetchResults = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const resp = await fetch(
        `${API_URL}/results?password=${encodeURIComponent(password)}`
      );

      if (resp.status === 401) {
        setError("Wachtwoord onjuist.");
        setLoading(false);
        return;
      }

      const data = await resp.json();

      if (!resp.ok) {
        setError("Kon resultaten niet ophalen.");
      } else {
        setSubmitted(true);
        setResults(data);
      }
    } catch {
      setError("Kon resultaten niet ophalen.");
    }

    setLoading(false);
  };

  if (!submitted) {
    return (
      <div
        style={{
          maxWidth: 400,
          margin: "70px auto",
          background: "#fffbe6",
          padding: 32,
          borderRadius: 16,
          boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ color: "#6a1b9a", marginTop: 0 }}>Resultaten bekijken</h2>

        <form onSubmit={fetchResults}>
          <input
            type="password"
            placeholder="Admin-wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              fontSize: 17,
              padding: 10,
              width: "100%",
              boxSizing: "border-box",
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />

          <button
            type="submit"
            style={{
              marginTop: 16,
              width: "100%",
              padding: 12,
              border: "none",
              borderRadius: 8,
              background: "#6a1b9a",
              color: "white",
              fontWeight: "bold",
              fontSize: 16,
              cursor: "pointer",
            }}
            disabled={loading}
          >
            {loading ? "Laden..." : "Resultaten tonen"}
          </button>
        </form>

        <div style={{ color: "red", minHeight: 28, marginTop: 10 }}>{error}</div>
      </div>
    );
  }

  const uitslag = results?.uitslag || [];
  const jury = results?.jury || {};

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)",
        padding: "40px 20px",
        color: "white",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1
          style={{
            textAlign: "center",
            marginBottom: 10,
            fontSize: "2.2rem",
          }}
        >
          Songfestival Resultaten
        </h1>

        <p
          style={{
            textAlign: "center",
            opacity: 0.9,
            marginBottom: 30,
          }}
        >
          Overzicht van de totaalscores per school
        </p>

        <div
          style={{
            background: "white",
            color: "#222",
            borderRadius: 18,
            padding: 24,
            boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
            marginBottom: 30,
          }}
        >
          <h2 style={{ marginTop: 0, color: "#6a1b9a" }}>Einduitslag</h2>

          <div style={{ display: "grid", gap: 14 }}>
            {uitslag.map((item, index) => (
              <div
                key={item.school}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  borderRadius: 12,
                  background:
                    index === 0
                      ? "#fff3cd"
                      : index === 1
                      ? "#f1f3f5"
                      : index === 2
                      ? "#f8e5d0"
                      : "#f8f9fa",
                  border:
                    index === 0
                      ? "2px solid #f4c542"
                      : "1px solid #e9ecef",
                  fontWeight: index < 3 ? "bold" : "normal",
                }}
              >
                <span>
                  {index + 1}. {item.school}
                </span>
                <span>{item.punten} punten</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "white",
            color: "#222",
            borderRadius: 18,
            padding: 24,
            boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
          }}
        >
          <h2 style={{ marginTop: 0, color: "#6a1b9a" }}>Jurypunten</h2>

          {Object.keys(jury).length === 0 ? (
            <p>Geen jurygegevens beschikbaar.</p>
          ) : (
            Object.entries(jury).map(([juryNaam, scores]) => (
              <div key={juryNaam} style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 10 }}>{juryNaam}</h3>

                <div
                  style={{
                    overflowX: "auto",
                    border: "1px solid #eee",
                    borderRadius: 12,
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: 400,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#f8f9fa" }}>
                        <th
                          style={{
                            textAlign: "left",
                            padding: 12,
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          School
                        </th>
                        <th
                          style={{
                            textAlign: "right",
                            padding: 12,
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          Punten
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(scores)
                        .sort((a, b) => b[1] - a[1])
                        .map(([school, punten]) => (
                          <tr key={school}>
                            <td
                              style={{
                                padding: 12,
                                borderBottom: "1px solid #f1f1f1",
                              }}
                            >
                              {school}
                            </td>
                            <td
                              style={{
                                padding: 12,
                                textAlign: "right",
                                borderBottom: "1px solid #f1f1f1",
                                fontWeight: 600,
                              }}
                            >
                              {punten}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}