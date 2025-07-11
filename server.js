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

  const cmd = `qpdf --password=${password} --decrypt ${inputPath} ${outputFile}`;
  exec(cmd, (error) => {
    if (error) {
      return res.status(500).json({ error: 'Decryption failed', details: error.message });
    }

    res.download(outputFile, 'decrypted.pdf', (err) => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputFile);
      if (err) console.error('Download error:', err);
    });
  });
});

app.get('/', (req, res) => {
  res.send('PDF Decryptor Service is running.');
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
