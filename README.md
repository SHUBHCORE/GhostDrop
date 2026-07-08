# 👻 GhostDrop

> A Decentralized Secure File Sharing System built using React, Node.js, AES-256 Encryption, and IPFS.

GhostDrop is a cybersecurity-focused file sharing platform that combines **client-side encryption**, **decentralized storage**, and **advanced access control mechanisms** to securely exchange sensitive files. Unlike traditional cloud storage solutions, GhostDrop encrypts files before upload and stores them on the InterPlanetary File System (IPFS), ensuring enhanced privacy and resilience.

---

## 🚀 Features

### 🔐 AES-256 Client-Side Encryption
- Files are encrypted locally before leaving the user's device.
- Encryption keys are never stored on the server.

### 🌐 Decentralized Storage (IPFS)
- Encrypted payloads are uploaded to IPFS using Pinata.
- Eliminates dependence on centralized storage providers.

### 🔥 Burn After Read
- Files automatically self-destruct after reaching the configured download limit.
- Payload is removed from both the server metadata and IPFS.

### 🌍 Geo-Lock
- Restricts decryption to users within a predefined geographical radius.
- Uses browser geolocation for verification.

### 🕵️ 007 Mode (Steganography)
- Hides the IPFS CID inside an innocent-looking image using LSB steganography.
- Enables covert transmission of download links.

### ☠️ Dead Man's Switch
- Stores the encryption key in escrow.
- Releases the key only after the sender fails to check in before the timer expires.

### 🎭 Duress Key
- Supports a secondary decryption key that opens harmless decoy files instead of sensitive data.

### 📡 Overwatch Dashboard
- Tracks payload status in real time.
- Displays:
  - Payload status
  - Download count
  - Expiration timer
  - Dead Man timer
  - Intruder evidence

### 📷 Honeypot Intruder Detection
- After multiple failed decryption attempts:
  - Webcam captures the intruder.
  - Image is uploaded to IPFS.
  - Evidence appears in the Overwatch dashboard.

### 🔥 Scorched Earth Protocol
- If unauthorized access is detected:
  - Payload is permanently deleted from IPFS.
  - Status changes to **COMPROMISED**.

### 🚨 Panic Mode
- Instantly disguises the application by displaying an innocent webpage.
- Designed for emergency situations.

---

# 🛠 Tech Stack

## Frontend

- React.js
- Axios
- CryptoJS
- JSZip
- HTML5 Canvas
- Browser Geolocation API
- WebRTC
- CSS3

## Backend

- Node.js
- Express.js
- Multer
- Axios
- FormData

## Storage

- IPFS
- Pinata API

---

# 📂 Project Structure

```
GhostDrop
│
├── frontend/
│   ├── src/
│   ├── App.js
│   └── components/
│
├── backend/
│   ├── index.mjs
│   └── package.json
│
└── README.md
```

---

# ⚙ Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/GhostDrop.git

cd GhostDrop
```

---

## Backend

```bash
cd backend

npm install

npm start
```

Runs on

```
http://localhost:4000
```

---

## Frontend

```bash
cd frontend

npm install

npm start
```

Runs on

```
http://localhost:3000
```

---

# 🔄 Working Flow

```
User Uploads File
        │
        ▼
AES-256 Encryption
        │
        ▼
Optional:
• Geo-Lock
• Burn After Read
• Dead Man Switch
• Duress Payload
• 007 Mode
        │
        ▼
Encrypted Payload Uploaded to IPFS
        │
        ▼
CID Generated
        │
        ▼
Receiver Enters CID (or extracts from image)
        │
        ▼
Authentication Checks
        │
        ▼
Successful Decryption
```

---

# 🔐 Security Features

| Feature | Description |
|----------|-------------|
| AES-256 Encryption | Protects file confidentiality |
| Client-side Encryption | Server never sees plaintext |
| IPFS Storage | Decentralized file storage |
| Burn After Read | Automatic payload destruction |
| Geo-Lock | Location-based access |
| 007 Mode | CID hidden inside image |
| Dead Man Switch | Timed escrow release |
| Duress Key | Opens fake payload |
| Honeypot | Captures intruder image |
| Overwatch | Real-time payload monitoring |
| Scorched Earth | Permanently destroys compromised payload |

---

# 📊 Mathematical Model

Let

```
S = {U, E, M, A}
```

Where

- **U** → Users
- **E** → AES Encryption Module
- **M** → Steganography Module
- **A** → Authentication & Access Control

Encryption

```
C = AES(P, k)
```

Where

- P = Payload
- k = Secret AES Key
- C = Ciphertext

Steganography

```
I' = LSB_Embed(I, CID)
```

Where

- I = Cover Image
- I' = Tampered Image containing CID

Dead Man Escrow

```
Release(k) =
True    if Current Time ≥ Expiry Time
False   otherwise
```

---

# 🎯 Future Enhancements

- Blockchain-based immutable audit logs
- Multi-factor authentication
- Mobile application
- Smart contract-based escrow
- Distributed metadata storage
- IPFS cluster deployment
- Quantum-resistant encryption algorithms

---

# 👨‍💻 Developers

Final Year B.Tech Project

Team Members

- Shubham Kumar
- Abin Nair
- Siddharth Singh
- Harshana Paunikar

---

# 📚 References

- React.js
- Node.js
- Express.js
- CryptoJS
- IPFS
- Pinata Cloud
- Axios
- JSZip

---

# 📜 License

This project was developed as a **Final Year B.Tech Academic Project** for educational and research purposes.
