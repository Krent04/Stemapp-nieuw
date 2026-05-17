require("dotenv").config();

console.log("START 1");
process.on("exit", (code) => console.log("PROCESS EXIT", code));
process.on("uncaughtException", (err) => console.error("UNCAUGHT", err));

console.log("require express");
const express = require("express");
console.log("require cors");
const cors = require("cors");
console.log("require body-parser");
const bodyParser = require("body-parser");
console.log("require resend");
const { Resend } = require("resend");
console.log("require multer");
const multer = require("multer");
console.log("require path");
const path = require("path");
console.log("require fs");
const fs = require("fs");

const app = express();
console.log("START 2");
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const SCHOLEN = [
  "Antwerpen",
  "Arnhem",
  "ATKA",
  "Brussel",
  "Den Bosch",
  "Filmacademie",
  "Gent",
  "Leuven",
  "Maastricht",
  "Rotterdam",
  "Tilburg",
  "Utrecht",
];

const SONGFESTIVAL_PUNTEN = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1, 0];

const SUBADMIN_WACHTWOORDEN = {
  Antwerpen: "subadminAntwerpen",
  Arnhem: "subadminArnhem",
  ATKA: "subadminATKA",
  Brussel: "subadminBrussel",
  "Den Bosch": "subadminDenBosch",
  Filmacademie: "subadminFilmacademie",
  Gent: "subadminGent",
  Leuven: "subadminLeuven",
  Maastricht: "subadminMaastricht",
  Rotterdam: "subadminRotterdam",
  Tilburg: "subadminTilburg",
  Utrecht: "subadminUtrecht",
};

const uploadsDir = path.join(__dirname, "uploads");
const aanvragenFile = path.join(__dirname, "aanvragen.json");
const stemmenFile = path.join(__dirname, "stemmen.json");
const settingsFile = path.join(__dirname, "settings.json");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(aanvragenFile)) {
  fs.writeFileSync(aanvragenFile, JSON.stringify([], null, 2));
}

if (!fs.existsSync(stemmenFile)) {
  fs.writeFileSync(stemmenFile, JSON.stringify([], null, 2));
}

if (!fs.existsSync(settingsFile)) {
  fs.writeFileSync(settingsFile, JSON.stringify({ lijnenOpen: true }, null, 2));
}

function leesJson(file, fallback) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw || JSON.stringify(fallback));
  } catch (err) {
    console.error(`Fout bij lezen van ${file}:`, err);
    return fallback;
  }
}

function schrijfJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function leesAanvragen() {
  return leesJson(aanvragenFile, []);
}

function schrijfAanvragen(data) {
  schrijfJson(aanvragenFile, data);
}

function leesStemmen() {
  return leesJson(stemmenFile, []);
}

function schrijfStemmen(data) {
  schrijfJson(stemmenFile, data);
}

