import React, { useState, useRef, useEffect, useCallback } from 'react';

// Musical scales and preset configurations
const MUSICAL_SCALES = {
  'C_MINOR': [0, 2, 3, 5, 7, 8, 10], // C D Eb F G Ab Bb
  'A_MINOR': [0, 2, 3, 5, 7, 8, 10], // A B C D E F G (shifted)
  'F_MAJOR': [0, 2, 4, 5, 7, 9, 11], // F G A Bb C D E
  'G_DORIAN': [0, 2, 3, 5, 7, 9, 10] // G A Bb C D E F
};

const PRESET_CONFIGS = [
  {
    id: 'ambient_deep',
    name: 'AMBIENT DEEP',
    key: 'C_MINOR',
    rootNote: 65, // C2
    beatPattern: [1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,0,1],
    beatTempo: 85,
    color: '#ff6b35', // Neon orange
    description: 'Deep ambient with subtle 808 kicks'
  },
  {
    id: 'ethereal_drift',
    name: 'ETHEREAL DRIFT',
    key: 'A_MINOR',
    rootNote: 110, // A2
    beatPattern: [1,0,0,1, 0,0,0,0, 1,0,1,0, 0,0,0,0],
    beatTempo: 70,
    color: '#00d4ff', // Electric blue
    description: 'Floating textures with sparse rhythms'
  },
  {
    id: 'motion_flow',
    name: 'MOTION FLOW',
    key: 'F_MAJOR',
    rootNote: 87, // F2
    beatPattern: [1,0,1,0, 0,1,0,0, 1,0,0,1, 0,0,1,0],
    beatTempo: 95,
    color: '#39ff14', // Acid green
    description: 'Dynamic response to movement'
  },
  {
    id: 'minimal_pulse',
    name: 'MINIMAL PULSE',
    key: 'G_DORIAN',
    rootNote: 98, // G2
    beatPattern: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    beatTempo: 60,
    color: '#ff1744', // Bright red
    description: 'Minimal beats, maximum space'
  }
];

// Utility to quantize frequency to musical scale
const quantizeToScale = (frequency, rootNote, scale) => {
  const baseFreq = rootNote;
  const ratio = frequency / baseFreq;
  const semitones = Math.round(12 * Math.log2(ratio));
  const octave = Math.floor(semitones / 12);
  const noteInScale = semitones % 12;
  
  // Find closest note in scale
  let closestNote = scale[0];
  let minDistance = Math.abs(noteInScale - scale[0]);
  
  for (let note of scale) {
    const distance = Math.abs(noteInScale - note);
    if (distance < minDistance) {
      minDistance = distance;
      closestNote = note;
    }
  }
  
  const quantizedSemitones = octave * 12 + closestNote;
  return baseFreq * Math.pow(2, quantizedSemitones / 12);
};

