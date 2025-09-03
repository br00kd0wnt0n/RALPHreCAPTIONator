# 🎵 Sonic Prism - Collaborative Soundscapes

## Quick Start Guide

### 1. Start the Backend Server
```bash
npm run server
```
This runs the WebSocket collaboration server on port 3002.

### 2. Start the Frontend (in another terminal)
```bash
npm run dev
```
This runs the React app on port 3001.

### 3. Create a Jam Session

**Host (User 1):**
1. Open http://localhost:3001
2. Choose "Collaborative Jam"
3. Enter your name
4. Select starting instrument (Visual/Pads/Both)
5. Click "Start Session"
6. Share the 6-character code with collaborator

**Collaborator (User 2):**
1. Open http://localhost:3001 (same or different device)
2. Choose "Collaborative Jam"
3. Enter your name
4. Select starting instrument 
5. Enter the session code
6. Click "Join Session"

### 4. Making Music Together

**Instrument Switching:**
- **Visual Only**: Full-screen camera-reactive synth
- **Pads Only**: 16-pad controller (AKAI MPC style)
- **Split View**: Both instruments side-by-side

**Controls:**
- Switch between instruments anytime using header buttons
- Record your jam with the "Record" button
- Download recordings as audio files
- See real-time collaboration - all actions sync instantly

### 5. Recording & Playback

- **Record**: Captures mixed output from all instruments
- **Playback**: Listen to recordings in-browser
- **Download**: Save as WebM audio file

## Instrument Details

### 📷 Visual Synth
- 4 distinct presets with unique visual responses
- Camera movement and colors control synthesis
- Real-time parameter sharing between users

### 🎹 Pad Controller  
- 16 velocity-sensitive pads
- Keyboard shortcuts: 1-4, Q-R, A-F, Z-V
- Each pad has different note and color
- Touch/mouse velocity controls volume and filter

## Technical Architecture

```
User A (Visual) ←→ WebSocket Server ←→ User B (Pads)
       ↓                 ↓                   ↓
   Audio Context  →  Master Mixer  ←  Audio Context
                         ↓
                   MediaRecorder
                         ↓
                    Audio File
```

This proof of concept demonstrates:
- Real-time collaboration via WebSockets
- Multi-instrument audio mixing
- Session-based user management
- Audio recording and export
- Flexible instrument switching

Ready for collaborative soundscape creation! 🎶