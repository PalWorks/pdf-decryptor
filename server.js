const express = require('express');
const multer = require('multer');
const fs = require('fs');
const fsPromises = fs.promises;
const { execFile } = require('child_process');
const path = require('path');
const os = require('os');
const uploadsDir = os.tmpdir();
const app = express();
const port = process.env.PORT || 10000;

// Middleware to handle JSON and urlencoded requests
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Storage setup for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
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
  res.send('👋 Welcome to the PDF Decryptor Service! Use /decrypt or /decrypt-base64 to POST your file and password.');
});

// Decrypt endpoint
app.post('/decrypt', upload.single('file'), async (req, res) => {
  try {
    let pdfPath = '';
    let password = '';
    const tmpOutputPath = `/tmp/tmp-${Date.now()}.pdf`;

    const cleanup = () => {
      fs.unlink(pdfPath, () => {});
      fs.unlink(tmpOutputPath, () => {});
    };

    if (req.body.pdfBase64 && req.body.password) {
      log('📥 Base64 input received.');
      const base64Data = req.body.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      password = req.body.password;
      pdfPath = path.join(uploadsDir, `${Date.now()}.pdf`);
      await fsPromises.writeFile(pdfPath, Buffer.from(base64Data, 'base64'));
    } else if (req.file && req.body.password) {
      log('📥 Binary file received.');
      pdfPath = req.file.path;
      password = req.body.password;
    } else {
      return res.status(400).json({ error: 'Missing file or password' });
    }

    // Masked password to avoid exposing sensitive information in logs
    log(`🔐 Received password: [REDACTED]`);
    log(`📄 Uploaded file path: ${pdfPath}`);
    log(`🔧 Decryption target output path: ${tmpOutputPath}`);

    // Debug command to analyze PDF encryption
    const infoArgs = ['--show-encryption', pdfPath];
    execFile('qpdf', infoArgs, (infoErr, infoStdout, infoStderr) => {
      log('🔍 PDF encryption info:');
      if (infoErr) {
        log(`Error checking encryption: ${infoErr.message}`);
      }
      log(infoStdout || infoStderr);

      // Actual decryption command
      const decryptArgs = ['--warning-exit-0', `--password=${password}`, '--decrypt', pdfPath, tmpOutputPath];
      execFile('qpdf', decryptArgs, async (err, stdout, stderr) => {
        if (err && err.code !== 3) {
          const details = stderr || err.message;
          log(`❌ QPDF Error: ${details}`);
          cleanup();
          return res.status(500).json({
            error: 'Decryption failed',
            details
          });
        }

        log('✅ Decryption successful.');
        const decryptedBase64 = await fsPromises.readFile(tmpOutputPath, { encoding: 'base64' });
        res.json({ success: true, decryptedBase64 });
        cleanup();
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
    const pdfPath = path.join(uploadsDir, `${Date.now()}_base64input.pdf`);
    const tmpOutputPath = `/tmp/tmp-${Date.now()}-base64-decrypted.pdf`;

    const cleanup = () => {
      fs.unlink(pdfPath, () => {});
      fs.unlink(tmpOutputPath, () => {});
    };

    await fsPromises.writeFile(pdfPath, Buffer.from(cleanBase64, 'base64'));

    // Masked password to avoid exposing sensitive information in logs
    log(`🔐 Received password: [REDACTED]`);
    log(`📄 Base64 PDF saved at: ${pdfPath}`);
    log(`🔧 Decryption output path: ${tmpOutputPath}`);

    const infoArgs = ['--show-encryption', pdfPath];
    execFile('qpdf', infoArgs, (infoErr, infoStdout, infoStderr) => {
      log('🔍 PDF encryption info (Base64 route):');
      if (infoErr) log(`Info Error: ${infoErr.message}`);
      log(infoStdout || infoStderr);

      const decryptArgs = ['--warning-exit-0', `--password=${password}`, '--decrypt', pdfPath, tmpOutputPath];
      execFile('qpdf', decryptArgs, async (err, stdout, stderr) => {
        if (err && err.code !== 3) {
          const details = stderr || err.message;
          log(`❌ QPDF Decrypt Error (Base64 route): ${details}`);
          cleanup();
          return res.status(500).json({ error: 'Decryption failed', details });
        }

        log('✅ Decryption successful (Base64 route).');
        const decryptedBase64 = await fsPromises.readFile(tmpOutputPath, { encoding: 'base64' });
        res.json({ success: true, decryptedBase64 });
        cleanup();
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

if (require.main === module) {
  app.listen(port, () => {
    log(`🚀 Server is listening on port ${port}`);
  });
}

module.exports = app;
