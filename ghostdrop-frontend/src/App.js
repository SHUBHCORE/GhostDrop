import React, { useState, useEffect, useRef } from 'react';
import CryptoJS from 'crypto-js';
import JSZip from 'jszip';
import axios from 'axios';
import { FaFile, FaFire, FaGhost, FaLock, FaUserSecret, FaImage, FaSearch, FaDownload, FaKey, FaRegCopy, FaGlobeAmericas, FaSkull, FaHeartbeat, FaUserShield, FaSatelliteDish, FaCrosshairs } from 'react-icons/fa';

// --- CONFIG ---
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';
const MARKER = 'GhostDrop:OK:';
const STEG_HEADER = 'GD_LINK:'; 

// --- STYLES ---
const STYLES = `
* { box-sizing: border-box; } 
body { margin: 0; background: #0b0f14; color: #e6edf3; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow-x: hidden; }

@keyframes scan { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes pulse-red { 0% { text-shadow: 0 0 10px rgba(218,54,51,0.5); } 50% { text-shadow: 0 0 25px rgba(218,54,51,1); } 100% { text-shadow: 0 0 10px rgba(218,54,51,0.5); } }
@keyframes flash-border { 0% { box-shadow: 0 0 20px rgba(218,54,51,0.5); } 50% { box-shadow: 0 0 60px rgba(218,54,51,1); } 100% { box-shadow: 0 0 20px rgba(218,54,51,0.5); } }

.ghost-container {
    min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 40px 20px;
    background: radial-gradient(circle at 50% -20%, #1a2332 0%, #0b0f14 70%);
}

.panel {
    background: #11161d; border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px; padding: 30px; width: 100%; max-width: 440px;
    box-shadow: 0 25px 50px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 20px;
}

.security-box {
    border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 18px; 
    background: #151b23; display: flex; flex-direction: column; gap: 12px;
}

.dashed-drop-zone {
    position: relative; border-radius: 12px; background: rgba(0, 0, 0, 0.2);
    border: 2px dashed; overflow: hidden; transition: all 0.3s ease;
    cursor: pointer; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center; padding: 20px;
}
.dashed-drop-zone:hover { background: rgba(255, 255, 255, 0.02); }
.scan-line {
    position: absolute; left: 0; width: 100%; height: 2px;
    animation: scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

input[type="text"], input[type="number"] {
    background: #0d1117; border: 1px solid rgba(255,255,255,0.1); color: #e6edf3;
    padding: 14px; border-radius: 10px; width: 100%; font-size: 0.95rem; outline: none;
    font-family: 'Consolas', 'Monaco', monospace; transition: border 0.2s;
}
input[type="text"]:focus, input[type="number"]:focus { border-color: #58a6ff; }

.btn {
    padding: 16px; border-radius: 10px; font-weight: 800; cursor: pointer;
    width: 100%; font-size: 0.95rem; letter-spacing: 0.5px; border: none;
    transition: transform 0.1s, filter 0.2s; text-transform: uppercase;
}
.btn:active { transform: scale(0.98); }

.btn-upload-green { background: #238636; color: white; box-shadow: 0 4px 20px rgba(35, 134, 54, 0.3); }
.btn-upload-green:hover { filter: brightness(1.1); }
.btn-bond { background: #d29922; color: #0d1117; box-shadow: 0 4px 20px rgba(210, 153, 34, 0.3); }
.btn-bond:hover { filter: brightness(1.1); }
.btn-dead { background: #da3633; color: white; box-shadow: 0 4px 20px rgba(218, 54, 51, 0.3); }
.btn-dead:hover { filter: brightness(1.1); }
.btn-overwatch { background: #58a6ff; color: #0d1117; box-shadow: 0 4px 20px rgba(88, 166, 255, 0.3); }
.btn-overwatch:hover { filter: brightness(1.1); }

.tab-container { background: #161b22; padding: 6px; border-radius: 50px; border: 1px solid #30363d; display: flex; gap: 5px; flex-wrap: wrap; justify-content: center;}
.tab { padding: 10px 20px; border-radius: 40px; border: none; background: transparent; color: #8b949e; font-weight: 600; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 8px; font-size: 0.9rem;}
.tab.active-std { background: #238636; color: white; }
.tab.active-bond { background: #d29922; color: #1a1a1a; }
.tab.active-dead { background: #da3633; color: white; }
.tab.active-overwatch { background: #58a6ff; color: #0d1117; }

.dms-timer {
    font-size: 3rem; font-family: 'Consolas', monospace; color: #ff7b72; 
    font-weight: 900; margin: 10px 0; letter-spacing: 2px;
    animation: pulse-red 2s infinite;
}
`;

// --- HELPER COMPONENTS ---
const Toast = ({ msg, type, visible }) => (
<div style={{
    position: 'fixed', top: 30, left: '50%', transform: visible ? 'translateX(-50%)' : 'translateX(-50%) translateY(-60px)',
    opacity: visible ? 1 : 0, transition: 'all 0.4s', padding: '14px 28px',
    background: type === 'error' ? 'rgba(218, 54, 51, 0.95)' : 'rgba(35, 134, 54, 0.95)', backdropFilter: 'blur(10px)',
    color: '#fff', borderRadius: 12, fontWeight: 700, zIndex: 9999, border: '1px solid rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
}}>
    {type === 'error' ? '⚠️' : '✅'} {msg}
</div>
);