function VisualSynthV2() {
  const [currentScreen, setCurrentScreen] = useState('presets'); // 'presets' or 'synth'
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [isActive, setIsActive] = useState(false);
  
  // Audio and visual refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const subOscillatorRef = useRef(null);
  const filterRef = useRef(null);
  const gainNodeRef = useRef(null);
  const streamRef = useRef(null);
  
  // Beat system refs
  const kickOscRef = useRef(null);
  const kickGainRef = useRef(null);
  const beatIntervalRef = useRef(null);
  const beatStepRef = useRef(0);
  
  // Parameter state for visualization
  const [audioParams, setAudioParams] = useState({
    frequency: 0,
    filterFreq: 0,
    volume: 0,
    movement: 0,
    beatActive: false
  });

  // Movement detection refs
  const lastBrightnessRef = useRef(0);
  const stillnessCounterRef = useRef(0);

  // Teenage Engineering color scheme
  const teColors = {
    background: '#000000',
    surface: '#1a1a1a',
    surfaceLight: '#2a2a2a',
    text: '#ffffff',
    textDim: '#999999',
    grid: '#333333',
    accent: selectedPreset?.color || '#ff6b35'
  };

  const teFont = {
    fontFamily: '"Space Mono", "IBM Plex Mono", monospace',
    fontWeight: '400',
    letterSpacing: '0.05em'
  };

  // Start beat system
  const startBeat = useCallback(() => {
    if (!selectedPreset || beatIntervalRef.current) return;
    
    const { beatPattern, beatTempo } = selectedPreset;
    const stepDuration = (60 / beatTempo / 4) * 1000; // 16th note duration in ms
    
    beatIntervalRef.current = setInterval(() => {
      const step = beatStepRef.current % beatPattern.length;
      const shouldKick = beatPattern[step] === 1;
      
      if (shouldKick && audioContextRef.current) {
        // Trigger 808-style kick
        if (kickOscRef.current) kickOscRef.current.stop();
        if (kickGainRef.current) kickGainRef.current.disconnect();
        
        kickOscRef.current = audioContextRef.current.createOscillator();
        kickGainRef.current = audioContextRef.current.createGain();
        
        kickOscRef.current.frequency.setValueAtTime(60, audioContextRef.current.currentTime);
        kickOscRef.current.frequency.exponentialRampToValueAtTime(20, audioContextRef.current.currentTime + 0.1);
        
        kickGainRef.current.gain.setValueAtTime(0.7, audioContextRef.current.currentTime);
        kickGainRef.current.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.3);
        
        kickOscRef.current.connect(kickGainRef.current);
        kickGainRef.current.connect(audioContextRef.current.destination);
        
        kickOscRef.current.start();
        kickOscRef.current.stop(audioContextRef.current.currentTime + 0.3);
        
        setAudioParams(prev => ({ ...prev, beatActive: true }));
        setTimeout(() => setAudioParams(prev => ({ ...prev, beatActive: false })), 100);
      }
      
      beatStepRef.current++;
    }, stepDuration);
  }, [selectedPreset]);

  // Initialize audio system
  const initAudio = async () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Create main oscillator
      oscillatorRef.current = audioContextRef.current.createOscillator();
      oscillatorRef.current.type = 'sine';
      
      // Create sub oscillator
      subOscillatorRef.current = audioContextRef.current.createOscillator();
      subOscillatorRef.current.type = 'sine';
      
      // Create filter
      filterRef.current = audioContextRef.current.createBiquadFilter();
      filterRef.current.type = 'lowpass';
      filterRef.current.frequency.value = 800;
      filterRef.current.Q.value = 0.5;
      
      // Create gain
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 0.4;
      
      // Connect audio chain
      oscillatorRef.current.connect(filterRef.current);
      subOscillatorRef.current.connect(filterRef.current);
      filterRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);
      
      oscillatorRef.current.start();
      subOscillatorRef.current.start();
    }
  };

  // Start camera and audio
  const startSynth = async (preset) => {
    setSelectedPreset(preset);
    
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert('Camera not supported');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      
      streamRef.current = stream;
      await initAudio();
      startBeat();
      
      setCurrentScreen('synth');
      setIsActive(true);
      
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
          };
        }
      }, 100);
      
    } catch (err) {
      console.error('Error starting synth:', err);
      alert('Failed to access camera');
    }
  };

  // Video analysis and audio synthesis
  const analyzeFrame = useCallback(() => {
    if (!canvasRef.current || !videoRef.current || !selectedPreset) return;
    
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match video
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    canvas.width = Math.min(videoWidth, 640);
    canvas.height = Math.min(videoHeight, 480);
    
    try {
      // Draw video frame
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Apply minimal visual processing (TE aesthetic)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Calculate color averages
      let redTotal = 0, greenTotal = 0, blueTotal = 0;
      for (let i = 0; i < data.length; i += 4) {
        redTotal += data[i];
        greenTotal += data[i + 1];
        blueTotal += data[i + 2];
      }

      const pixelCount = data.length / 4;
      const avgRed = redTotal / pixelCount;
      const avgGreen = greenTotal / pixelCount;
      const avgBlue = blueTotal / pixelCount;
      const brightness = (avgRed + avgGreen + avgBlue) / 3;

      // Movement detection
      const brightnessDiff = Math.abs(brightness - lastBrightnessRef.current);
      const isMoving = brightnessDiff > 15;
      
      if (isMoving) {
        stillnessCounterRef.current = 0;
      } else {
        stillnessCounterRef.current++;
      }
      
      const stillnessIntensity = Math.min(stillnessCounterRef.current / 60, 1);

      // Audio synthesis with musical coherence
      if (oscillatorRef.current && filterRef.current && audioContextRef.current) {
        // Map color to frequency, then quantize to scale
        const rawFreq = (avgGreen / 255) * 200 + selectedPreset.rootNote;
        const quantizedFreq = quantizeToScale(rawFreq, selectedPreset.rootNote, MUSICAL_SCALES[selectedPreset.key]);
        
        // Apply stillness modulation
        const finalFreq = quantizedFreq * (1 - stillnessIntensity * 0.3);
        
        oscillatorRef.current.frequency.setValueAtTime(finalFreq, audioContextRef.current.currentTime);
        subOscillatorRef.current.frequency.setValueAtTime(finalFreq * 0.5, audioContextRef.current.currentTime);
        
        // Dynamic filter based on movement
        const filterFreq = isMoving ? 
          800 + (avgBlue / 255) * 1200 : 
          400 * (1 - stillnessIntensity * 0.5);
        filterRef.current.frequency.setValueAtTime(filterFreq, audioContextRef.current.currentTime);
        
        // Volume based on overall brightness and movement
        const volume = (brightness / 255) * 0.4 * (isMoving ? 1 : 0.7);
        gainNodeRef.current.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
        
        // Update visual parameters
        setAudioParams({
          frequency: Math.round(finalFreq),
          filterFreq: Math.round(filterFreq),
          volume: Math.round(volume * 100),
          movement: Math.round(brightnessDiff),
          beatActive: audioParams.beatActive
        });
      }
      
      lastBrightnessRef.current = brightness;
      
      // Apply subtle TE-style visual processing
      for (let i = 0; i < data.length; i += 4) {
        // Slight contrast boost and desaturation for clinical look
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray * 0.3 + data[i] * 0.7;     // Slight desaturation
        data[i + 1] = gray * 0.3 + data[i + 1] * 0.7;
        data[i + 2] = gray * 0.3 + data[i + 2] * 0.7;
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Add minimal grid overlay (TE aesthetic)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
    } catch (err) {
      console.error('Error analyzing frame:', err);
    }
  }, [selectedPreset, audioParams.beatActive]);

  // Analysis loop
  useEffect(() => {
    let animationFrameId;
    
    if (isActive) {
      const loop = () => {
        analyzeFrame();
        animationFrameId = requestAnimationFrame(loop);
      };
      
      setTimeout(() => {
        loop();
      }, 500);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isActive, analyzeFrame]);

  // Back to presets
  const backToPresets = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (beatIntervalRef.current) {
      clearInterval(beatIntervalRef.current);
      beatIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setCurrentScreen('presets');
    setIsActive(false);
    setSelectedPreset(null);
  };

  // Preset Selection Screen
  if (currentScreen === 'presets') {
    return (
      <div style={{
        minHeight: '100vh',
        background: teColors.background,
        color: teColors.text,
        ...teFont,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          paddingBottom: '20px',
          borderBottom: `1px solid ${teColors.grid}`
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '300',
            marginBottom: '8px',
            letterSpacing: '0.1em'
          }}>
            VISUAL SYNTH
          </div>
          <div style={{
            fontSize: '12px',
            color: teColors.textDim,
            letterSpacing: '0.05em'
          }}>
            VERSION 2.0
          </div>
        </div>

        {/* Preset Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          flex: 1
        }}>
          {PRESET_CONFIGS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => startSynth(preset)}
              style={{
                background: teColors.surface,
                border: `2px solid ${teColors.grid}`,
                color: teColors.text,
                padding: '30px 20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                ...teFont
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = preset.color;
                e.target.style.backgroundColor = teColors.surfaceLight;
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = teColors.grid;
                e.target.style.backgroundColor = teColors.surface;
              }}
            >
              {/* Accent bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '4px',
                height: '100%',
                backgroundColor: preset.color
              }} />
              
              {/* Preset name */}
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '12px',
                letterSpacing: '0.05em'
              }}>
                {preset.name}
              </div>
              
              {/* Description */}
              <div style={{
                fontSize: '11px',
                color: teColors.textDim,
                marginBottom: '16px',
                lineHeight: '1.4'
              }}>
                {preset.description}
              </div>
              
              {/* Technical specs */}
              <div style={{
                fontSize: '9px',
                color: teColors.textDim,
                textAlign: 'left',
                fontFamily: 'monospace'
              }}>
                <div>KEY: {preset.key.replace('_', ' ')}</div>
                <div>BPM: {preset.beatTempo}</div>
                <div>ROOT: {preset.rootNote}Hz</div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '40px',
          paddingTop: '20px',
          borderTop: `1px solid ${teColors.grid}`,
          fontSize: '10px',
          color: teColors.textDim
        }}>
          SELECT A PRESET TO BEGIN
        </div>
      </div>
    );
  }

  // Synth Screen (simplified, will implement analysis loop next)
  return (
    <div style={{
      minHeight: '100vh',
      background: teColors.background,
      color: teColors.text,
      ...teFont,
      padding: '20px'
    }}>
      {/* Header with back button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: `1px solid ${teColors.grid}`
      }}>
        <button
          onClick={backToPresets}
          style={{
            background: 'none',
            border: `1px solid ${teColors.grid}`,
            color: teColors.text,
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '11px',
            ...teFont
          }}
        >
          ← PRESETS
        </button>
        
        <div style={{
          fontSize: '14px',
          color: teColors.accent,
          fontWeight: '600'
        }}>
          {selectedPreset?.name}
        </div>
        
        <div style={{
          fontSize: '11px',
          color: teColors.textDim
        }}>
          ACTIVE
        </div>
      </div>

      {/* Video display */}
      <div style={{
        marginBottom: '20px',
        border: `1px solid ${teColors.grid}`,
        backgroundColor: teColors.surface
      }}>
        <video 
          ref={videoRef} 
          style={{ display: 'none' }}
          autoPlay
          playsInline
          muted
        />
        <canvas 
          ref={canvasRef} 
          style={{ 
            width: '100%',
            maxWidth: '100%',
            height: 'auto',
            display: 'block'
          }}
        />
      </div>

      {/* TE-style parameter visualization */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px',
        marginBottom: '20px'
      }}>
        {/* Frequency Display */}
        <div style={{
          padding: '20px',
          background: teColors.surface,
          border: `1px solid ${teColors.grid}`,
          position: 'relative'
        }}>
          <div style={{
            fontSize: '10px',
            color: teColors.textDim,
            marginBottom: '10px',
            letterSpacing: '0.1em'
          }}>
            FREQUENCY
          </div>
          <div style={{
            fontSize: '24px',
            color: teColors.accent,
            fontWeight: '300',
            marginBottom: '15px'
          }}>
            {audioParams.frequency}
          </div>
          
          {/* Horizontal progress bar */}
          <div style={{
            width: '100%',
            height: '2px',
            backgroundColor: teColors.grid,
            position: 'relative'
          }}>
            <div style={{
              width: `${Math.min(((audioParams.frequency - 50) / 400) * 100, 100)}%`,
              height: '100%',
              backgroundColor: teColors.accent,
              transition: 'width 0.2s ease'
            }} />
          </div>
          
          {/* Technical annotation */}
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '12px',
            fontSize: '8px',
            color: teColors.textDim,
            fontFamily: 'monospace'
          }}>
            Hz
          </div>
        </div>

        {/* Filter Display */}
        <div style={{
          padding: '20px',
          background: teColors.surface,
          border: `1px solid ${teColors.grid}`,
          position: 'relative'
        }}>
          <div style={{
            fontSize: '10px',
            color: teColors.textDim,
            marginBottom: '10px',
            letterSpacing: '0.1em'
          }}>
            FILTER
          </div>
          <div style={{
            fontSize: '24px',
            color: teColors.accent,
            fontWeight: '300',
            marginBottom: '15px'
          }}>
            {audioParams.filterFreq}
          </div>
          
          {/* Horizontal progress bar */}
          <div style={{
            width: '100%',
            height: '2px',
            backgroundColor: teColors.grid,
            position: 'relative'
          }}>
            <div style={{
              width: `${Math.min((audioParams.filterFreq / 2000) * 100, 100)}%`,
              height: '100%',
              backgroundColor: teColors.accent,
              transition: 'width 0.2s ease'
            }} />
          </div>
          
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '12px',
            fontSize: '8px',
            color: teColors.textDim,
            fontFamily: 'monospace'
          }}>
            LP
          </div>
        </div>
      </div>

      {/* Movement and Volume indicators */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '10px',
        fontSize: '10px'
      }}>
        <div style={{
          padding: '15px',
          background: teColors.surface,
          border: `1px solid ${teColors.grid}`,
          textAlign: 'center'
        }}>
          <div style={{ color: teColors.textDim, marginBottom: '8px' }}>MOVEMENT</div>
          <div style={{
            width: '40px',
            height: '40px',
            margin: '0 auto',
            border: `2px solid ${audioParams.movement > 15 ? teColors.accent : teColors.grid}`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: audioParams.movement > 15 ? teColors.accent : teColors.textDim,
            transition: 'all 0.2s ease'
          }}>
            {audioParams.movement}
          </div>
        </div>

        <div style={{
          padding: '15px',
          background: teColors.surface,
          border: `1px solid ${teColors.grid}`,
          textAlign: 'center'
        }}>
          <div style={{ color: teColors.textDim, marginBottom: '8px' }}>VOLUME</div>
          <div style={{
            width: '40px',
            height: '40px',
            margin: '0 auto',
            border: `2px solid ${teColors.grid}`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: teColors.accent,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Volume fill */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${audioParams.volume}%`,
              backgroundColor: `${teColors.accent}22`,
              transition: 'height 0.2s ease'
            }} />
            <span style={{ position: 'relative', zIndex: 1 }}>{audioParams.volume}</span>
          </div>
        </div>

        <div style={{
          padding: '15px',
          background: teColors.surface,
          border: `1px solid ${teColors.grid}`,
          textAlign: 'center'
        }}>
          <div style={{ color: teColors.textDim, marginBottom: '8px' }}>BEAT</div>
          <div style={{
            width: '40px',
            height: '40px',
            margin: '0 auto',
            border: `2px solid ${teColors.grid}`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            backgroundColor: audioParams.beatActive ? `${teColors.accent}44` : 'transparent',
            color: audioParams.beatActive ? teColors.accent : teColors.textDim,
            transition: 'all 0.1s ease'
          }}>
            ●
          </div>
        </div>
      </div>

      {/* Technical footer */}
      <div style={{
        marginTop: '30px',
        paddingTop: '15px',
        borderTop: `1px solid ${teColors.grid}`,
        fontSize: '9px',
        color: teColors.textDim,
        textAlign: 'center',
        fontFamily: 'monospace'
      }}>
        {selectedPreset?.key.replace('_', ' ')} | {selectedPreset?.beatTempo}BPM | ROOT: {selectedPreset?.rootNote}Hz
      </div>
    </div>
  );
}

export default VisualSynthV2;