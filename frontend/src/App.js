import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SongfestivalStemformulier from "./SongfestivalStemformulier";
import SongfestivalAdminPanel from "./admin-panel";
import Results from "./Results";

// Nieuwe imports voor de uitbreidingen (maak deze bestanden aan!)
import AanvraagFormulier from "./AanvraagFormulier";
import SubadminPanel from "./SubadminPanel";
import HoofdadminPanel from "./HoofdadminPanel";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SongfestivalStemformulier />} />
        <Route path="/admin" element={<SongfestivalAdminPanel />} />
        <Route path="/results" element={<Results />} />
        {/* Nieuwe routes */}
        <Route path="/aanvraag" element={<AanvraagFormulier />} />
        <Route path="/subadmin/:school" element={<SubadminPanel />} />
        <Route path="/hoofdadmin" element={<HoofdadminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
