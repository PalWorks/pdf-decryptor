const express = require("express");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: "25mb" }));

app.post("/decrypt", async (req, res) => {
  try {
    const { pdfBase64, password } = req.body;

    console.log("📥 Incoming request received");
    console.log("📝 Request size:", JSON.stringify(req.body).length, "chars");

    if (!pdfBase64 || !password) {
      console.warn("⚠️ Missing required fields: pdfBase64 or password");
      return res.status(400).json({ error: "Missing pdfBase64 or password" });
    }

    const uploadId = uuidv4();
    const encryptedFilePath = path.join("uploads", `${uploadId}.pdf`);
    const decryptedFilePath = path.join("/tmp", `decrypted-${uploadId}.pdf`);

    try {
      fs.writeFileSync(encryptedFilePath, Buffer.from(pdfBase64, "base64"));
      console.log("📄 Base64 PDF saved to:", encryptedFilePath);
    } catch (fileErr) {
      console.error("❌ Failed to write encrypted file:", fileErr.message);
      return res.status(500).json({ error: "Failed to save file" });
    }

    console.log("🔐 Received password:", password);
    console.log("🔧 Decryption output path:", decryptedFilePath);

    const decryptCommand = `qpdf --password=${password} --decrypt "${encryptedFilePath}" "${decryptedFilePath}"`;
    console.log("🛠️ Running command:", decryptCommand);

    exec(decryptCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Decryption failed:");
        console.error(stderr);
        return res.status(500).json({
          error: "Decryption failed",
          stderr: stderr.toString(),
        });
      }

      console.log("✅ Decryption command stdout:");
      console.log(stdout);

      let decryptedBuffer;
      try {
        decryptedBuffer = fs.readFileSync(decryptedFilePath);
      } catch (readErr) {
        console.error("❌ Could not read decrypted file:", readErr.message);
        return res.status(500).json({ error: "Decryption succeeded but file read failed" });
      }

      const decryptedBase64 = decryptedBuffer.toString("base64");

      res.json({
        message: "Decryption successful",
        decryptedPdfBase64: decryptedBase64,
      });
    });
  } catch (err) {
    console.error("🚨 Unexpected error:");
    console.error(err.stack || err.message);
    res.status(500).json({ error: "Unexpected server error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 PDF Decryptor server running on port ${PORT}`);
});
