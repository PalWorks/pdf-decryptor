const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const app = express();
const port = process.env.PORT || 10000;

// Middleware to handle JSON and urlencoded requests
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Storage setup for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Helper function for logging with timestamp
const log = (msg) => {
  const time = new Date().toISOString();
  console.log(`[${time}] ${msg}`);
};

// Root endpoint message
app.get('/', (req, res) => {
  res.send('🛡️ PDF Decryptor Service is up and running. Use POST /decrypt with file and password.');
});

// Decrypt endpoint
app.post('/decrypt', upload.single('file'), async (req, res) => {
  try {
    let pdfPath = '';
    let password = '';
    const tmpOutputPath = `/tmp/tmp-${Date.now()}.pdf`;

    if (req.body.pdfBase64 && req.body.password) {
      log('📥 Base64 input received.');
      const base64Data = req.body.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      password = req.body.password;
      pdfPath = `uploads/${Date.now()}.pdf`;
      fs.writeFileSync(pdfPath, Buffer.from(base64Data, 'base64'));
    } else if (req.file && req.body.password) {
      log('📥 Binary file received.');
      pdfPath = req.file.path;
      password = req.body.password;
    } else {
      return res.status(400).json({ error: 'Missing file or password' });
    }

    log(`🔐 Received password: ${password}`);
    log(`📄 Uploaded file path: ${pdfPath}`);
    log(`🔧 Decryption target output path: ${tmpOutputPath}`);

    // Debug command to analyze PDF encryption
    const infoCmd = `qpdf --show-encryption ${pdfPath}`;
    exec(infoCmd, (infoErr, infoStdout, infoStderr) => {
      log('🔍 PDF encryption info:');
      if (infoErr) {
        log(`Error checking encryption: ${infoErr.message}`);
      }
      log(infoStdout || infoStderr);

      // Actual decryption command
      const decryptCmd = `qpdf --password='${password}' --decrypt '${pdfPath}' '${tmpOutputPath}'`;
      exec(decryptCmd, (err, stdout, stderr) => {
        if (err) {
          const details = stderr || err.message;
          log(`❌ QPDF Error: ${details}`);
          return res.status(500).json({
            error: 'Decryption failed',
            details
          });
        }

        log('✅ Decryption successful.');
        const decryptedBase64 = fs.readFileSync(tmpOutputPath, { encoding: 'base64' });
        res.json({ success: true, decryptedBase64 });
      });
    });
  } catch (error) {
    log(`🚨 Uncaught Error: ${error.message}`);
    res.status(500).json({
      error: 'Unexpected error occurred',
      details: error.message
    });
  }
});

// Separate route for strict JSON-only Base64 decryption
app.post('/decrypt-base64', async (req, res) => {
  try {
    const { pdfBase64, password } = req.body;
    if (!pdfBase64 || !password) {
      return res.status(400).json({ error: 'Missing pdfBase64 or password in request body.' });
    }

    log('📥 /decrypt-base64: Base64 input received.');
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    const pdfPath = `uploads/${Date.now()}_base64input.pdf`;
    const tmpOutputPath = `/tmp/tmp-${Date.now()}-base64-decrypted.pdf`;

    fs.writeFileSync(pdfPath, Buffer.from(cleanBase64, 'base64'));

    log(`🔐 Received password: ${password}`);
    log(`📄 Base64 PDF saved at: ${pdfPath}`);
    log(`🔧 Decryption output path: ${tmpOutputPath}`);

    const infoCmd = `qpdf --show-encryption '${pdfPath}'`;
    exec(infoCmd, (infoErr, infoStdout, infoStderr) => {
      log('🔍 PDF encryption info (Base64 route):');
      if (infoErr) log(`Info Error: ${infoErr.message}`);
      log(infoStdout || infoStderr);

      const decryptCmd = `qpdf --password='${password}' --decrypt '${pdfPath}' '${tmpOutputPath}'`;
      exec(decryptCmd, (err, stdout, stderr) => {
        if (err) {
          const details = stderr || err.message;
          log(`❌ QPDF Decrypt Error (Base64 route): ${details}`);
          return res.status(500).json({ error: 'Decryption failed', details });
        }

        log('✅ Decryption successful (Base64 route).');
        const decryptedBase64 = fs.readFileSync(tmpOutputPath, { encoding: 'base64' });
        res.json({ success: true, decryptedBase64 });
      });
    });
  } catch (error) {
    log(`🚨 Uncaught Error (Base64 route): ${error.message}`);
    res.status(500).json({
      error: 'Unexpected error occurred',
      details: error.message
    });
  }
});

app.listen(port, () => {
  log(`🚀 Server is listening on port ${port}`);
});
