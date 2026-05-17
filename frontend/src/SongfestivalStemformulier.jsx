import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "./songfestival-frontend.css";

const SONGFESTIVAL_PUNTEN = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const alleScholen = [
  "Antwerpen", "Arnhem", "ATKA", "Brussel", "Den Bosch", "Filmacademie",
  "Gent", "Leuven", "Maastricht", "Rotterdam", "Tilburg", "Utrecht"
];

const vlaggen = {
  "Antwerpen": "/flags/antwerpen.png",
  "Arnhem": "/flags/arnhem.png",
  "ATKA": "/flags/atka.png",
  "Brussel": "/flags/brussel.png",
  "Den Bosch": "/flags/denbosch.png",
  "Filmacademie": "/flags/filmacademie.png",
  "Gent": "/flags/gent.png",
  "Leuven": "/flags/leuven.png",
  "Maastricht": "/flags/maastricht.png",
  "Rotterdam": "/flags/rotterdam.png",
  "Tilburg": "/flags/tilburg.png",
  "Utrecht": "/flags/utrecht.png",
};

// Fisher-Yates shuffle utility:
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://stemapp-nieuw.onrender.com";

export default function SongfestivalStemformulier() {
  const [code, setCode] = useState("");
  const [, setEigenSchool] = useState(null);
  const [schoolLijst, setSchoolLijst] = useState([]);
  const [response, setResponse] = useState("");
  const [step, setStep] = useState("init"); // init → code → drag → done
  const [lijnenOpen, setLijnenOpen] = useState(null); // null = loading

  // Haal de status van de lijnen op bij laden van de pagina
  useEffect(() => {
    async function fetchLijnenStatus() {
      try {
        const resp = await fetch(`${API_URL}/lijnen-status`);
        const data = await resp.json();
        setLijnenOpen(data.open);
        setStep(data.open ? "code" : "closed");
      } catch (e) {
        setLijnenOpen(false);
        setStep("error");
      }
    }
    fetchLijnenStatus();
  }, []);

  // Stap 1: Stemcode checken
  async function handleCodeCheck(e) {
    e.preventDefault();
    setResponse("");
    if (!code || !code.trim()) {
      setResponse("Vul een geldige stemcode in.");
      return;
    }
    // Vraag de backend om de aanvraag bij deze stemcode te zoeken
    const resp = await fetch(`${API_URL}/verify-stemcode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() })
    });
    const data = await resp.json();
    if (data.verified && data.school) {
      setEigenSchool(data.school);
      const scholenZonderEigen = alleScholen.filter(s => s !== data.school);
      setSchoolLijst(shuffleArray(scholenZonderEigen));
      setStep("drag");
      setResponse("");
    } else {
      setResponse(data.message || "Ongeldige of reeds gebruikte stemcode.");
    }
  }

  function handleDragEnd(result) {
    if (!result.destination) return;
    const items = Array.from(schoolLijst);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    setSchoolLijst(items);
  }

  // Stem indienen
  async function handleSubmit(e) {
    e.preventDefault();
    let puntenVerdeling = {};
    schoolLijst.forEach((school, idx) => {
      puntenVerdeling[school] = SONGFESTIVAL_PUNTEN[idx] ?? 0;
    });
    const resp = await fetch(`${API_URL}/vote`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({code, puntenVerdeling})
    });
    const data = await resp.json();
    setResponse(data.message || "Er ging iets mis.");
    if (data.message && data.message.includes("succes")) {
      setStep("done");
    }
    if (data.message && data.message.toLowerCase().includes("gesloten")) {
      setStep("closed");
      setLijnenOpen(false);
    }
  }

  // ============ UI Rendering ==============

  if (lijnenOpen === null && step === "init") {
    return (
      <div className="stemformulier-container">
        <h1>Breng je stem uit!</h1>
        <p>Laden...</p>
      </div>
    );
  }

  if (step === "closed") {
    return (
      <div className="stemformulier-container">
        <h1>Breng je stem uit!</h1>
        <div className="gesloten-melding">
          <p><b>De lijnen zijn gesloten.</b></p>
          <p>Stemmen is momenteel niet mogelijk.</p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="stemformulier-container">
        <h1>Breng je stem uit!</h1>
        <p>Kon de status van de lijnen niet ophalen. Probeer het later opnieuw.</p>
      </div>
    );
  }

  return (
    <div className="stemformulier-container">
      <h1>Breng je stem uit!</h1>

      {step === "code" && (
        <form onSubmit={handleCodeCheck}>
          <label>
            Vul je stemcode in:<br />
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              autoFocus
            />
          </label>
          <button type="submit" style={{marginLeft: "10px"}}>Stemcode controleren</button>
          <br /><br />
        </form>
      )}

      {step === "drag" && (
        <form onSubmit={handleSubmit}>
          <p>Sleep de scholen in volgorde van jouw voorkeur (bovenaan = 12 punten, onderaan = 0 punten):</p>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="scholen">
              {(provided) => (
                <div
                  className="jury-punten-list"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {schoolLijst.map((school, idx) => (
                    <Draggable key={school} draggableId={school} index={idx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`schoolblok${snapshot.isDragging ? " dragging" : ""}`}
                        >
                          <img
                            className="schoolblok-flag"
                            src={vlaggen[school]}
                            alt={school + " vlag"}
                          />
                          <span className="schoolblok-name">{school}</span>
                          <span
                            className={`schoolblok-points${idx === 0 ? " winner" : ""}`}
                          >
                            {SONGFESTIVAL_PUNTEN[idx] ?? 0}
                          </span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <button type="submit" style={{marginTop: "16px"}}>Stem!</button>
        </form>
      )}

      {step === "done" && (
        <p><strong>Bedankt voor je stem!</strong></p>
      )}

      <div id="response">{response}</div>
    </div>
  );
}