function leesSettings() {
  return leesJson(settingsFile, { lijnenOpen: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

const resend = new Resend(process.env.RESEND_API_KEY);

console.log("RESEND_API_KEY bestaat =", !!process.env.RESEND_API_KEY);
console.log("EMAIL_FROM =", process.env.EMAIL_FROM);

function generateStemcode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function checkSubadminPassword(school, password) {
  return SUBADMIN_WACHTWOORDEN[school] && SUBADMIN_WACHTWOORDEN[school] === password;
}

function berekenJuryUitslagGemiddelde(stemmen, scholen, puntenLijst) {
  const stemmenVanSchool = {};

  for (const stem of stemmen) {
    if (!stemmenVanSchool[stem.school]) stemmenVanSchool[stem.school] = [];
    stemmenVanSchool[stem.school].push(stem.puntenVerdeling);
  }

  const juryUitslag = {};
  for (const school of scholen) {
    const schoolStemmen = stemmenVanSchool[school] || [];
    if (schoolStemmen.length === 0) continue;

    const andereScholen = scholen.filter((s) => s !== school);
    const scores = {};

    for (const ontvanger of andereScholen) {
      const punten = schoolStemmen.map(
        (verdeling) => Number(verdeling[ontvanger]) || 0
      );
      scores[ontvanger] = punten.length
        ? punten.reduce((a, b) => a + b, 0) / punten.length
        : 0;
    }

    const sorted = andereScholen.slice().sort((a, b) => scores[b] - scores[a]);
    const juryPunten = {};
    sorted.forEach((s, i) => {
      juryPunten[s] = puntenLijst[i] ?? 0;
    });

    juryUitslag[school] = juryPunten;
  }

  return juryUitslag;
}

app.get("/", (req, res) => {
  res.send("Backend draait");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/lijnen-status", (req, res) => {
  const settings = leesSettings();
  res.json({ open: !!settings.lijnenOpen });
});

app.post("/aanvraag", upload.single("foto"), (req, res) => {
  const { school, naam, email } = req.body;

  if (!school || !naam || !email || !req.file) {
    return res.json({
      success: false,
      message: "Vul alle velden in en upload een foto.",
    });
  }

  if (!SCHOLEN.includes(school)) {
    return res.json({
      success: false,
      message: "Ongeldige school.",
    });
  }

  const aanvragen = leesAanvragen();

  const nieuweAanvraag = {
    id: Date.now().toString(),
    school,
    naam,
    email,
    fotoUrl: `/uploads/${req.file.filename}`,
    status: "nieuw",
    goedgekeurdDoor: [],
    afgekeurdDoor: [],
    stemcode: null,
    stemGebruikt: false,
    createdAt: new Date().toISOString(),
  };

  aanvragen.push(nieuweAanvraag);
  schrijfAanvragen(aanvragen);

  return res.json({
    success: true,
    message: "Aanvraag ontvangen! Je krijgt binnenkort een e-mail over jouw aanvraag.",
  });
});

app.get("/subadmin-aanvragen", (req, res) => {
  const school = req.query.school;
  const password = req.headers["x-subadmin-password"];

  if (!school || !checkSubadminPassword(school, password)) {
    return res.status(403).json({ message: "Geen toegang." });
  }

  const aanvragen = leesAanvragen();
  const resultaten = aanvragen.filter((a) => a.school === school);

  return res.json(resultaten);
});

app.post("/subadmin-aanvraag-actie", async (req, res) => {
  const { id, actie, school } = req.body;
  const password = req.headers["x-subadmin-password"];

  if (!school || !checkSubadminPassword(school, password)) {
    return res.status(403).json({ message: "Geen toegang." });
  }

  const aanvragen = leesAanvragen();
  const index = aanvragen.findIndex((a) => a.id === id && a.school === school);

  if (index === -1) {
    return res.status(404).json({ message: "Aanvraag niet gevonden." });
  }

  const aanvraag = aanvragen[index];

  if (actie === "goedkeuren") {
    aanvraag.status = "goedgekeurd";

    if (!aanvraag.goedgekeurdDoor.includes(school)) {
      aanvraag.goedgekeurdDoor.push(school);
    }

    if (!aanvraag.stemcode) {
      aanvraag.stemcode = generateStemcode();
    }

    aanvragen[index] = aanvraag;
    schrijfAanvragen(aanvragen);

    try {
      console.log("Ik ga mail versturen naar:", aanvraag.email);

      const info = await resend.emails.send({
        from: process.env.EMAIL_FROM || "Songfestival <onboarding@resend.dev>",
        to: aanvraag.email,
        subject: "Jouw stemcode voor het Theaterscholen Songfestival",
        text: `Je aanvraag is goedgekeurd. Jouw stemcode is: ${aanvraag.stemcode}`,
        html: `<p>Je aanvraag is goedgekeurd.</p><p>Jouw stemcode is: <b>${aanvraag.stemcode}</b></p>`,
      });

      console.log("Mail succesvol verstuurd:", info);

      return res.json({
        message: "Aanvraag goedgekeurd en stemcode verstuurd.",
        stemcode: aanvraag.stemcode,
      });
    } catch (err) {
      console.error("Fout bij mail versturen:", err);
      return res.status(500).json({
        message: "Aanvraag goedgekeurd, maar e-mail versturen mislukt.",
        stemcode: aanvraag.stemcode,
      });
    }
  }

  if (actie === "afkeuren") {
    aanvraag.status = "afgekeurd";

    if (!aanvraag.afgekeurdDoor.includes(school)) {
      aanvraag.afgekeurdDoor.push(school);
    }

    aanvragen[index] = aanvraag;
    schrijfAanvragen(aanvragen);

    return res.json({
      message: "Aanvraag afgekeurd.",
    });
  }

  return res.status(400).json({ message: "Ongeldige actie." });
});

app.post("/verify-stemcode", (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.json({ verified: false, message: "Geen stemcode opgegeven." });
  }

  const aanvragen = leesAanvragen();
  const aanvraag = aanvragen.find(
    (a) => a.stemcode === code && a.status === "goedgekeurd"
  );

  if (!aanvraag) {
    return res.json({
      verified: false,
      message: "Ongeldige stemcode.",
    });
  }

  if (aanvraag.stemGebruikt) {
    return res.json({
      verified: false,
      message: "Deze stemcode is al gebruikt.",
    });
  }

  return res.json({
    verified: true,
    school: aanvraag.school,
  });
});

app.post("/vote", (req, res) => {
  const settings = leesSettings();
  if (!settings.lijnenOpen) {
    return res.json({ message: "De lijnen zijn gesloten." });
  }

  const { code, puntenVerdeling } = req.body;

  if (!code || !puntenVerdeling) {
    return res.json({ message: "Code en puntenVerdeling zijn verplicht." });
  }

  const aanvragen = leesAanvragen();
  const aanvraagIndex = aanvragen.findIndex(
    (a) => a.stemcode === code && a.status === "goedgekeurd"
  );

  if (aanvraagIndex === -1) {
    return res.json({ message: "Ongeldige stemcode." });
  }

  const aanvraag = aanvragen[aanvraagIndex];

  if (aanvraag.stemGebruikt) {
    return res.json({ message: "Deze stemcode is al gebruikt." });
  }

  const stemmendeSchool = aanvraag.school;

  if (Object.keys(puntenVerdeling).includes(stemmendeSchool)) {
    return res.json({ message: "Je mag niet op je eigen school stemmen!" });
  }

  const puntenArray = Object.values(puntenVerdeling).map(Number);

  if (
    puntenArray.length !== SONGFESTIVAL_PUNTEN.length ||
    !puntenArray.includes(0) ||
    !SONGFESTIVAL_PUNTEN.every((p) => puntenArray.filter((x) => x === p).length === 1)
  ) {
    return res.json({
      message: `Punten moeten exact ${[...SONGFESTIVAL_PUNTEN].join(", ")} zijn, elk 1x gebruikt.`,
    });
  }

  const expectedScholen = SCHOLEN.filter((s) => s !== stemmendeSchool);
  if (
    Object.keys(puntenVerdeling).length !== expectedScholen.length ||
    !Object.keys(puntenVerdeling).every((s) => expectedScholen.includes(s))
  ) {
    return res.json({
      message: "Er is iets mis met de lijst van scholen waar je op stemt.",
    });
  }

  const stemmen = leesStemmen();
  stemmen.push({
    code,
    school: stemmendeSchool,
    puntenVerdeling,
    createdAt: new Date().toISOString(),
  });
  schrijfStemmen(stemmen);

  aanvraag.stemGebruikt = true;
  aanvragen[aanvraagIndex] = aanvraag;
  schrijfAanvragen(aanvragen);

  return res.json({ message: "Stem succesvol geregistreerd!" });
});

app.get("/results", (req, res) => {
  const stemmen = leesStemmen();
  const juryGemiddelde = berekenJuryUitslagGemiddelde(
    stemmen,
    SCHOLEN,
    SONGFESTIVAL_PUNTEN
  );

  const totaal = {};
  for (const jurySchool in juryGemiddelde) {
    for (const [ontvanger, punten] of Object.entries(juryGemiddelde[jurySchool])) {
      totaal[ontvanger] = (totaal[ontvanger] || 0) + punten;
    }
  }

  const uitslag = Object.entries(totaal)
    .map(([school, punten]) => ({ school, punten }))
    .sort((a, b) => b.punten - a.punten);

  res.json({
    jury: juryGemiddelde,
    uitslag,
  });
});

app.get("/uitslag", (req, res) => {
  const stemmen = leesStemmen();
  const juryGemiddelde = berekenJuryUitslagGemiddelde(
    stemmen,
    SCHOLEN,
    SONGFESTIVAL_PUNTEN
  );

  const totaal = {};
  for (const jurySchool in juryGemiddelde) {
    for (const [ontvanger, punten] of Object.entries(juryGemiddelde[jurySchool])) {
      totaal[ontvanger] = (totaal[ontvanger] || 0) + punten;
    }
  }

  const uitslag = Object.entries(totaal)
    .map(([school, punten]) => ({ school, punten }))
    .sort((a, b) => b.punten - a.punten);

  const juryHtml = Object.entries(juryGemiddelde)
    .map(
      ([school, puntenVerdeling]) => `
    <section class="jury-school">
      <h3>${school}</h3>
      <ul>
        ${
          Object.entries(puntenVerdeling)
            .sort((a, b) => b[1] - a[1])
            .map(
              ([ontvanger, punten]) =>
                `<li><span>${ontvanger}</span><span class="punten">${punten}</span></li>`
            )
            .join("")
        }
      </ul>
    </section>
  `
    )
    .join("");

  const eindUitslagHtml = uitslag
    .map(
      ({ school, punten }, idx) =>
        `<li${idx === 0 ? ' class="winnaar"' : ""}><span>${idx + 1}. ${school}</span><span class="punten">${punten}</span></li>`
    )
    .join("");

  const stijl = `
    <style>
      :root {
        --accent: #ffb700;
        --light-bg: #f7f7fa;
        --card-bg: #fff;
        --jury-bg: #f2f3fc;
        --jury-title: #363171;
        --main: #23214b;
        --punten-bg: #e4e2ff;
        --punten-clr: #363171;
      }
      body {
        background: var(--light-bg);
        color: var(--main);
        font-family: 'Segoe UI', Arial, sans-serif;
        margin: 0;
        font-size: 18px;
      }
      .container {
        max-width: 700px;
        margin: 40px auto;
        background: var(--card-bg);
        border-radius: 18px;
        box-shadow: 0 6px 32px #0001;
        padding: 2.5em 1.5em 2em 1.5em;
      }
      h1 {
        margin-top: 0;
        font-weight: 900;
        font-size: 2.2em;
        letter-spacing: 1px;
        color: var(--jury-title);
        text-align: center;
      }
      h2 {
        margin-top: 2.2em;
        font-size: 1.4em;
        letter-spacing: 1px;
        color: var(--accent);
        text-align: center;
      }
      .jury-lijst {
        margin: 2em 0 2.5em 0;
      }
      .jury-school {
        background: var(--jury-bg);
        border-radius: 13px;
        margin-bottom: 20px;
        padding: 18px 18px 8px 18px;
        box-shadow: 0 2px 8px #0001;
      }
      .jury-school h3 {
        margin: 0 0 0.5em 0;
        color: var(--jury-title);
        font-size: 1.05em;
        letter-spacing: 0.2px;
      }
      .jury-school ul {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .jury-school li {
        display: flex;
        justify-content: space-between;
        margin-bottom: 7px;
        font-size: 1em;
      }
      .punten {
        background: var(--punten-bg);
        color: var(--punten-clr);
        border-radius: 8px;
        padding: 2px 12px;
        font-weight: 600;
        margin-left: 1.2em;
        min-width: 2.2em;
        text-align: center;
        display: inline-block;
      }
      .einduitslag {
        background: linear-gradient(90deg,#fffbe6 0,#ffe5b3 100%);
        color: var(--main);
        border-radius: 13px;
        padding: 14px 16px 10px 16px;
        box-shadow: 0 2px 8px #0001;
        margin-top: 2em;
      }
      .einduitslag h2 {
        color: var(--accent);
        font-size: 1.3em;
        margin-bottom: 0.7em;
        text-align: center;
      }
      .einduitslag ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .einduitslag li {
        display: flex;
        justify-content: space-between;
        font-weight: 600;
        font-size: 1.08em;
        margin-bottom: 7px;
        align-items: center;
      }
      .einduitslag .winnaar {
        color: var(--accent);
        font-size: 1.25em;
        font-weight: 900;
        background: #fff6d0;
        border-radius: 6px;
        padding: 4px 0;
      }
      @media (max-width: 600px) {
        .container { padding: 1.3em 0.3em; }
        h1 { font-size: 1.18em; }
        h2 { font-size: 1em; }
        .jury-school { padding: 10px 6px 6px 8px; }
        .einduitslag { padding: 8px 4px; }
      }
    </style>
  `;

  res.send(`
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="utf-8">
      <title>Songfestival Uitslag</title>
      ${stijl}
    </head>
    <body>
      <div class="container">
        <h1>Jury-uitslag per school</h1>
        <div class="jury-lijst">
          ${juryHtml || "<p style='text-align:center'>Er zijn nog geen stemmen!</p>"}
        </div>
        <div class="einduitslag">
          <h2>Einduitslag</h2>
          <ul>
            ${eindUitslagHtml || "<li>Er zijn nog geen stemmen!</li>"}
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);
});

console.log("Ik ga nu app.listen starten");
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend draait op poort ${PORT}`);
});