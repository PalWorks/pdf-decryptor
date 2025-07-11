const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = process.env.PORT || 10000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

app.get('/', (req, res) => {
  res.send('👋 Welcome! Use POST /decrypt for binary or /decrypt-base64 for base64 input.');
});

app.post('/decrypt', upload.single('pdf'), (req, res) => {
  const password = req.body.password;
  const inputPath = req.file.path;
  const outputPath = path.join('/tmp', `decrypted-${Date.now()}.pdf`);

  console.log(`🔐 Received password: ${password}`);
  console.log(`📄 Uploaded file path: ${inputPath}`);
  console.log(`🔧 Decryption target output path: ${outputPath}`);

  const cmd = `qpdf --show-encryption ${inputPath}`;
  exec(cmd, (err, stdout, stderr) => {
    console.log('🔍 PDF encryption info:
' + stdout);
    if (stderr) console.error(stderr);
  });

  exec(`qpdf --password=${password} --decrypt ${inputPath} ${outputPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ QPDF Error: ${stderr}`);
      return res.status(500).json({
        error: 'Decryption failed',
        details: stderr,
      });
    }

    const decryptedFile = fs.readFileSync(outputPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(decryptedFile);

    fs.unlink(inputPath, () => {});
    fs.unlink(outputPath, () => {});
  });
});

app.post('/decrypt-base64', (req, res) => {
  const { pdfBase64, password } = req.body;

  if (!pdfBase64 || !password) {
    return res.status(400).json({ error: 'Missing pdfBase64 or password field' });
  }

  const binary = Buffer.from(pdfBase64, 'base64');
  const inputPath = path.join(uploadDir, `${Date.now()}-base64.pdf`);
  const outputPath = path.join('/tmp', `decrypted-${Date.now()}.pdf`);

  fs.writeFileSync(inputPath, binary);
  console.log(`🔐 Received password: ${password}`);
  console.log(`📄 Saved base64 PDF path: ${inputPath}`);
  console.log(`🔧 Decryption target output path: ${outputPath}`);

  exec(`qpdf --password=${password} --decrypt ${inputPath} ${outputPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ QPDF Error: ${stderr}`);
      return res.status(500).json({
        error: 'Decryption failed',
        details: stderr,
      });
    }

    const decryptedFile = fs.readFileSync(outputPath);
    const base64Decrypted = decryptedFile.toString('base64');
    res.json({ decryptedPdfBase64: base64Decrypted });

    fs.unlink(inputPath, () => {});
    fs.unlink(outputPath, () => {});
  });
});

app.listen(port, () => {
  console.log(`✅ PDF Decryption server listening on port ${port}`);
});