import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://stemapp-nieuw.onrender.com";

const BACKEND_URL = API_URL; // Gebruik deze als prefix voor je foto's!

const SUBADMIN_WACHTWOORDEN = {
  "Antwerpen": "subadminAntwerpen",
  "Arnhem": "subadminArnhem",
  "ATKA": "subadminATKA",
  "Brussel": "subadminBrussel",
  "Den Bosch": "subadminDenBosch",
  "Filmacademie": "subadminFilmacademie",
  "Gent": "subadminGent",
  "Leuven": "subadminLeuven",
  "Maastricht": "subadminMaastricht",
  "Rotterdam": "subadminRotterdam",
  "Tilburg": "subadminTilburg",
  "Utrecht": "subadminUtrecht"
};

export default function SubadminPanel() {
  const { school } = useParams();
  // Vind de juiste key uit SUBADMIN_WACHTWOORDEN, case-insensitive:
  const schoolKey = Object.keys(SUBADMIN_WACHTWOORDEN).find(
    k => k.toLowerCase() === (school || "").toLowerCase()
  );

  const [pw, setPw] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [aanvragen, setAanvragen] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchAanvragen() {
    setLoading(true);
    setMsg(""); setErr("");
    try {
      const resp = await fetch(`${API_URL}/subadmin-aanvragen?school=${encodeURIComponent(schoolKey)}`, {
        headers: { "x-subadmin-password": pw }
      });
      const data = await resp.json();
      if (Array.isArray(data)) setAanvragen(data);
      else setErr(data.message || "Kon aanvragen niet ophalen.");
    } catch {
      setErr("Fout bij ophalen aanvragen.");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (loggedIn) fetchAanvragen();
    // eslint-disable-next-line
  }, [loggedIn]);

  function handleLogin(e) {
    e.preventDefault();
    if (pw === SUBADMIN_WACHTWOORDEN[schoolKey]) {
      setLoggedIn(true);
      setErr("");
    } else {
      setErr("Wachtwoord onjuist.");
    }
  }

  async function handleActie(id, actie) {
    setLoading(true);
    setMsg(""); setErr("");
    try {
      const resp = await fetch(`${API_URL}/subadmin-aanvraag-actie`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-subadmin-password": pw
        },
        body: JSON.stringify({ id, actie, school: schoolKey })
      });
      const data = await resp.json();
      setMsg(data.message || "Actie verwerkt.");
      fetchAanvragen();
    } catch {
      setErr("Fout bij verwerken actie.");
    }
    setLoading(false);
  }

  if (!schoolKey) return (
    <div style={{padding:30, color:"red"}}>Onbekende school: {school}</div>
  );

  if (!loggedIn) {
    return (
      <div style={{
        maxWidth:350, margin:"70px auto", background:"#fffbe6", padding:32, borderRadius:16, boxShadow:"0 2px 16px #0001"
      }}>
        <h2>Subadmin login voor {schoolKey}</h2>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            placeholder="Subadmin-wachtwoord"
            value={pw}
            onChange={e => setPw(e.target.value)}
            style={{ fontSize:17, padding:8, width:"100%" }}
            autoFocus
          />
          <button type="submit" style={{marginTop:16, width:"100%"}}>Inloggen</button>
        </form>
        <div style={{color:"red", minHeight:28, marginTop:10}}>{err}</div>
      </div>
    );
  }

  return (
    <div style={{maxWidth:600, margin:"30px auto", background:"#fffbe6", borderRadius:16, boxShadow:"0 2px 16px #0001", padding:32}}>
      <h2 style={{color:"#6a1b9a"}}>Aanvragen voor {schoolKey}</h2>
      {loading && <p>Laden...</p>}
      {msg && <div style={{color:"green"}}>{msg}</div>}
      {err && <div style={{color:"red"}}>{err}</div>}
      {aanvragen.length === 0 && !loading && <p>Geen aanvragen.</p>}
      <ul style={{listStyle:"none",padding:0}}>
        {aanvragen.map(a => (
          <li key={a.id} style={{
            background:"#fff",marginBottom:18,padding:16,borderRadius:10,boxShadow:"0 1px 4px #0001"
          }}>
            <b style={{ color: "#23214b" }}>{a.naam}</b>
            <span style={{ color: "#23214b" }}> ({a.email})</span><br/>
            <span style={{fontSize:13, color: "#6a1b9a"}}>Status: {a.status}</span><br/>
            {a.fotoUrl && (
              <img src={BACKEND_URL + a.fotoUrl} alt="foto" style={{height:100,margin:"8px 0",borderRadius:8}} />
            )}<br/>
            {a.goedgekeurdDoor && a.goedgekeurdDoor.length > 0 && (
              <div style={{fontSize:13, color:"green"}}>Goedgekeurd door: {a.goedgekeurdDoor.join(", ")}</div>
            )}
            {a.afgekeurdDoor && a.afgekeurdDoor.length > 0 && (
              <div style={{fontSize:13, color:"red"}}>Afgekeurd door: {a.afgekeurdDoor.join(", ")}</div>
            )}
            {a.status === "nieuw" && (
              <>
                <button onClick={()=>handleActie(a.id, "goedkeuren")} style={{marginRight:14,background:"#388e3c",color:"#fff",padding:"8px 16px",border:0,borderRadius:7}}>Goedkeuren</button>
                <button onClick={()=>handleActie(a.id, "afkeuren")} style={{background:"#d32f2f",color:"#fff",padding:"8px 16px",border:0,borderRadius:7}}>Afkeuren</button>
              </>
            )}
            {a.status === "goedgekeurd" && <span style={{color:"#388e3c"}}>Goedgekeurd</span>}
            {a.status === "afgekeurd" && <span style={{color:"#d32f2f"}}>Afgekeurd</span>}
            {a.stemcode && <div style={{marginTop:8}}><b>Stemcode:</b> <code>{a.stemcode}</code></div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
