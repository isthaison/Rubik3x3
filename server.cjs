var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  const isApiKeyConfigured = !!process.env.GEMINI_API_KEY;
  let ai = null;
  if (isApiKeyConfigured) {
    ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      apiKeyConfigured: isApiKeyConfigured
    });
  });
  app.post("/api/gemini/tips", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "N\u1ED9i dung c\xE2u h\u1ECFi kh\xF4ng \u0111\u01B0\u1EE3c tr\u1ED1ng." });
    }
    if (!ai) {
      return res.json({
        reply: "Ch\xE0o b\u1EA1n! T\xEDnh n\u0103ng hu\u1EA5n luy\u1EC7n vi\xEAn AI ch\u01B0a \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t do thi\u1EBFu Kh\xF3a B\xED M\u1EADt GEMINI_API_KEY. H\xE3y th\xEAm kh\xF3a b\xED m\u1EADt n\xE0y trong ph\u1EA7n Settings > Secrets c\u1EE7a AI Studio \u0111\u1EC3 m\u1EDF kh\xF3a t\xEDnh n\u0103ng AI ho\xE0n t\u1EA5t nh\xE9! T\u1EA1m th\u1EDDi, \u0111\u1EC3 gi\u1EA3i th\xEDch Sexy Move: \u0111\xE2y l\xE0 c\xF4ng th\u1EE9c xoay (R U R' U') gi\xFAp l\u1EADt g\xF3c v\xE0 \u0111\u1ECBnh v\u1ECB s\u01B0\u1EDDn c\u1EF1c nhanh."
      });
    }
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "B\u1EA1n l\xE0 m\u1ED9t hu\u1EA5n luy\u1EC7n vi\xEAn chuy\xEAn nghi\u1EC7p gi\u1EA3i \u0111\u1EA5u Rubik 3x3 qu\u1ED1c t\u1EBF (WCA Coach) ng\u01B0\u1EDDi Vi\u1EC7t Nam. H\xE3y tr\u1EA3 l\u1EDDi ng\u01B0\u1EDDi d\xF9ng chi ti\u1EBFt, kh\xFAc chi\u1EBFt, d\u1EC5 hi\u1EC3u v\xE0 chuy\xEAn nghi\u1EC7p b\u1EB1ng ti\u1EBFng Vi\u1EC7t. S\u1EED d\u1EE5ng thu\u1EADt ng\u1EEF k\xFD hi\u1EC7u chu\u1EA9n WCA (nh\u01B0 R, L, U, D, F, B). Gi\u1EA3i th\xEDch c\u1EB7n k\u1EBD c\xE1c b\u01B0\u1EDBc, \u0111\u1ECBnh h\u01B0\u1EDBng v\xE0 c\xE1c m\u1EB9o \u0111\u1EB7t ng\xF3n tay (finger tricks) t\u1ED1i \u01B0u t\u1ED1c \u0111\u1ED9."
        }
      });
      const replyText = response.text || "Xin l\u1ED7i, hu\u1EA5n luy\u1EC7n vi\xEAn g\u1EB7p tr\u1EE5c tr\u1EB7c trong vi\u1EC7c t\u1EA1o c\xE2u tr\u1EA3 l\u1EDDi cho t\xECnh hu\u1ED1ng n\xE0y. B\u1EA1n c\xF3 th\u1EC3 di\u1EC5n \u0111\u1EA1t l\u1EA1i c\xE2u h\u1ECFi kh\xE1c \u0111\u01B0\u1EE3c kh\xF4ng?";
      res.json({ reply: replyText });
    } catch (err) {
      console.error("Gemini API Integration error:", err);
      res.status(500).json({
        error: "C\xF3 l\u1ED7i x\u1EA3y ra khi k\u1EBFt n\u1ED1i m\xE1y ch\u1EE7 hu\u1EA5n luy\u1EC7n vi\xEAn AI.",
        details: err.message
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Rubiks Server] \u0110ang kh\u1EDFi ch\u1EA1y \u1ED5n \u0111\u1ECBnh t\u1EA1i c\u1ED5ng http://localhost:${PORT}`);
  });
}
startServer().catch((error) => {
  console.error("[Error startup server]", error);
});
//# sourceMappingURL=server.cjs.map
