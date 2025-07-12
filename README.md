# PDF Decryptor Service

This is a simple Express.js microservice that uses `qpdf` to decrypt password-protected PDF files. You can deploy this project on platforms like **Render**, **Railway**, or any Docker-compatible host.

---

## 🚀 Features

- Accepts password-protected PDF files via `multipart/form-data`
- Decrypts the file using the provided password
- Returns a JSON response with a `decryptedBase64` field
- Lightweight and easy to deploy (Docker-ready)

---

## 📁 Folder Structure

```
pdf-decryptor/
├── Dockerfile         # Builds the image with qpdf installed
├── package.json       # Node.js dependencies and metadata
└── server.js          # Express server with `/decrypt` endpoint
```

---

## 🛠️ Setup Instructions

### 1. Clone or Upload to GitHub

```bash
git clone https://github.com/yourusername/pdf-decryptor-service.git
cd pdf-decryptor-service
```

### 2. Deploy on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New Web Service"**
3. Choose **"Deploy from a GitHub Repo"**
4. Use this repo
5. Select:
   - **Environment**: Docker
   - **Port**: 10000
   - Leave the rest as defaults
6. Click **Deploy**

---

## 🔐 API Usage

### Endpoint

```
POST /decrypt
```

### Body (multipart/form-data)

| Field    | Type     | Description                     |
|----------|----------|---------------------------------|
| `pdf`    | File     | PDF file to decrypt             |
| `password` | String | Password used to unlock the PDF |

### Response

The server responds with JSON containing the decrypted file:

```json
{
  "success": true,
  "decryptedBase64": "<Base64 string>"
}
```

You can convert `decryptedBase64` back into a PDF file:

```js
const fs = require('fs');
fs.writeFileSync('decrypted.pdf', Buffer.from(decryptedBase64, 'base64'));
```

---

## 🧪 Test Locally

```bash
npm install
node server.js
```

Then, in another terminal:

```bash
curl -X POST http://localhost:10000/decrypt   -F "pdf=@path/to/locked.pdf"   -F "password=YOUR_PASSWORD" --output decrypted.pdf
```

---

## 📦 Dependencies

- [Express](https://expressjs.com/)
- [Multer](https://github.com/expressjs/multer)
- [qpdf](https://qpdf.sourceforge.io/)

---

## 📝 License

MIT License. Feel free to use and extend.
