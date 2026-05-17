import React, { useState } from "react";

const SCHOLEN = [
  "Antwerpen", "Arnhem", "ATKA", "Brussel", "Den Bosch", "Filmacademie",
  "Gent", "Leuven", "Maastricht", "Rotterdam", "Tilburg", "Utrecht"
];

const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://backend-theaterscholensongfestival.onrender.com";

export default function AanvraagFormulier() {
  const [school, setSchool] = useState("");
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [foto, setFoto] = useState(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setResponse("");
    setLoading(true);

    if (!school || !naam || !email || !foto) {
      setResponse("Vul alle velden in en upload een foto.");
      setLoading(false);
      return;
    }

    // Stuur aanvraag (met foto) naar backend
    const formData = new FormData();
    formData.append("school", school);
    formData.append("naam", naam);
    formData.append("email", email);
    formData.append("foto", foto);

    try {
      const resp = await fetch(`${API_URL}/aanvraag`, {
        method: "POST",
        body: formData
      });
      const data = await resp.json();
      // Altijd de nieuwe gewenste zin tonen bij succes
      if (data.success) {
        setResponse("Aanvraag ontvangen! Je krijgt binnenkort een e-mail over jouw aanvraag.");
        setSchool(""); setNaam(""); setEmail(""); setFoto(null);
      } else {
        setResponse(data.message || "Aanvraag ontvangen!");
      }
    } catch {
      setResponse("Fout bij versturen. Probeer het later opnieuw.");
    }
    setLoading(false);
  }

  return (
    <div className="stemformulier-container" style={{maxWidth: 480}}>
      <h1>Televote verzoek om te stemmen</h1>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <label>
          School: <br />
          <select value={school} onChange={e => setSchool(e.target.value)} required>
            <option value="">-- Kies je school --</option>
            {SCHOLEN.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Naam stemmer: <br />
          <input
            type="text"
            value={naam}
            onChange={e => setNaam(e.target.value)}
            required
          />
        </label>
        <label>
          E-mailadres: <br />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Foto collegekaart: <br />
          <input
            type="file"
            accept="image/*"
            onChange={e => setFoto(e.target.files[0])}
            required
          />
        </label>
        <button type="submit" disabled={loading} style={{marginTop:20}}>
          {loading ? "Versturen..." : "Aanvraag indienen"}
        </button>
      </form>
      <div id="response" style={{marginTop:16}}>{response}</div>
    </div>
  );
}
