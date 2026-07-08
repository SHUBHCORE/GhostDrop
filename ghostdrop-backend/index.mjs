import express from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

// --- PINATA CREDENTIALS ---
const PINATA_API_KEY = '4b61d5bf2c16548a9105';
const PINATA_API_SECRET = '216d60de118c37ec82fa279c5df33416537c76b3e6872acc1f8913a3f641d760';

const PINATA_UPLOAD_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_UNPIN_URL = 'https://api.pinata.cloud/pinning/unpin';

const fileMetadataStore = new Map(); 

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- ROUTE: Upload File ---
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received.' });

    const formData = new FormData();
    formData.append('file', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype || 'application/octet-stream' });

    const pinataRes = await axios.post(PINATA_UPLOAD_URL, formData, {
      headers: { ...formData.getHeaders(), 'pinata_api_key': PINATA_API_KEY, 'pinata_secret_api_key': PINATA_API_SECRET },
      maxBodyLength: Infinity,
    });

    const ipfsHash = pinataRes.data?.IpfsHash;
    if (!ipfsHash) throw new Error('Pinata failed to return IPFS Hash');

    const maxDownloads = req.body.maxDownloads ? parseInt(req.body.maxDownloads) : null;
    let geoLock = null;
    if (req.body.lat && req.body.lng) {
      geoLock = { lat: parseFloat(req.body.lat), lng: parseFloat(req.body.lng), radius: 200 };
    }

    const isDMS = req.body.isDMS === 'true';
    const dmsTimerMinutes = parseInt(req.body.dmsTimerMinutes) || 0;
    const releaseTimestamp = isDMS ? Date.now() + (dmsTimerMinutes * 60 * 1000) : null;

    fileMetadataStore.set(ipfsHash, {
      cid: ipfsHash,
      status: 'ACTIVE', // Status tracking added
      expirationTimestamp: Date.now() + 24 * 3600 * 1000,
      maxDownloads,
      currentDownloads: 0,
      geoLock,
      isDMS,
      releaseTimestamp,
      dmsTimerMinutes,
      escrowKey: req.body.escrowKey || null,
      intruderEvidence: [] 
    });

    console.log(`[UPLOAD SUCCESS] CID: ${ipfsHash} | DMS: ${isDMS}`);
    res.json({ cid: ipfsHash });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// --- ROUTE: Report Intruder & SCORCHED EARTH ---
app.post('/report-intruder', async (req, res) => {
    const { targetCid, evidenceCid } = req.body;
    if (fileMetadataStore.has(targetCid)) {
        const meta = fileMetadataStore.get(targetCid);
        meta.intruderEvidence.push(evidenceCid);
        
        // 1. Change status so Overwatch knows it was attacked
        meta.status = 'COMPROMISED'; 
        console.log(`[ALERT] Intruder caught on payload ${targetCid}. Evidence: ${evidenceCid}`);

        // 2. SCORCHED EARTH: Permanently delete actual files from IPFS
        try {
            await axios.delete(`${PINATA_UNPIN_URL}/${targetCid}`, { 
                headers: { 'pinata_api_key': PINATA_API_KEY, 'pinata_secret_api_key': PINATA_API_SECRET } 
            });
            console.log(`[SCORCHED EARTH] Actual payload ${targetCid} destroyed on IPFS.`);
        } catch(e) { console.log("[IPFS Delete Error]", e.message); }
    }
    res.json({ success: true });
});

// --- ROUTE: Overwatch Tracker ---
app.post('/track', (req, res) => {
    const { cid } = req.body;
    if (!fileMetadataStore.has(cid)) {
        return res.status(404).json({ error: 'Payload not found. It may have expired.' });
    }
    
    const meta = fileMetadataStore.get(cid);
    res.json({
        status: meta.status, // ACTIVE or COMPROMISED
        isDMS: meta.isDMS,
        currentDownloads: meta.currentDownloads,
        maxDownloads: meta.maxDownloads,
        intruderEvidence: meta.intruderEvidence,
        expiresInHours: Math.max(0, Math.floor((meta.expirationTimestamp - Date.now()) / (1000 * 60 * 60))),
        dmsMinsLeft: meta.isDMS ? Math.ceil((meta.releaseTimestamp - Date.now()) / 60000) : null
    });
});

