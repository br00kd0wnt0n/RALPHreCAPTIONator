import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import VisualSynthV2 from './VisualSynthV2';
import PadController from './PadController';

const CollaborativeSoundscape = () => {
  // Session state
  const [currentScreen, setCurrentScreen] = useState('welcome'); // welcome, create, join, session
  const [sessionCode, setSessionCode] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [userName, setUserName] = useState('');
  const [socket, setSocket] = useState(null);
  
  // Instrument state
  const [activeInstrument, setActiveInstrument] = useState('pads'); // 'visual', 'pads', 'both'
  const [viewMode, setViewMode] = useState('split'); // 'split', 'visual', 'pads'
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  
  // Audio context refs
  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const recorderDestinationRef = useRef(null);
  
  // Initialize audio context
  const initAudio = async () => {
    if (audioContextRef.current) return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContext();
    
    // Master gain for overall volume
    masterGainRef.current = audioContextRef.current.createGain();
    masterGainRef.current.gain.value = 0.8;
    masterGainRef.current.connect(audioContextRef.current.destination);
    
    // Create destination for recording
    recorderDestinationRef.current = audioContextRef.current.createMediaStreamDestination();
    masterGainRef.current.connect(recorderDestinationRef.current);
  };
  
  // Connect to WebSocket server
  useEffect(() => {
    if (currentScreen === 'session' && !socket) {
      // Use environment variable for production, fallback to localhost for dev
      const serverUrl = process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:3002';
      const newSocket = io(serverUrl);
      setSocket(newSocket);
      
      newSocket.on('connect', () => {
        console.log('Connected to collaboration server');
      });
      
      newSocket.on('user-joined', ({ user, users }) => {
        console.log('User joined:', user);
        setSessionInfo(prev => ({ ...prev, users }));
      });
      
      newSocket.on('user-left', ({ userId }) => {
        console.log('User left:', userId);
        setSessionInfo(prev => ({
          ...prev,
          users: prev.users.filter(u => u.id !== userId)
        }));
      });
      
      return () => {
        newSocket.close();
      };
    }
  }, [currentScreen, socket]);
  
  // Create session
  const handleCreateSession = async () => {
    await initAudio();
    
    // Use environment variable for production, fallback to localhost for dev
    const serverUrl = process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:3002';
    const tempSocket = io(serverUrl, { timeout: 5000 });
    
    // Add connection timeout
    let connectionTimeout = setTimeout(() => {
      tempSocket.close();
      // Fallback to offline mode
      const localCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setSessionCode(localCode);
      setSessionInfo({ 
        code: localCode, 
        users: [{ id: 'local', name: userName, instrument: activeInstrument }],
        isOffline: true 
      });
      setCurrentScreen('session');
      alert('Collaboration server not available. Running in offline mode. Start the server with "npm run server" to enable collaboration.');
    }, 3000);
    
    tempSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      clearTimeout(connectionTimeout);
      tempSocket.close();
      // Already handled by timeout
    });
    
    tempSocket.on('connect', () => {
      clearTimeout(connectionTimeout);
      console.log('Socket connected, creating session...');
      tempSocket.emit('create-session', 
        { name: userName, instrument: activeInstrument },
        (response) => {
          console.log('Session creation response:', response);
          if (response.success) {
            setSessionCode(response.sessionCode);
            setSessionInfo(response.session);
            setSocket(tempSocket);
            setCurrentScreen('session');
          } else {
            alert('Failed to create session: ' + response.error);
          }
        }
      );
    });
  };
  
  // Join session
  const handleJoinSession = async () => {
    await initAudio();
    
    // Use environment variable for production, fallback to localhost for dev
    const serverUrl = process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:3002';
    const tempSocket = io(serverUrl, { timeout: 5000 });
    
    // Add connection timeout
    let connectionTimeout = setTimeout(() => {
      tempSocket.close();
      alert('Could not connect to collaboration server. Running in offline mode. Start the server with "npm run server" to enable collaboration.');
      // Fallback to offline mode
      setSessionInfo({ 
        code: sessionCode, 
        users: [{ id: 'local', name: userName, instrument: activeInstrument }],
        isOffline: true 
      });
      setCurrentScreen('session');
    }, 3000);
    
    tempSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      clearTimeout(connectionTimeout);
      tempSocket.close();
      // Already handled by timeout
    });
    
    tempSocket.on('connect', () => {
      clearTimeout(connectionTimeout);
      tempSocket.emit('join-session', 
        { sessionCode, userData: { name: userName, instrument: activeInstrument }},
        (response) => {
          if (response.success) {
            setSessionInfo(response.session);
            setSocket(tempSocket);
            setCurrentScreen('session');
          } else {
            alert(response.error);
          }
        }
      );
    });
  };
  
  // Start recording
  const startRecording = () => {
    if (!recorderDestinationRef.current) return;
    
    const recorder = new MediaRecorder(recorderDestinationRef.current.stream);
    const chunks = [];
    
    recorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedAudio(url);
    };
    
    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };
  
  // UI Styles - Match original Visual Synth aesthetic
  const styles = {
    container: {
      minHeight: '100vh',
      background: '#f5f5f5',
      color: '#2a2a2a',
      fontFamily: '"Space Mono", "IBM Plex Mono", monospace',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      padding: '15px 20px',
      background: '#ffffff',
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    welcomeBox: {
      maxWidth: '600px',
      margin: window.innerWidth > 768 ? '100px auto' : '20px auto',
      padding: window.innerWidth > 768 ? '40px' : '20px',
      background: '#ffffff',
      border: '1px solid #e0e0e0',
      borderRadius: '0px',
      textAlign: 'center'
    },
    button: {
      padding: '12px 24px',
      margin: '5px',
      border: '1px solid #e0e0e0',
      borderRadius: '0px',
      background: '#ffffff',
      color: '#2a2a2a',
      fontSize: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: '"Space Mono", "IBM Plex Mono", monospace',
      letterSpacing: '0.05em'
    },
    input: {
      padding: '12px',
      margin: '10px',
      border: '1px solid #e0e0e0',
      borderRadius: '0px',
      background: '#ffffff',
      color: '#2a2a2a',
      fontSize: '14px',
      width: '250px',
      fontFamily: '"Space Mono", "IBM Plex Mono", monospace'
    },
    instrumentToggle: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'center',
      padding: '10px',
      background: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '10px',
      margin: '20px auto',
      maxWidth: '500px'
    },
    toggleButton: {
      flex: 1,
      padding: '10px',
      border: 'none',
      borderRadius: '6px',
      background: 'rgba(255, 255, 255, 0.1)',
      color: 'white',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    activeToggle: {
      background: 'rgba(255, 255, 255, 0.3)',
      transform: 'scale(1.05)'
    }
  };
  
  // Render welcome screen
  if (currentScreen === 'welcome') {
    return (
      <div style={styles.container}>
        <div style={{...styles.welcomeBox, position: 'relative'}}>
          <button 
            style={{
              ...styles.button,
              position: 'absolute',
              top: '20px',
              left: '20px',
              padding: '8px 16px'
            }}
            onClick={() => window.location.reload()}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '28px', marginBottom: '8px', fontWeight: '300', letterSpacing: '0.1em' }}>BD-1 WAVELENGTH</h1>
          <h2 style={{ fontSize: '11px', marginBottom: '40px', opacity: 0.6, letterSpacing: '0.05em' }}>
            COLLABORATIVE VISUAL SYNTH
          </h2>
          
          <input
            style={styles.input}
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          
          <div style={{ marginTop: '40px' }}>
            <button 
              style={styles.button}
              onClick={() => userName && setCurrentScreen('create')}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              Create New Session
            </button>
            <button 
              style={styles.button}
              onClick={() => userName && setCurrentScreen('join')}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              Join Existing Session
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Render create session screen
  if (currentScreen === 'create') {
    return (
      <div style={styles.container}>
        <div style={styles.welcomeBox}>
          <button 
            style={{
              ...styles.button,
              position: 'absolute',
              top: '20px',
              left: '20px',
              padding: '8px 16px'
            }}
            onClick={() => setCurrentScreen('welcome')}
          >
            ← Back
          </button>
          <h2 style={{ marginBottom: '30px' }}>Create New Session</h2>
          
          <p style={{ marginBottom: '30px', opacity: 0.8 }}>
            Choose your starting instrument (you can switch anytime):
          </p>
          
          <div style={styles.instrumentToggle}>
            <button
              style={{
                ...styles.toggleButton,
                ...(activeInstrument === 'visual' ? styles.activeToggle : {})
              }}
              onClick={() => setActiveInstrument('visual')}
            >
              📷 Visual Synth
            </button>
            <button
              style={{
                ...styles.toggleButton,
                ...(activeInstrument === 'pads' ? styles.activeToggle : {})
              }}
              onClick={() => setActiveInstrument('pads')}
            >
              🎹 Pad Controller
            </button>
            <button
              style={{
                ...styles.toggleButton,
                ...(activeInstrument === 'both' ? styles.activeToggle : {})
              }}
              onClick={() => setActiveInstrument('both')}
            >
              🎛️ Both
            </button>
          </div>
          
          <button 
            style={{ 
              ...styles.button, 
              marginTop: '30px',
              opacity: userName ? 1 : 0.5,
              cursor: userName ? 'pointer' : 'not-allowed'
            }}
            onClick={userName ? handleCreateSession : null}
            disabled={!userName}
          >
            {userName ? 'Start Session' : 'Enter Name First'}
          </button>
        </div>
      </div>
    );
  }
  
  // Render join session screen
  if (currentScreen === 'join') {
    return (
      <div style={styles.container}>
        <div style={styles.welcomeBox}>
          <button 
            style={{
              ...styles.button,
              position: 'absolute',
              top: '20px',
              left: '20px',
              padding: '8px 16px'
            }}
            onClick={() => setCurrentScreen('welcome')}
          >
            ← Back
          </button>
          <h2 style={{ marginBottom: '30px' }}>Join Session</h2>
          
          <input
            style={{ ...styles.input, textTransform: 'uppercase' }}
            placeholder="Enter session code"
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          
          <p style={{ marginTop: '30px', marginBottom: '30px', opacity: 0.8 }}>
            Choose your starting instrument:
          </p>
          
          <div style={styles.instrumentToggle}>
            <button
              style={{
                ...styles.toggleButton,
                ...(activeInstrument === 'visual' ? styles.activeToggle : {})
              }}
              onClick={() => setActiveInstrument('visual')}
            >
              📷 Visual Synth
            </button>
            <button
              style={{
                ...styles.toggleButton,
                ...(activeInstrument === 'pads' ? styles.activeToggle : {})
              }}
              onClick={() => setActiveInstrument('pads')}
            >
              🎹 Pad Controller
            </button>
            <button
              style={{
                ...styles.toggleButton,
                ...(activeInstrument === 'both' ? styles.activeToggle : {})
              }}
              onClick={() => setActiveInstrument('both')}
            >
              🎛️ Both
            </button>
          </div>
          
          <button 
            style={{ 
              ...styles.button, 
              marginTop: '30px',
              opacity: (sessionCode.length === 6 && userName) ? 1 : 0.5,
              cursor: (sessionCode.length === 6 && userName) ? 'pointer' : 'not-allowed'
            }}
            onClick={(sessionCode.length === 6 && userName) ? handleJoinSession : null}
            disabled={sessionCode.length !== 6 || !userName}
          >
            {sessionCode.length === 6 && userName ? 'Join Session' : 
             !userName ? 'Enter Name First' : 'Enter 6-Character Code'}
          </button>
        </div>
      </div>
    );
  }
  
  // Render main session screen
  if (currentScreen === 'session') {
    return (
      <div style={styles.container}>
        {/* Header with session info and controls */}
        <div style={styles.header}>
          <div>
            <h3 style={{ margin: 0 }}>Session: {sessionCode}</h3>
            <p style={{ margin: '5px 0', opacity: 0.8, fontSize: '14px' }}>
              {sessionInfo?.isOffline ? 'Offline Mode' : `${sessionInfo?.users?.length || 1} user(s) connected`}
            </p>
          </div>
          
          {/* Instrument switcher - always visible */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              style={{
                ...styles.button,
                padding: '8px 16px',
                margin: 0,
                ...(viewMode === 'visual' ? { background: 'rgba(255, 255, 255, 0.4)' } : {})
              }}
              onClick={() => setViewMode('visual')}
            >
              Visual Only
            </button>
            <button
              style={{
                ...styles.button,
                padding: '8px 16px',
                margin: 0,
                ...(viewMode === 'pads' ? { background: 'rgba(255, 255, 255, 0.4)' } : {})
              }}
              onClick={() => setViewMode('pads')}
            >
              Pads Only
            </button>
            <button
              style={{
                ...styles.button,
                padding: '8px 16px',
                margin: 0,
                ...(viewMode === 'split' ? { background: 'rgba(255, 255, 255, 0.4)' } : {})
              }}
              onClick={() => setViewMode('split')}
            >
              Split View
            </button>
          </div>
          
          {/* Recording controls */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              style={{
                ...styles.button,
                padding: '8px 16px',
                margin: 0,
                background: isRecording ? '#ff4444' : 'rgba(255, 100, 100, 0.3)'
              }}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? '⏹ Stop' : '⏺ Record'}
            </button>
            {recordedAudio && (
              <a
                href={recordedAudio}
                download="soundscape.webm"
                style={{
                  ...styles.button,
                  padding: '8px 16px',
                  margin: 0,
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                💾 Download
              </a>
            )}
          </div>
        </div>
        
        {/* Performance area */}
        <div style={{ 
          flex: 1, 
          display: 'flex',
          padding: '20px',
          gap: '20px',
          overflow: 'hidden'
        }}>
          {/* Visual Synth */}
          {(viewMode === 'visual' || viewMode === 'split') && (
            <div style={{ 
              flex: viewMode === 'split' ? 1 : 'auto',
              width: viewMode === 'split' ? '50%' : '100%',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <VisualSynthV2
                audioContext={audioContextRef.current}
                masterGain={masterGainRef.current}
                socket={socket}
                sessionCode={sessionCode}
              />
            </div>
          )}
          
          {/* Pad Controller */}
          {(viewMode === 'pads' || viewMode === 'split') && (
            <div style={{ 
              flex: viewMode === 'split' ? 1 : 'auto',
              width: viewMode === 'split' ? '50%' : '100%',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PadController
                audioContext={audioContextRef.current}
                masterGain={masterGainRef.current}
                socket={socket}
                sessionCode={sessionCode}
              />
            </div>
          )}
        </div>
        
        {/* Playback area for recorded audio */}
        {recordedAudio && (
          <div style={{
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.3)',
            textAlign: 'center'
          }}>
            <audio controls src={recordedAudio} style={{ width: '100%', maxWidth: '600px' }} />
          </div>
        )}
      </div>
    );
  }
  
  return null;
};

export default CollaborativeSoundscape;