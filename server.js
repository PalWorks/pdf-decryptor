const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const tmp = require('tmp');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());

app.post('/decrypt', upload.single('pdf'), (req, res) => {
  const password = req.body.password;
  const inputPath = req.file.path;
  const outputFile = tmp.tmpNameSync({ postfix: '.pdf' });

console.log("🔐 Received password:", password);
  console.log("📄 Uploaded file path:", inputPath);
  console.log("🧾 File original name:", req.file.originalname);
  console.log("🧾 File mimetype:", req.file.mimetype);
  console.log("📏 File size:", req.file.size, "bytes");
  console.log("🔧 Decryption target output path:", outputFile);

  // Optional: Inspect PDF encryption settings
  const inspectCmd = `qpdf --show-encryption "${inputPath}"`;
  exec(inspectCmd, (inspectErr, inspectOut, inspectStderr) => {
    console.log("🔍 PDF encryption info:");
    console.log(inspectOut || inspectStderr);

    // Proceed to decryption
    const decryptCmd = `qpdf --password="${password}" --decrypt "${inputPath}" "${outputFile}"`;
    exec(decryptCmd, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ QPDF Error:", stderr);
        return res.status(500).json({
          error: "Decryption failed",
          details: stderr || error.message
        });
      }

      res.download(outputFile, 'decrypted.pdf', (err) => {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputFile);
        if (err) {
          console.error("Download error:", err);
        }
      });
    });
  });
});

app.get('/', (req, res) => {
  res.send('PDF Decryptor Service is running.');
});

app.listen(3000, () => {
  console.log('✅ Server listening on port 3000');
});