// --- ROUTE: Check-in ---
app.post('/checkin', (req, res) => {
    const { cid } = req.body;
    if (!fileMetadataStore.has(cid)) return res.status(404).json({ error: 'CID not found.' });
    const meta = fileMetadataStore.get(cid);
    if (!meta.isDMS) return res.status(400).json({ error: 'Not a Dead Man file.' });
    meta.releaseTimestamp = Date.now() + (meta.dmsTimerMinutes * 60 * 1000);
    res.json({ success: true, newReleaseTime: meta.releaseTimestamp });
});

// --- ROUTE: Unlock ---
app.post('/unlock', async (req, res) => {
  const { cid, userLat, userLng } = req.body;
  if (!fileMetadataStore.has(cid)) return res.status(404).json({ error: 'File not found.' });

  const meta = fileMetadataStore.get(cid);

  // BLOCK IF BURNED
  if (meta.status === 'COMPROMISED') {
      return res.status(410).json({ error: '🔥 SCORCHED EARTH ACTIVE. Payload was permanently destroyed due to unauthorized access.' });
  }

  if (meta.isDMS) {
      if (Date.now() < meta.releaseTimestamp) {
          const minsLeft = Math.ceil((meta.releaseTimestamp - Date.now()) / 60000);
          return res.status(403).json({ error: `⏳ DEAD MAN PROTOCOL ACTIVE. Sender is still alive. Unlocks in ${minsLeft} minutes.` });
      }
  }

  if (meta.geoLock) {
    if (!userLat || !userLng) return res.status(403).json({ error: '🔒 Location Access Required.' });
    const dist = getDistanceFromLatLonInM(meta.geoLock.lat, meta.geoLock.lng, userLat, userLng);
    if (dist > meta.geoLock.radius) return res.status(403).json({ error: `🔒 ACCESS DENIED. You are ${Math.round(dist)}m away from drop zone.` });
  }

  if (meta.maxDownloads !== null && !meta.isDMS) {
    if (meta.currentDownloads >= meta.maxDownloads) {
      fileMetadataStore.delete(cid); 
      return res.status(410).json({ error: '🔥 This file has self-destructed.' });
    }
    meta.currentDownloads++;
    if (meta.currentDownloads >= meta.maxDownloads) {
       setTimeout(() => {
         fileMetadataStore.delete(cid);
         axios.delete(`${PINATA_UNPIN_URL}/${cid}`, { 
             headers: { 'pinata_api_key': PINATA_API_KEY, 'pinata_secret_api_key': PINATA_API_SECRET } 
         }).catch(()=>{});
       }, 15000); 
    }
  }
  res.json({ success: true, meta, escrowKey: meta.isDMS ? meta.escrowKey : null });
});

// --- ROUTE: Log Successful Download ---
app.post('/log-download', async (req, res) => {
    try {
        const { cid } = req.body;

        if (!fileMetadataStore.has(cid)) {
            return res.status(404).json({ error: 'File not found.' });
        }

        const meta = fileMetadataStore.get(cid);

        // Increase download count
        meta.currentDownloads++;

        console.log(
            `[DOWNLOAD] ${cid} -> ${meta.currentDownloads}/${meta.maxDownloads ?? '∞'}`
        );

        // Burn-after-read handling
        if (
            meta.maxDownloads !== null &&
            !meta.isDMS &&
            meta.currentDownloads >= meta.maxDownloads
        ) {
            setTimeout(async () => {
                fileMetadataStore.delete(cid);

                try {
                    await axios.delete(`${PINATA_UNPIN_URL}/${cid}`, {
                        headers: {
                            pinata_api_key: PINATA_API_KEY,
                            pinata_secret_api_key: PINATA_API_SECRET
                        }
                    });

                    console.log(`[SELF-DESTRUCT] ${cid} removed from IPFS`);
                } catch (e) {
                    console.log("[IPFS Delete Error]", e.message);
                }
            }, 15000);
        }

        res.json({
            success: true,
            downloads: meta.currentDownloads
        });

    } catch (err) {
        res.status(500).json({
            error: "Failed to log download."
        });
    }
});

setInterval(async () => {
  const now = Date.now();
  for (const [cid, meta] of fileMetadataStore.entries()) {
    if (meta.expirationTimestamp <= now) {
      fileMetadataStore.delete(cid);
      try {
        await axios.delete(`${PINATA_UNPIN_URL}/${cid}`, {
          headers: { 'pinata_api_key': PINATA_API_KEY, 'pinata_secret_api_key': PINATA_API_SECRET }
        });
      } catch (e) {}
    }
  }
}, 60 * 60 * 1000); 

app.listen(port, () => {
  console.log(`GhostDrop Backend running on http://localhost:${port}`);
});