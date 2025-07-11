const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to handle JSON body
app.use(express.json({ limit: '50mb' }));

// Setup Multer for handling file uploads
const upload = multer({ dest: 'uploads/' });

function log(label, value) {
    console.log(`\n🔧 ${label}:`, value);
}

app.post('/decrypt', upload.single('file'), async (req, res) => {
    try {
        const password = req.body.password;
        const tempFileName = uuidv4() + '.pdf';
        const uploadPath = path.join('uploads', tempFileName);
        const outputFilePath = path.join('/tmp', `decrypted-${tempFileName}`);

        let base64Buffer;

        if (req.file) {
            fs.renameSync(req.file.path, uploadPath);
        } else if (req.body.pdfBase64) {
            base64Buffer = Buffer.from(req.body.pdfBase64, 'base64');
            fs.writeFileSync(uploadPath, base64Buffer);
        } else {
            return res.status(400).json({ error: 'No file or base64 input provided' });
        }

        log('Received password', password);
        log('Uploaded file path', uploadPath);
        log('Decryption target output path', outputFilePath);

        const command = `qpdf --password=${password} --decrypt "${uploadPath}" "${outputFilePath}"`;
        log('QPDF Command', command);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ QPDF Error:', stderr || stdout || error);
                return res.status(500).json({
                    error: 'Decryption failed',
                    details: stderr || error.message || stdout
                });
            }

            const decryptedFile = fs.readFileSync(outputFilePath);
            const base64 = decryptedFile.toString('base64');

            log('Decryption successful', 'Sending base64 content');
            res.json({ decryptedPdfBase64: base64 });
        });
    } catch (err) {
        console.error('❌ Unexpected Error:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

app.get('/', (req, res) => {
  res.send('✅ PDF Decryptor Service is running. Use POST /decrypt');
});

app.listen(port, () => {
    console.log(`✅ PDF Decryption server listening on port ${port}`);
});
