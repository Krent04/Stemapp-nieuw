import React, { useState, useEffect } from "react";

const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://stemapp-nieuw.onrender.com";

const BACKEND_URL = API_URL; // Gebruik deze als prefix voor je foto's!

const ADMIN_PASSWORD = "4sZ_apCc"; // Zet dit gelijk aan je backend admin wachtwoord

const SCHOLEN = [
  "Antwerpen", "Arnhem", "ATKA", "Brussel", "Den Bosch", "Filmacademie",
  "Gent", "Leuven", "Maastricht", "Rotterdam", "Tilburg", "Utrecht"
];

export default function HoofdadminPanel() {
  const [pw, setPw] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [allAanvragen, setAllAanvragen] = useState({});
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchAll() {
    setLoading(true);
    setErr(""); setMsg("");
    try {
      const resp = await fetch(`${API_URL}/hoofdadmin-aanvragen`, {
        headers: { "x-admin-password": ADMIN_PASSWORD }
      });
      const data = await resp.json();
      setAllAanvragen(data || {});
    } catch {
      setErr("Fout bij ophalen.");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (loggedIn) fetchAll();
    // eslint-disable-next-line
  }, [loggedIn]);

  function handleLogin(e) {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      setLoggedIn(true);
      setErr("");
    } else {
      setErr("Wachtwoord onjuist.");
    }
  }

  return !loggedIn ? (
    <div style={{
      maxWidth:350, margin:"70px auto", background:"#fffbe6", padding:32, borderRadius:16, boxShadow:"0 2px 16px #0001"
    }}>
      <h2>Hoofdadmin login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="password"
          placeholder="Hoofdadmin-wachtwoord"
          value={pw}
          autoFocus
          onChange={e => setPw(e.target.value)}
          style={{ fontSize:17, padding:8, width:"100%" }}
        />
        <button type="submit" style={{marginTop:16, width:"100%"}}>Inloggen</button>
      </form>
      <div style={{color:"red", minHeight:28, marginTop:10}}>{err}</div>
    </div>
  ) : (
    <div style={{maxWidth:800, margin:"30px auto", background:"#fffbe6", borderRadius:16, boxShadow:"0 2px 16px #0001", padding:32}}>
      <h2 style={{color:"#6a1b9a"}}>Overzicht aanvragen per school</h2>
      {loading && <p>Laden...</p>}
      {msg && <div style={{color:"green"}}>{msg}</div>}
      {err && <div style={{color:"red"}}>{err}</div>}
      {SCHOLEN.map(school => (
        <div key={school} style={{marginBottom:30}}>
          <h3 style={{color:"#0038ff",marginBottom:4}}>{school}</h3>
          <ul style={{listStyle:"none",padding:0}}>
            {(allAanvragen[school]||[]).length === 0 ? (
              <li style={{color:"#888"}}>Geen aanvragen.</li>
            ) : (
              allAanvragen[school].map(a => (
                <li key={a.id} style={{
                  background:"#fff",marginBottom:10,padding:10,borderRadius:8,boxShadow:"0 1px 4px #0001"
                }}>
                  <b style={{ color: "#23214b" }}>{a.naam}</b>
                  <span style={{ color: "#23214b" }}> ({a.email})</span><br/>
                  <span style={{fontSize:13, color: "#6a1b9a"}}>Status: {a.status}</span><br/>
                  {a.fotoUrl && (
                    <div>
                      <img src={BACKEND_URL + a.fotoUrl} alt="foto" style={{height:60,margin:"8px 0",borderRadius:8}} />
                    </div>
                  )}
                  {a.stemcode && <div><b>Stemcode:</b> <code>{a.stemcode}</code></div>}
                  {a.goedgekeurdDoor && a.goedgekeurdDoor.length > 0 && (
                    <div style={{fontSize:13, color:"green"}}>Goedgekeurd door: {a.goedgekeurdDoor.join(", ")}</div>
                  )}
                  {a.afgekeurdDoor && a.afgekeurdDoor.length > 0 && (
                    <div style={{fontSize:13, color:"red"}}>Afgekeurd door: {a.afgekeurdDoor.join(", ")}</div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