const Spinner = ({ visible, text, color }) => visible ? (
<div style={{ position: 'fixed', inset: 0, background: 'rgba(11, 15, 20, 0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, backdropFilter: 'blur(8px)' }}>
    <div style={{ width: 60, height: 60, border: '4px solid rgba(255,255,255,0.1)', borderTop: `4px solid ${color}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    <div style={{color: color, fontFamily: 'monospace', letterSpacing: 2, fontWeight: 'bold', textAlign: 'center', padding: '0 20px'}}>{text}</div>
</div>
) : null;

// --- STEGANOGRAPHY LOGIC ---
const embedTextInImage = (coverImageFile, textToHide) => {
return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
        
        const encoder = new TextEncoder();
        const data = encoder.encode(STEG_HEADER + textToHide);
        const payloadLen = data.length;
        
        const header = new Uint8Array(4);
        new DataView(header.buffer).setUint32(0, payloadLen);
        
        const finalPayload = new Uint8Array(4 + payloadLen);
        finalPayload.set(header, 0); finalPayload.set(data, 4);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;

        if (finalPayload.length * 8 > pixels.length / 4 * 3) return reject("Image too small.");

        let dataIdx = 0, bitIdx = 0;
        for (let i = 0; i < pixels.length; i += 4) {
        if (dataIdx >= finalPayload.length) break;
        for (let j = 0; j < 3; j++) {
            if (dataIdx >= finalPayload.length) break;
            const bit = (finalPayload[dataIdx] >> bitIdx) & 1;
            pixels[i + j] = (pixels[i + j] & ~1) | bit;
            bitIdx++;
            if (bitIdx === 8) { bitIdx = 0; dataIdx++; }
        }
        }
        ctx.putImageData(imgData, 0, 0);
        canvas.toBlob((blob) => resolve(blob), 'image/png');
    };
    img.src = e.target.result;
    };
    reader.readAsDataURL(coverImageFile);
});
};

const extractTextFromImage = (imageFile) => {
return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            
            const extractedBytes = [];
            let currentByte = 0, bitIdx = 0;
            
            for (let i = 0; i < pixels.length; i += 4) {
                for (let j = 0; j < 3; j++) {
                    const bit = pixels[i+j] & 1;
                    currentByte |= (bit << bitIdx);
                    bitIdx++;
                    if (bitIdx === 8) {
                        extractedBytes.push(currentByte);
                        currentByte = 0; bitIdx = 0;
                    }
                }
                if (extractedBytes.length > 500) break; 
            }
            
            const uint8 = new Uint8Array(extractedBytes);
            const len = new DataView(uint8.buffer).getUint32(0);
            if (len <= 0 || len > 1000) return reject("No Hidden Data Found.");
            
            const textBytes = uint8.slice(4, 4 + len);
            const str = new TextDecoder().decode(textBytes);
            
            if (!str.startsWith(STEG_HEADER)) return reject("Not a GhostDrop Image.");
            resolve(str.replace(STEG_HEADER, ''));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(imageFile);
});
};

export default function App() {
const [mode, setMode] = useState('standard'); 

// Shared Upload State
const [files, setFiles] = useState([]);
const [decoyFiles, setDecoyFiles] = useState([]); 
const [coverImage, setCoverImage] = useState(null); 

// Security Options
const [burn, setBurn] = useState(false);
const [geo, setGeo] = useState(false);
const [loc, setLoc] = useState(null);
const [dmsMinutes, setDmsMinutes] = useState(5); 

// Results State
const [uploadedCid, setUploadedCid] = useState('');
const [uploadedKey, setUploadedKey] = useState('');
const [uploadedDuressKey, setUploadedDuressKey] = useState(''); 
const [tamperedImage, setTamperedImage] = useState(null); 
const [activeDmsCid, setActiveDmsCid] = useState(''); 

// LIVE TIMER STATE
const [dmsEndTime, setDmsEndTime] = useState(null);
const [dmsTimeLeft, setDmsTimeLeft] = useState('00:00');

// Decrypt / Track State
const [decryptCidInput, setDecryptCidInput] = useState('');
const [userKeyInput, setUserKeyInput] = useState('');
const [trackData, setTrackData] = useState(null);

// UI & System State
const [toast, setToast] = useState({ msg:'', type:'', visible:false });
const [loading, setLoading] = useState(false);
const [loadingText, setLoadingText] = useState('PROCESSING...');

// --- PANIC & HONEYPOT STATE ---
const [panicMode, setPanicMode] = useState(false);
const [failedAttempts, setFailedAttempts] = useState(0);
const [systemLocked, setSystemLocked] = useState(() => localStorage.getItem('ghostdrop_locked') === 'true');
const [intruderCid, setIntruderCid] = useState(() => localStorage.getItem('ghostdrop_intruderCid') || '');
const videoRef = useRef(null);

// --- STATE WIPER (Prevents old data from showing when switching tabs) ---
const switchMode = (newMode) => {
    setMode(newMode);
    setDecryptCidInput('');
    setUserKeyInput('');
    setTrackData(null);
    setUploadedCid('');
    setUploadedKey('');
    setUploadedDuressKey('');
    setTamperedImage(null);
    setActiveDmsCid('');
    setFiles([]);
    setDecoyFiles([]);
    setCoverImage(null);
    setDmsEndTime(null);
    setDmsTimeLeft('00:00');
};

// --- PANIC BUTTON EFFECT ---
useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'Q' || e.key === 'q')) {
            setPanicMode(true);
            setSystemLocked(false);
            window.localStorage.clear();
            window.sessionStorage.clear();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

// --- SMART CAMERA EFFECT ---
useEffect(() => {
    let stream = null;
    if (systemLocked && !panicMode) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(s => {
                stream = s;
                if(videoRef.current) {
                    videoRef.current.srcObject = stream;
                    if (!intruderCid) {
                        setTimeout(async () => {
                            if (videoRef.current) {
                                const evidenceCid = await captureAndUploadHoneypot(videoRef.current);
                                if(evidenceCid) {
                                    setIntruderCid(evidenceCid);
                                    localStorage.setItem('ghostdrop_intruderCid', evidenceCid);
                                    await axios.post('http://localhost:4000/report-intruder', { 
                                        targetCid: decryptCidInput, 
                                        evidenceCid: evidenceCid 
                                    }).catch(()=>{});
                                }
                            }
                        }, 1500); 
                    }
                }
            }).catch(err => console.log("Webcam access denied."));
    }
    return () => {
        if (stream) stream.getTracks().forEach(track => track.stop());
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
    };
}, [systemLocked, panicMode, intruderCid, decryptCidInput]);

useEffect(() => {
    if (!dmsEndTime) return;
    const tick = () => {
        const diff = dmsEndTime - Date.now();
        if (diff <= 0) {
            setDmsTimeLeft("RELEASED");
        } else {
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setDmsTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
    };
    tick(); 
    const id = setInterval(tick, 1000); 
    return () => clearInterval(id);
}, [dmsEndTime]);

const getThemeColor = () => {
    if(mode==='bond') return '#d29922';
    if(mode==='dead') return '#da3633';
    if(mode==='overwatch') return '#58a6ff';
    return '#238636';
};

const getThemeColorRGBA = (alpha) => {
    if(mode==='bond') return `rgba(210, 153, 34, ${alpha})`;
    if(mode==='dead') return `rgba(218, 54, 51, ${alpha})`;
    if(mode==='overwatch') return `rgba(88, 166, 255, ${alpha})`;
    return `rgba(35, 134, 54, ${alpha})`;
};

const showToast = (msg, type='info') => {
    setToast({ msg, type, visible: true });
    setTimeout(() => setToast({ ...toast, visible: false }), 3500);
};

const captureAndUploadHoneypot = async (videoElement) => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        canvas.getContext('2d').drawImage(videoElement, 0, 0, 640, 480);
        canvas.toBlob(async (blob) => {
            try {
                const fd = new FormData();
                fd.append('file', blob, "INTRUDER_EVIDENCE.png");
                const res = await axios.post('http://localhost:4000/upload', fd);
                resolve(res.data.cid);
            } catch(e) { resolve(null); }
        }, 'image/png');
    });
};

const handleUpload = async () => {
    if (!files.length) return showToast("Select real payload files first", "error");
    if (mode === 'bond' && !coverImage) return showToast("Select Cover Image", "error");
    if (mode === 'dead' && dmsMinutes < 1) return showToast("Set timer to at least 1 minute", "error");
    
    setLoadingText("ENCRYPTING PAYLOAD...");
    setLoading(true);
    try {
        const zipReal = new JSZip();
        files.forEach(f => zipReal.file(f.name, f));
        const zipRealBlob = await zipReal.generateAsync({type:'uint8array'});
        const realKey = CryptoJS.lib.WordArray.random(16).toString();
        const marker = new TextEncoder().encode(MARKER);
        const payloadReal = new Uint8Array(marker.length + zipRealBlob.length);
        payloadReal.set(marker, 0); payloadReal.set(zipRealBlob, marker.length);
        const encryptedReal = CryptoJS.AES.encrypt(CryptoJS.lib.WordArray.create(payloadReal), realKey).toString();

        let finalUploadString = encryptedReal;
        let duressKey = '';

        if (decoyFiles.length > 0) {
            const zipDecoy = new JSZip();
            decoyFiles.forEach(f => zipDecoy.file(f.name, f));
            const zipDecoyBlob = await zipDecoy.generateAsync({type:'uint8array'});
            duressKey = CryptoJS.lib.WordArray.random(16).toString();
            const payloadDecoy = new Uint8Array(marker.length + zipDecoyBlob.length);
            payloadDecoy.set(marker, 0); payloadDecoy.set(zipDecoyBlob, marker.length);
            const encryptedDecoy = CryptoJS.AES.encrypt(CryptoJS.lib.WordArray.create(payloadDecoy), duressKey).toString();
            
            finalUploadString = JSON.stringify({ r: encryptedReal, d: encryptedDecoy });
        }

        const finalBlob = new Blob([finalUploadString], {type:'text/plain'});
        
        setLoadingText("UPLOADING TO IPFS...");
        const fd = new FormData();
        fd.append('file', finalBlob, "secure.ghost");
        
        if(geo && loc) { fd.append('lat', loc.lat); fd.append('lng', loc.lng); }
        
        if (mode === 'dead') {
            fd.append('isDMS', 'true');
            fd.append('dmsTimerMinutes', dmsMinutes.toString());
            fd.append('escrowKey', realKey); 
        } else {
            if(burn) fd.append('maxDownloads', '1');
        }

        const res = await axios.post('http://localhost:4000/upload', fd);
        const cid = res.data.cid;
        
        if (mode === 'bond') {
            setLoadingText("ENCODING IMAGE...");
            const stegBlob = await embedTextInImage(coverImage, cid);
            setTamperedImage(URL.createObjectURL(stegBlob));
            setUploadedKey(realKey);
            setUploadedDuressKey(duressKey);
            showToast("Asset Tampered Successfully!", "success");
        } else if (mode === 'dead') {
            setUploadedCid(cid);
            setActiveDmsCid(cid);
            setUploadedKey(realKey); // Allow owner to keep a backup
            setDmsEndTime(Date.now() + (Number(dmsMinutes) * 60 * 1000));
            showToast("Dead Man's Switch Activated!", "success");
        } else {
            setUploadedCid(cid);
            setUploadedKey(realKey);
            setUploadedDuressKey(duressKey);
            showToast("Files Secured on IPFS!", "success");
        }
    } catch(e) { showToast("Upload Failed", "error"); }
    setLoading(false);
};

const handleCheckIn = async () => {
    setLoadingText("RESETTING TIMER..."); setLoading(true);
    try {
        const res = await axios.post('http://localhost:4000/checkin', { cid: activeDmsCid });
        setDmsEndTime(res.data.newReleaseTime); 
        showToast("Timer Reset! You are safe.", "success");
    } catch(e) { showToast("Failed to reset timer.", "error"); }
    setLoading(false);
};

const handleImageScan = async (file) => {
    if(!file) return;
    setLoadingText("ANALYZING PIXELS..."); setLoading(true);
    try {
        const cid = await extractTextFromImage(file);
        setDecryptCidInput(cid);
        showToast("Image Scanned. Secret Link Acquired!", "success");
    } catch(e) {
        setDecryptCidInput('');
        showToast("No hidden data found.", "error");
    }
    setLoading(false);
};

const handleDecrypt = async () => {
    if (!decryptCidInput) return showToast("No Payload detected", "error");
    if (mode !== 'dead' && !userKeyInput) return showToast("Enter Decryption Key", "error");

    setLoadingText("VERIFYING CREDENTIALS...");
    setLoading(true);
    
    let uLat = null, uLng = null;
    let authRes;

    try {
        authRes = await axios.post('http://localhost:4000/unlock', { cid: decryptCidInput });
    } catch (error) {
        if (error.response?.status === 403 && error.response?.data?.error?.includes('Location Access Required')) {
            setLoadingText("GEO-LOCK DETECTED. ACQUIRING SATELLITE...");
            try {
                const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, {timeout:5000, enableHighAccuracy:true}));
                uLat = pos.coords.latitude; uLng = pos.coords.longitude;
                setLoadingText("RE-VERIFYING CREDENTIALS...");
                authRes = await axios.post('http://localhost:4000/unlock', { cid: decryptCidInput, userLat: uLat, userLng: uLng });
            } catch (locErr) {
                setLoading(false);
                return showToast("Location Access Denied. Cannot unlock Geo-Locked payload.", "error");
            }
        } else {
            setLoading(false);
            return showToast(error.response?.data?.error || "Decryption Failed.", "error");
        }
    }

    try {
        const finalKey = mode === 'dead' ? authRes.data.escrowKey : userKeyInput;
        if(!finalKey) throw new Error("Key not provided");

        setLoadingText("DOWNLOADING PAYLOAD...");
        const res = await axios.get(PINATA_GATEWAY + decryptCidInput, { responseType: 'text' });
        setLoadingText("DECRYPTING DATA...");
        
        let encryptedStrList = [];
        try {
            const parsed = JSON.parse(res.data);
            if (parsed.r && parsed.d) encryptedStrList = [parsed.r, parsed.d];
            else encryptedStrList = [res.data];
        } catch(e) { encryptedStrList = [res.data]; }

        let decryptedBytes = null;
        let success = false;

        for (let encStr of encryptedStrList) {
            try {
                const decryptedParams = CryptoJS.AES.decrypt(encStr, finalKey);
                const bytes = new Uint8Array(decryptedParams.sigBytes);
                for(let i=0; i<decryptedParams.sigBytes; i++) bytes[i] = (decryptedParams.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                const markerBytes = new TextEncoder().encode(MARKER);
                let valid = true;
                for(let i=0; i<markerBytes.length; i++) {
                    if (bytes[i] !== markerBytes[i]) { valid = false; break; }
                }
                if (valid) {
                    decryptedBytes = bytes.slice(markerBytes.length);
                    success = true; break; 
                }
            } catch(err) { }
        }

        if (!success) throw new Error("Invalid Key");
        
        const zip = await JSZip.loadAsync(decryptedBytes);
        
        // --- NEW FIX APPLIED HERE ---
        // Wait for all local file extractions/downloads to trigger
        const extractPromises = Object.keys(zip.files).map(async (filename) => {
            const fBlob = await zip.files[filename].async('blob');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(fBlob);
            a.download = filename; 
            a.click();
        });
        
        await Promise.all(extractPromises);
        
        // Notify the server that the download was successfully completed by the client
        try {
            await axios.post('http://localhost:4000/log-download', { cid: decryptCidInput });
        } catch (logErr) {
            console.error("Failed to update download count on server", logErr);
        }
        // --- END OF FIX ---

        setFailedAttempts(0); 
        setLoading(false);
        showToast("Decryption Successful!", "success");
        
    } catch(e) {
        const newFails = failedAttempts + 1;
        setFailedAttempts(newFails);
        setLoading(false); 
        
        if (newFails >= 3) {
            setSystemLocked(true); 
            localStorage.setItem('ghostdrop_locked', 'true');
        } else {
            showToast(`Decryption Failed. Warning: ${3 - newFails} attempts remaining.`, "error");
        }
    }
};

const handleTrackPayload = async () => {
    if (!decryptCidInput) return showToast("Enter CID to track.", "error");
    setLoadingText("CONNECTING TO SATELLITE...");
    setLoading(true);
    try {
        const res = await axios.post('http://localhost:4000/track', { cid: decryptCidInput });
        setTrackData(res.data);
        showToast("Payload Located.", "success");
    } catch (error) {
        setTrackData(null);
        showToast(error.response?.data?.error || "Payload not found.", "error");
    }
    setLoading(false);
};

const renderUploadZone = () => {
    return (
        <>
            <div className="security-box">
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8b949e', letterSpacing: 1.5 }}>SECURITY PROTOCOLS</div>
                <div style={{display:'flex', gap: 30}}>
                    {mode !== 'dead' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: burn?'#fff':'#8b949e', fontWeight: burn?700:500 }}>
                            <input type="checkbox" checked={burn} onChange={e=>setBurn(e.target.checked)} style={{cursor:'pointer'}} />
                            <FaFire color={burn?"#ff7b72":"#8b949e"}/> Burn After Read
                        </label>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: geo?'#fff':'#8b949e', fontWeight: geo?700:500 }}>
                        <input type="checkbox" checked={geo} onChange={e=>{
                            if(e.target.checked) navigator.geolocation.getCurrentPosition(p=>{ setLoc({lat:p.coords.latitude, lng:p.coords.longitude}); setGeo(true); });
                            else { setGeo(false); setLoc(null); }
                        }} style={{cursor:'pointer'}} />
                        <FaGlobeAmericas color={geo?"#79c0ff":"#8b949e"}/> Geo-Lock
                    </label>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                <label className="dashed-drop-zone" style={{ borderColor: files.length ? getThemeColor() : 'rgba(255,255,255,0.2)', background: files.length ? getThemeColorRGBA(0.05) : '', minHeight: '120px' }}>
                    <input type="file" multiple onChange={e=>setFiles(Array.from(e.target.files))} style={{display:'none'}} />
                    {!files.length && <div className="scan-line" style={{background: getThemeColor(), boxShadow: `0 0 10px ${getThemeColor()}`}}></div>}
                    <FaFile size={28} color={files.length ? getThemeColor() : "rgba(255,255,255,0.4)"} style={{marginBottom:10}} />
                    <div style={{color: files.length ? getThemeColor() : 'rgba(255,255,255,0.6)', fontWeight:800, letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.8rem'}}>
                        {files.length ? 'REAL PAYLOAD SECURED' : 'DROP REAL PAYLOAD'}
                    </div>
                    <div style={{fontSize: '0.75rem', color: '#e6edf3', marginTop: 8, fontWeight: 600}}>{files.length ? `${files.length} files selected` : 'Click to browse'}</div>
                </label>

                {mode !== 'dead' && (
                    <label className="dashed-drop-zone" style={{ borderColor: decoyFiles.length ? '#a371f7' : 'rgba(255,255,255,0.1)', background: decoyFiles.length ? 'rgba(163, 113, 247, 0.05)' : '', minHeight: '90px' }}>
                        <input type="file" multiple onChange={e=>setDecoyFiles(Array.from(e.target.files))} style={{display:'none'}} />
                        <FaUserShield size={20} color={decoyFiles.length ? "#a371f7" : "rgba(255,255,255,0.2)"} style={{marginBottom:8}} />
                        <div style={{color: decoyFiles.length ? '#a371f7' : 'rgba(255,255,255,0.4)', fontWeight:800, letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.7rem'}}>
                            {decoyFiles.length ? 'DECOY PAYLOAD READY' : 'DROP DECOY PAYLOAD (OPTIONAL)'}
                        </div>
                    </label>
                )}

                {mode === 'bond' && (
                    <label className="dashed-drop-zone" style={{ borderColor: coverImage ? getThemeColor() : 'rgba(210, 153, 34, 0.4)', background: coverImage ? 'rgba(210, 153, 34, 0.05)' : '', minHeight: '120px' }}>
                        <input type="file" accept="image/*" onChange={e=>setCoverImage(e.target.files[0])} style={{display:'none'}} />
                        {!coverImage && <div className="scan-line" style={{background: getThemeColor(), boxShadow: `0 0 10px ${getThemeColor()}`}}></div>}
                        <FaImage size={28} color={coverImage ? getThemeColor() : "rgba(210, 153, 34, 0.7)"} style={{marginBottom:10}} />
                        <div style={{color: coverImage ? getThemeColor() : 'rgba(210, 153, 34, 0.7)', fontWeight:800, letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.8rem'}}>
                            {coverImage ? 'COVER IMAGE SELECTED' : 'DROP COVER IMAGE'}
                        </div>
                    </label>
                )}

                {mode === 'dead' && (
                    <div className="security-box" style={{border: '1px solid rgba(218, 54, 51, 0.4)', background: 'rgba(218, 54, 51, 0.05)'}}>
                        <label style={{fontSize:'0.65rem', color:'#ff7b72', display:'block', fontWeight: 800, letterSpacing: 1}}>ESCROW TIMER (MINUTES)</label>
                        <input type="number" min="1" value={dmsMinutes} onChange={e=>setDmsMinutes(e.target.value)} placeholder="e.g. 60" style={{borderColor: 'rgba(218, 54, 51, 0.3)'}}/>
                    </div>
                )}
            </div>
        </>
    );
};

return (
    <div className="ghost-container" style={{ padding: systemLocked || panicMode ? '0' : '40px 20px' }}>
    <style>{STYLES}</style>
    <Spinner visible={loading} text={loadingText} color={getThemeColor()} />
    <Toast {...toast} />
    
    {!panicMode && (
        <video 
            ref={videoRef} 
            autoPlay playsInline muted 
            style={{ display: systemLocked ? 'block' : 'none', position: systemLocked ? 'fixed' : 'absolute', top: systemLocked ? '45%' : '-9999px', left: systemLocked ? '50%' : '-9999px', transform: systemLocked ? 'translate(-50%, -50%) scaleX(-1)' : 'none', width: systemLocked ? '600px' : 'auto', border: systemLocked ? '6px solid #da3633' : 'none', borderRadius: systemLocked ? '16px' : '0', boxShadow: systemLocked ? '0 0 80px rgba(218,54,51,0.8)' : 'none', zIndex: systemLocked ? 10000 : -1, animation: systemLocked ? 'flash-border 2s infinite' : 'none'}} 
        />
    )}

    {panicMode && ( <iframe src="https://en.wikipedia.org/wiki/Main_Page" style={{width:'100vw', height:'100vh', border:'none', margin:0, padding:0}} title="Cover" /> )}

    {systemLocked && !panicMode && (
        <div style={{ height: '100vh', width: '100vw', background: '#050608', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#da3633', fontFamily: 'monospace', textAlign: 'center', padding: '20px', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
            <h1 style={{ fontSize: '3.5rem', letterSpacing: '8px', margin: '0 0 20px 0', animation: 'pulse-red 1s infinite' }}>SYSTEM LOCKED</h1>
            <div style={{ height: '400px' }}></div> 
            <h2 style={{ color: '#e6edf3', marginTop: 20, letterSpacing: '2px' }}>UNAUTHORIZED ACCESS DETECTED</h2>
            {intruderCid ? (
                <div style={{ marginTop: 20, background: 'rgba(218, 54, 51, 0.1)', padding: '20px 40px', borderRadius: 10, border: '1px solid #da3633' }}>
                    <div style={{ color: '#ff7b72', fontWeight: 'bold', marginBottom: 10 }}>EVIDENCE CAPTURED & LOGGED TO BLOCKCHAIN:</div>
                    <div style={{ color: '#fff', wordBreak: 'break-all', fontSize: '1.2rem' }}>{intruderCid}</div>
                </div>
            ) : (
                <div style={{ marginTop: 20, color: '#ff7b72', animation: 'pulse-red 1s infinite', fontSize: '1.2rem', fontWeight: 'bold' }}>TRANSMITTING EVIDENCE TO BLOCKCHAIN...</div>
            )}
        </div>
    )}

    {!systemLocked && !panicMode && (
        <>
        <div style={{ width: '100%', maxWidth: 940, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, flexWrap: 'wrap', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                <FaGhost size={34} color={getThemeColor()} style={{transition: 'color 0.3s', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.1))'}} />
                <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#fff', letterSpacing: -1, fontWeight: 900 }}>GHOSTDROP</h1>
            </div>
            <div className="tab-container">
            <button className={`tab ${mode==='standard'?'active-std':''}`} onClick={()=>switchMode('standard')}><FaLock/> Standard</button>
            <button className={`tab ${mode==='bond'?'active-bond':''}`} onClick={()=>switchMode('bond')}><FaUserSecret/> 007 Mode</button>
            <button className={`tab ${mode==='dead'?'active-dead':''}`} onClick={()=>switchMode('dead')}><FaSkull/> Dead Man</button>
            <button className={`tab ${mode==='overwatch'?'active-overwatch':''}`} onClick={()=>switchMode('overwatch')}><FaSatelliteDish/> Overwatch</button>
            </div>
        </div>

        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
            
            {/* --- LEFT PANEL --- */}
            {mode !== 'overwatch' ? (
                <div className="panel">
                    <h2 style={{ margin: 0, fontSize: '1.1rem', color: getThemeColor(), display:'flex', alignItems:'center', gap:10, textTransform: 'uppercase', marginBottom: 10 }}>
                        {mode === 'standard' && <><FaLock/> SECURE UPLOAD</>}
                        {mode === 'bond' && <><FaUserSecret/> 007 ENCODER</>}
                        {mode === 'dead' && <><FaSkull/> ESCROW SETUP</>}
                    </h2>

                    {renderUploadZone()}

                    <button className={`btn btn-${mode==='standard'?'upload-green':mode==='bond'?'bond':'dead'}`} onClick={handleUpload}>
                        {mode==='standard' ? 'ENCRYPT & UPLOAD' : mode==='bond' ? 'ENCODE & TAMPER' : 'INITIATE ESCROW'}
                    </button>
                    
                    {/* RESULTS */}
                    {mode === 'standard' && uploadedCid && (
                        <div style={{background: getThemeColorRGBA(0.1), border:`1px solid ${getThemeColorRGBA(0.4)}`, borderRadius:12, padding:20, animation:'scan 0.3s ease'}}>
                            <div style={{fontSize:'0.65rem', fontWeight: 800, color:'#8b949e', marginBottom:5, letterSpacing:1}}>IPFS CID</div>
                            <div style={{display:'flex', gap:10, marginBottom:20}}>
                                <input type="text" value={uploadedCid} readOnly style={{color: getThemeColor(), borderColor: getThemeColorRGBA(0.3)}}/>
                                <button onClick={()=>{navigator.clipboard.writeText(uploadedCid); showToast("CID Copied")}} className="btn" style={{width:'auto', padding:'0 18px', background:getThemeColorRGBA(0.2), border:`1px solid ${getThemeColorRGBA(0.4)}`, color:getThemeColor()}}><FaRegCopy size={16}/></button>
                            </div>
                            <div style={{fontSize:'0.65rem', fontWeight: 800, color:'#8b949e', marginBottom:5, letterSpacing:1}}>REAL DECRYPTION KEY</div>
                            <div style={{display:'flex', gap:10, marginBottom: uploadedDuressKey ? 20 : 0}}>
                                <input type="text" value={uploadedKey} readOnly style={{color: '#d2a8ff', borderColor: 'rgba(210, 168, 255, 0.3)'}}/>
                                <button onClick={()=>{navigator.clipboard.writeText(uploadedKey); showToast("Key Copied")}} className="btn" style={{width:'auto', padding:'0 18px', background:'rgba(210, 168, 255, 0.2)', border:'1px solid rgba(210, 168, 255, 0.4)', color:'#d2a8ff'}}><FaRegCopy size={16}/></button>
                            </div>
                            {uploadedDuressKey && (
                                <>
                                <div style={{fontSize:'0.65rem', fontWeight: 800, color:'#a371f7', marginBottom:5, letterSpacing:1}}>DURESS KEY (DECOY PAYLOAD)</div>
                                <div style={{display:'flex', gap:10}}>
                                    <input type="text" value={uploadedDuressKey} readOnly style={{color: '#a371f7', borderColor: 'rgba(163, 113, 247, 0.3)'}}/>
                                    <button onClick={()=>{navigator.clipboard.writeText(uploadedDuressKey); showToast("Duress Key Copied")}} className="btn" style={{width:'auto', padding:'0 18px', background:'rgba(163, 113, 247, 0.2)', border:'1px solid rgba(163, 113, 247, 0.4)', color:'#a371f7'}}><FaRegCopy size={16}/></button>
                                </div>
                                </>
                            )}
                        </div>
                    )}

                    {mode === 'dead' && activeDmsCid && (
                        <div style={{background:'rgba(218, 54, 51, 0.1)', border:'1px solid rgba(218, 54, 51, 0.4)', borderRadius:12, padding:20, textAlign:'center', animation:'scan 0.3s ease'}}>
                            <FaHeartbeat size={46} color="#da3633" style={{marginBottom: 15, animation: 'scan 1s infinite'}} />
                            <div style={{color:'#da3633', fontWeight:800, fontSize:'1rem', marginBottom:5, letterSpacing: 1}}>DEAD MAN SWITCH ACTIVE</div>
                            
                            <div className="dms-timer">
                                {dmsTimeLeft}
                            </div>

                            <div style={{fontSize: '0.85rem', color: '#8b949e', marginBottom: 20, lineHeight: 1.5}}>Share this CID with your trusted contact. The server will automatically release the key when the timer hits zero.</div>
                            
                            <div style={{fontSize:'0.65rem', fontWeight: 800, color:'#8b949e', marginBottom:5, letterSpacing:1, textAlign:'left'}}>IPFS CID (SHARE THIS)</div>
                            <div style={{display:'flex', gap:10, marginBottom:15}}>
                                <input type="text" value={activeDmsCid} readOnly style={{color: '#ff7b72', borderColor: 'rgba(218, 54, 51, 0.3)'}}/>
                                <button onClick={()=>{navigator.clipboard.writeText(activeDmsCid); showToast("CID Copied")}} className="btn" style={{width:'auto', padding:'0 18px', background:'rgba(218, 54, 51, 0.2)', border:'1px solid rgba(218, 54, 51, 0.4)', color:'#ff7b72'}}><FaRegCopy size={16}/></button>
                            </div>

                            {/* Backup Key explicitly shown */}
                            <div style={{fontSize:'0.65rem', fontWeight: 800, color:'#8b949e', marginBottom:5, letterSpacing:1, textAlign:'left'}}>ESCROW KEY (YOUR BACKUP)</div>
                            <div style={{display:'flex', gap:10, marginBottom:20}}>
                                <input type="text" value={uploadedKey} readOnly style={{color: '#ff7b72', borderColor: 'rgba(218, 54, 51, 0.3)'}}/>
                                <button onClick={()=>{navigator.clipboard.writeText(uploadedKey); showToast("Key Copied")}} className="btn" style={{width:'auto', padding:'0 18px', background:'rgba(218, 54, 51, 0.2)', border:'1px solid rgba(218, 54, 51, 0.4)', color:'#ff7b72'}}><FaRegCopy size={16}/></button>
                            </div>

                            <button className="btn btn-dead" onClick={handleCheckIn}>I AM SAFE (RESET TIMER)</button>
                        </div>
                    )}

                    {mode === 'bond' && tamperedImage && (
                        <div style={{background:'rgba(210, 153, 34, 0.1)', border:'1px solid rgba(210, 153, 34, 0.4)', borderRadius:12, padding:20, textAlign:'center', animation:'scan 0.3s ease'}}>
                            <div style={{color:'#d29922', fontWeight:800, fontSize:'0.9rem', marginBottom:15, letterSpacing:1}}>CONFIDENTIAL ASSET READY</div>
                            
                            <img src={tamperedImage} alt="Tampered Asset" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', border: '2px solid rgba(210, 153, 34, 0.5)', marginBottom: '15px', background: '#000' }} />

                            <a href={tamperedImage} download="asset_007.png" style={{background:'#d29922', color:'#0d1117', textDecoration:'none', padding:'14px 24px', borderRadius:10, fontWeight:800, display:'inline-flex', alignItems:'center', gap:10, fontSize:'0.9rem', textTransform: 'uppercase', width: '100%', justifyContent: 'center'}}>
                                <FaDownload size={16}/> Download Image
                            </a>
                            
                            <div style={{marginTop:20, background:'rgba(0,0,0,0.4)', padding:15, borderRadius:10, border:'1px solid rgba(210, 153, 34, 0.2)'}}>
                                <div style={{fontSize:'0.65rem', fontWeight: 800, color:'#8b949e', marginBottom:8, letterSpacing:1, textAlign: 'left'}}>REAL DECRYPTION KEY</div>
                                <div style={{display:'flex', gap:10, marginBottom: uploadedDuressKey ? 15 : 0}}>
                                    <input type="text" value={uploadedKey} readOnly style={{color: '#d29922', borderColor: 'rgba(210, 153, 34, 0.3)'}}/>
                                    <button onClick={()=>{navigator.clipboard.writeText(uploadedKey); showToast("Key Copied")}} className="btn" style={{width:'auto', padding:'0 18px', background:'rgba(210, 153, 34, 0.2)', border:'1px solid rgba(210, 153, 34, 0.4)', color:'#d29922'}}><FaRegCopy size={16}/></button>
                                </div>
                                
                                {uploadedDuressKey && (
                                    <>
                                    <div style={{fontSize:'0.65rem', fontWeight: 800, color:'#a371f7', marginBottom:8, letterSpacing:1, textAlign: 'left'}}>DURESS KEY (DECOY PAYLOAD)</div>
                                    <div style={{display:'flex', gap:10}}>
                                        <input type="text" value={uploadedDuressKey} readOnly style={{color: '#a371f7', borderColor: 'rgba(163, 113, 247, 0.3)'}}/>
                                        <button onClick={()=>{navigator.clipboard.writeText(uploadedDuressKey); showToast("Duress Key Copied")}} className="btn" style={{width:'auto', padding:'0 18px', background:'rgba(163, 113, 247, 0.2)', border:'1px solid rgba(163, 113, 247, 0.4)', color:'#a371f7'}}><FaRegCopy size={16}/></button>
                                    </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* OVERWATCH LEFT PANEL */
                <div className="panel" style={{ width: '100%', maxWidth: '940px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#58a6ff', display:'flex', alignItems:'center', gap:10, textTransform: 'uppercase', marginBottom: 10 }}>
                        <FaCrosshairs/> OVERWATCH SATELLITE
                    </h2>
                    
                    <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
                        <input type="text" value={decryptCidInput} onChange={e=>setDecryptCidInput(e.target.value)} placeholder="Enter CID to track..." style={{ flex: 1 }} />
                        <button className="btn btn-overwatch" style={{ width: 'auto', padding: '0 30px' }} onClick={handleTrackPayload}>SCAN</button>
                    </div>

                    {trackData && (
                        <div style={{ animation: 'scan 0.3s ease' }}>
                            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                                <div className="security-box" style={{ flex: 1, minWidth: '200px', borderColor: trackData.status === 'COMPROMISED' ? '#da3633' : 'rgba(255,255,255,0.08)' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#8b949e', fontWeight: 800, letterSpacing: 1 }}>STATUS</span>
                                    <span style={{ fontSize: '1.2rem', color: trackData.status === 'COMPROMISED' ? '#da3633' : '#7ee787', fontWeight: 'bold' }}>
                                        {trackData.status === 'COMPROMISED' ? 'DESTROYED (SCORCHED EARTH)' : trackData.status}
                                    </span>
                                </div>
                                <div className="security-box" style={{ flex: 1, minWidth: '200px' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#8b949e', fontWeight: 800, letterSpacing: 1 }}>EXPIRY / DMS</span>
                                    <span style={{ fontSize: '1.2rem', color: '#e6edf3', fontWeight: 'bold' }}>
                                        {trackData.isDMS ? `${trackData.dmsMinsLeft} Mins Left` : `${trackData.expiresInHours} Hours Left`}
                                    </span>
                                </div>
                                <div className="security-box" style={{ flex: 1, minWidth: '200px' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#8b949e', fontWeight: 800, letterSpacing: 1 }}>DOWNLOADS</span>
                                    <span style={{ fontSize: '1.2rem', color: '#e6edf3', fontWeight: 'bold' }}>{trackData.currentDownloads} / {trackData.maxDownloads || '∞'}</span>
                                </div>
                            </div>

                            {trackData.intruderEvidence && trackData.intruderEvidence.length > 0 && (
                                <div style={{ marginTop: 30, background: 'rgba(218, 54, 51, 0.1)', border: '2px solid #da3633', borderRadius: '12px', padding: '20px' }}>
                                    <h3 style={{ margin: '0 0 15px 0', color: '#ff7b72', display: 'flex', alignItems: 'center', gap: 10, animation: 'pulse-red 1s infinite' }}>
                                        <FaUserShield/> SECURITY ALERT: INTRUDER PHOTOGRAPHED
                                    </h3>
                                    <div style={{ display: 'flex', gap: 15, overflowX: 'auto', paddingBottom: 10 }}>
                                        {trackData.intruderEvidence.map((evCid, idx) => (
                                            <div key={idx} style={{ minWidth: '250px', background: '#0d1117', padding: 10, borderRadius: 8, border: '1px solid #30363d' }}>
                                                <img src={`${PINATA_GATEWAY}${evCid}`} alt="Intruder" style={{ width: '100%', borderRadius: 6, marginBottom: 10, border: '1px solid #da3633' }} />
                                                <div style={{ fontSize: '0.65rem', color: '#8b949e', wordBreak: 'break-all' }}>EVIDENCE CID: {evCid}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* --- RIGHT PANEL --- */}
            {mode !== 'overwatch' && (
                <div className="panel">
                    <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#e6edf3', display:'flex', alignItems:'center', gap:10, textTransform: 'uppercase', marginBottom: 10 }}>
                        <FaSearch/> {mode==='bond' ? '007 DECODER' : mode==='dead' ? 'ESCROW RETRIEVAL' : 'DECRYPTION CONSOLE'}
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        
                        {mode !== 'bond' && (
                            <>
                            <div>
                                <label style={{fontSize:'0.65rem', fontWeight: 800, color:'#8b949e', display:'block', marginBottom:8, letterSpacing:1}}>IPFS CID</label>
                                <input type="text" value={decryptCidInput} onChange={e=>setDecryptCidInput(e.target.value)} placeholder="Paste CID here..." />
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <hr style={{ flex: 1, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'solid', borderWidth: '1px 0 0 0', margin: 0 }} />
                                <span style={{ fontSize: '0.65rem', color: '#8b949e', fontWeight: 800, letterSpacing: 1 }}>OR AUTO-EXTRACT</span>
                                <hr style={{ flex: 1, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'solid', borderWidth: '1px 0 0 0', margin: 0 }} />
                            </div>
                            </>
                        )}

                        <label className="dashed-drop-zone" style={{ borderColor: decryptCidInput ? '#238636' : getThemeColor(), background: decryptCidInput ? 'rgba(35, 134, 54, 0.05)' : '' }}>
                            <input type="file" accept="image/*" onChange={e=>handleImageScan(e.target.files[0])} style={{display:'none'}} />
                            {!decryptCidInput && <div className="scan-line" style={{background: getThemeColor(), boxShadow: `0 0 15px ${getThemeColor()}`}}></div>}
                            
                            {mode === 'bond' ? <FaUserSecret size={40} color={decryptCidInput ? "#238636" : getThemeColor()} style={{marginBottom:15}} /> : <FaImage size={40} color={decryptCidInput ? "#238636" : getThemeColor()} style={{marginBottom:15}} />}
                            
                            <div style={{color: decryptCidInput ? '#238636' : getThemeColor(), fontWeight:800, letterSpacing: 1, textTransform: 'uppercase'}}>
                                {decryptCidInput ? 'PAYLOAD LOCATED' : 'DROP TAMPERED IMAGE'}
                            </div>
                        </label>

                        {mode === 'bond' && decryptCidInput && (
                            <div style={{ background: 'rgba(35, 134, 54, 0.1)', border: '1px solid #238636', padding: '12px', borderRadius: '8px', color: '#7ee787', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>
                                ✅ SECRET PAYLOAD LOCATED IN IMAGE
                            </div>
                        )}
                    </div>

                    {(decryptCidInput || mode === 'standard' || mode === 'dead') && (
                        <div style={{animation:'scan 0.3s ease', marginTop: 10}}>
                            {mode !== 'dead' && (
                                <>
                                <label style={{fontSize:'0.65rem', fontWeight: 800, color:'#8b949e', display:'block', marginBottom:8, letterSpacing:1}}>DECRYPTION KEY</label>
                                <div style={{position:'relative'}}>
                                    <FaKey style={{position:'absolute', top:16, left:16, color:'#8b949e', fontSize:'0.9rem'}}/>
                                    <input type="text" value={userKeyInput} onChange={e=>setUserKeyInput(e.target.value)} placeholder="Enter secure key" style={{paddingLeft:45}} />
                                </div>
                                </>
                            )}
                            
                            {mode === 'dead' && (
                                <div style={{background: 'rgba(218, 54, 51, 0.05)', border: '1px dashed rgba(218, 54, 51, 0.4)', padding: 15, borderRadius: 10, color: '#ff7b72', fontSize: '0.85rem', textAlign: 'center'}}>
                                    <FaLock style={{marginBottom: 8, fontSize: '1.2rem'}}/><br/>
                                    The server holds the key. If the sender's timer has expired, the server will automatically unlock the payload.
                                </div>
                            )}

                            <button className={`btn btn-${mode==='standard'?'upload-green':mode==='bond'?'bond':'dead'}`} style={{marginTop:25}} onClick={handleDecrypt}>
                                {mode === 'bond' ? 'EXTRACT INTELLIGENCE' : mode==='dead' ? 'CHECK STATUS & DOWNLOAD' : 'DECRYPT & DOWNLOAD'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
        </>
    )}
    </div>
);
}