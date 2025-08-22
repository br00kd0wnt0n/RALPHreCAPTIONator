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
    id: 'warm_analog',
    name: 'WARM ANALOG',
    key: 'C_MINOR',
    rootNote: 130, // C3
    color: '#ff6b35',
    synthType: 'warm_sawtooth',
    tremoloSpeed: 2.5, // Slow, deep tremolo
    reverbMix: 0.4,
    delayMix: 0.3,
    delayTime: 0.375, // Dotted 8th note feel
    filterSweep: {
      type: 'lowpass',
      speed: 0.3, // Very slow sweep
      depth: 400, // Gentle sweep range
      baseFreq: 800
    },
    description: 'Rich analog warmth with slow tremolo and gentle filter sweep'
  },
  {
    id: 'crystal_lead',
    name: 'CRYSTAL LEAD',
    key: 'A_MINOR',
    rootNote: 220, // A3
    color: '#00d4ff',
    synthType: 'crystal_triangle',
    tremoloSpeed: 8, // Fast shimmer
    reverbMix: 0.5,
    delayMix: 0.4,
    delayTime: 0.25, // Quarter note
    filterSweep: {
      type: 'bandpass',
      speed: 1.5, // Medium sweep
      depth: 800, // Wide sweep for brightness
      baseFreq: 1200
    },
    description: 'Crystalline leads with fast shimmer and bandpass sweep'
  },
  {
    id: 'sub_bass',
    name: 'SUB BASS',
    key: 'F_MAJOR',
    rootNote: 87, // F2
    color: '#39ff14',
    synthType: 'sub_sine',
    tremoloSpeed: 1, // Very slow pulse
    reverbMix: 0.2,
    delayMix: 0.1,
    delayTime: 0.5, // Half note
    filterSweep: {
      type: 'highpass',
      speed: 0.1, // Ultra slow sweep
      depth: 200, // Tight sweep for bass
      baseFreq: 100
    },
    description: 'Deep sub-bass with ultra-slow highpass sweep'
  },
  {
    id: 'square_punch',
    name: 'SQUARE PUNCH',
    key: 'G_DORIAN',
    rootNote: 196, // G3
    color: '#ff1744',
    synthType: 'square_pulse',
    tremoloSpeed: 6, // Aggressive chop
    reverbMix: 0.3,
    delayMix: 0.35,
    delayTime: 0.125, // 8th note
    filterSweep: {
      type: 'lowpass',
      speed: 3.0, // Fast aggressive sweep
      depth: 1200, // Wide dramatic sweep
      baseFreq: 600
    },
    description: 'Aggressive squares with fast dramatic filter sweep'
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

// Create reverb impulse response buffer
const createReverbBuffer = (audioContext, duration, decay) => {
  const sampleRate = audioContext.sampleRate;
  const length = sampleRate * duration;
  const impulse = audioContext.createBuffer(2, length, sampleRate);
  
  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const n = length - i;
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
    }
  }
  
  return impulse;
};

function VisualSynthV2() {
  const [currentScreen, setCurrentScreen] = useState('presets'); // 'presets' or 'synth'
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [isActive, setIsActive] = useState(false);
  
  // Audio and visual refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  
  // Single responsive synth system
  const oscillatorRef = useRef(null);
  const subOscillatorRef = useRef(null);
  const filterRef = useRef(null);
  const sweepFilterRef = useRef(null); // Second filter for sweep
  const gainNodeRef = useRef(null);
  const tremoloRef = useRef(null);
  
  // Filter sweep LFO
  const filterSweepLFORef = useRef(null);
  const sweepLFOGainRef = useRef(null);
  
  // Effects chain
  const delayRef = useRef(null);
  const delayGainRef = useRef(null);
  const delayFeedbackRef = useRef(null);
  const reverbRef = useRef(null);
  const reverbGainRef = useRef(null);
  const dryGainRef = useRef(null);
  
  // Master volume control for fade-in
  const masterGainRef = useRef(null);
  const streamRef = useRef(null);
  
  // Parameter state for visualization
  const [audioParams, setAudioParams] = useState({
    frequency: 0,
    subFreq: 0,
    volume: 0,
    filterFreq: 0,
    tremoloDepth: 0,
    movement: 0,
    // Performance monitoring
    frameRate: 0,
    audioLatency: 0,
    cpuLoad: 0
  });

  // Performance monitoring refs
  const lastFrameTime = useRef(Date.now());
  const frameCount = useRef(0);
  const performanceTimer = useRef(null);

  // Movement detection refs
  const lastBrightnessRef = useRef(0);
  const stillnessCounterRef = useRef(0);
  const lastColorRef = useRef({ r: 0, g: 0, b: 0 });
  const movementSpeedRef = useRef(0);
  const lastFrequencyRef = useRef(220);
  const frequencyChangeCounterRef = useRef(0);

  // V3 Clean minimal color scheme  
  const teColors = {
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceLight: '#fafafa',
    text: '#2a2a2a',
    textDim: '#666666',
    grid: '#e0e0e0',
    accent: selectedPreset?.color || '#333333'
  };

  const teFont = {
    fontFamily: '"Space Mono", "IBM Plex Mono", monospace',
    fontWeight: '400',
    letterSpacing: '0.05em'
  };


  // Initialize V3 responsive synthesis system
  const initAudio = async () => {
    if (audioContextRef.current) {
      console.log('Audio context already exists, reusing...');
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContext();
    
    console.log('Creating V3 audio system, state:', audioContextRef.current.state);
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    // Master gain node for smooth volume control
    masterGainRef.current = audioContextRef.current.createGain();
    masterGainRef.current.gain.value = 0; // Start silent
    masterGainRef.current.connect(audioContextRef.current.destination);

    // Main oscillator - will change type based on preset
    oscillatorRef.current = audioContextRef.current.createOscillator();
    oscillatorRef.current.type = 'sawtooth';
    oscillatorRef.current.frequency.value = 220;
    
    // Sub oscillator for richness
    subOscillatorRef.current = audioContextRef.current.createOscillator();
    subOscillatorRef.current.type = 'sine';
    subOscillatorRef.current.frequency.value = 110;
    
    // Dynamic filter with higher resonance (movement responsive)
    filterRef.current = audioContextRef.current.createBiquadFilter();
    filterRef.current.type = 'lowpass';
    filterRef.current.frequency.value = 800;
    filterRef.current.Q.value = 3; // Higher resonance for character
    
    // Sweep filter for preset-specific filter sweeps
    sweepFilterRef.current = audioContextRef.current.createBiquadFilter();
    sweepFilterRef.current.type = 'lowpass'; // Will be set by preset
    sweepFilterRef.current.frequency.value = 800; // Will be set by preset
    sweepFilterRef.current.Q.value = 2;
    
    // Main gain
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.gain.value = 0.6;
    
    // Tremolo LFO for movement - speed will be set by preset
    tremoloRef.current = audioContextRef.current.createOscillator();
    tremoloRef.current.type = 'sine';
    tremoloRef.current.frequency.value = 5; // Default, will be overridden by preset
    
    const tremoloGain = audioContextRef.current.createGain();
    tremoloGain.gain.value = 0.4; // Deeper tremolo by default
    
    // Connect tremolo
    tremoloRef.current.connect(tremoloGain);
    tremoloGain.connect(gainNodeRef.current.gain);
    tremoloRef.current.start();
    
    // Filter sweep LFO - will be configured by preset
    filterSweepLFORef.current = audioContextRef.current.createOscillator();
    filterSweepLFORef.current.type = 'sine';
    filterSweepLFORef.current.frequency.value = 0.5; // Default, will be overridden by preset
    
    sweepLFOGainRef.current = audioContextRef.current.createGain();
    sweepLFOGainRef.current.gain.value = 400; // Default depth, will be overridden by preset
    
    // Connect filter sweep LFO to sweep filter frequency
    filterSweepLFORef.current.connect(sweepLFOGainRef.current);
    sweepLFOGainRef.current.connect(sweepFilterRef.current.frequency);
    filterSweepLFORef.current.start();

    // EFFECTS CHAIN
    
    // Dry signal gain
    dryGainRef.current = audioContextRef.current.createGain();
    dryGainRef.current.gain.value = 0.7; // Mix in dry signal
    
    // Delay effect
    delayRef.current = audioContextRef.current.createDelay(2.0);
    delayRef.current.delayTime.value = 0.25; // Default, will be overridden by preset
    
    delayGainRef.current = audioContextRef.current.createGain();
    delayGainRef.current.gain.value = 0.3; // Default delay mix, will be overridden by preset
    
    delayFeedbackRef.current = audioContextRef.current.createGain();
    delayFeedbackRef.current.gain.value = 0.4; // Moderate feedback
    
    // Reverb using convolver
    reverbRef.current = audioContextRef.current.createConvolver();
    const reverbBuffer = createReverbBuffer(audioContextRef.current, 3.0, 0.8);
    reverbRef.current.buffer = reverbBuffer;
    
    reverbGainRef.current = audioContextRef.current.createGain();
    reverbGainRef.current.gain.value = 0.4; // Default reverb mix, will be overridden by preset
    
    // SIGNAL ROUTING
    
    // Main oscillators through both filters
    oscillatorRef.current.connect(filterRef.current);
    subOscillatorRef.current.connect(filterRef.current);
    filterRef.current.connect(sweepFilterRef.current); // Chain filters
    sweepFilterRef.current.connect(gainNodeRef.current);
    
    // Dry signal path
    gainNodeRef.current.connect(dryGainRef.current);
    dryGainRef.current.connect(masterGainRef.current);
    
    // Delay chain
    gainNodeRef.current.connect(delayRef.current);
    delayRef.current.connect(delayGainRef.current);
    delayGainRef.current.connect(masterGainRef.current);
    
    // Delay feedback
    delayRef.current.connect(delayFeedbackRef.current);
    delayFeedbackRef.current.connect(delayRef.current);
    
    // Reverb chain  
    gainNodeRef.current.connect(reverbRef.current);
    reverbRef.current.connect(reverbGainRef.current);
    reverbGainRef.current.connect(masterGainRef.current);
    
    oscillatorRef.current.start();
    subOscillatorRef.current.start();

    console.log('V3 responsive synthesis ready');
    startPerformanceMonitoring();
  };

  // Performance monitoring
  // Apply preset-specific effect parameters
  const applyPresetParameters = (preset) => {
    if (!audioContextRef.current || !preset) return;
    
    const now = audioContextRef.current.currentTime;
    
    // Apply tremolo speed
    if (tremoloRef.current) {
      tremoloRef.current.frequency.setValueAtTime(preset.tremoloSpeed, now);
    }
    
    // Apply delay parameters
    if (delayRef.current && delayGainRef.current) {
      delayRef.current.delayTime.setValueAtTime(preset.delayTime, now);
      delayGainRef.current.gain.setValueAtTime(preset.delayMix, now);
    }
    
    // Apply reverb mix
    if (reverbGainRef.current) {
      reverbGainRef.current.gain.setValueAtTime(preset.reverbMix, now);
    }
    
    // Apply filter sweep parameters
    if (preset.filterSweep && sweepFilterRef.current && filterSweepLFORef.current && sweepLFOGainRef.current) {
      sweepFilterRef.current.type = preset.filterSweep.type;
      sweepFilterRef.current.frequency.setValueAtTime(preset.filterSweep.baseFreq, now);
      filterSweepLFORef.current.frequency.setValueAtTime(preset.filterSweep.speed, now);
      sweepLFOGainRef.current.gain.setValueAtTime(preset.filterSweep.depth, now);
    }
    
    console.log(`Applied preset parameters for ${preset.name}:`, {
      tremoloSpeed: preset.tremoloSpeed,
      delayTime: preset.delayTime,
      delayMix: preset.delayMix,
      reverbMix: preset.reverbMix,
      filterSweep: preset.filterSweep
    });
  };

  const startPerformanceMonitoring = () => {
    performanceTimer.current = setInterval(() => {
      // Calculate frame rate
      const currentTime = Date.now();
      const deltaTime = currentTime - lastFrameTime.current;
      const fps = frameCount.current > 0 ? Math.round(1000 / (deltaTime / frameCount.current)) : 0;
      
      // Audio context latency
      const audioLatency = audioContextRef.current ? 
        Math.round(audioContextRef.current.outputLatency * 1000) : 0;
      
      // Simple CPU load estimation based on frame timing
      const targetFrameTime = 1000/60; // 60fps
      const actualFrameTime = deltaTime / Math.max(frameCount.current, 1);
      const cpuLoad = Math.min(Math.round((actualFrameTime / targetFrameTime) * 100), 100);

      setAudioParams(prev => ({
        ...prev,
        frameRate: fps,
        audioLatency: audioLatency,
        cpuLoad: cpuLoad
      }));

      // Reset counters
      frameCount.current = 0;
      lastFrameTime.current = currentTime;
    }, 1000);
  };

  // Smooth volume fade-in to prevent artifacts
  const fadeInAudio = () => {
    if (!masterGainRef.current || !audioContextRef.current) return;
    
    const now = audioContextRef.current.currentTime;
    console.log('Starting audio fade-in');
    
    // Smooth 3-second fade from 0 to 1
    masterGainRef.current.gain.setValueAtTime(0, now);
    masterGainRef.current.gain.linearRampToValueAtTime(1.0, now + 3.0);
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
      
      setCurrentScreen('synth');
      setIsActive(true);
      
      console.log('V3 synth started:', preset.name);
      
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            // Initialize frequency tracking with preset root note
            lastFrequencyRef.current = preset.rootNote;
            // Apply preset-specific parameters
            applyPresetParameters(preset);
            // Start audio fade-in once camera is ready
            setTimeout(() => {
              fadeInAudio();
            }, 500); // Small delay to ensure video is stable
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
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Optimize canvas size for performance (smaller = faster)
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    canvas.width = Math.min(videoWidth, 320); // Smaller for performance
    canvas.height = Math.min(videoHeight, 240);
    
    try {
      // Draw video frame
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Skip visual processing every 3rd frame for smoother audio and performance
      frameCount.current++;
      const skipProcessing = frameCount.current % 3 !== 0;
      
      if (!skipProcessing) {
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

      // Enhanced movement detection
      const brightnessDiff = Math.abs(brightness - lastBrightnessRef.current);
      const colorDiff = {
        r: Math.abs(avgRed - lastColorRef.current.r),
        g: Math.abs(avgGreen - lastColorRef.current.g),
        b: Math.abs(avgBlue - lastColorRef.current.b)
      };
      const totalColorChange = colorDiff.r + colorDiff.g + colorDiff.b;
      
      // Movement speed calculation (0-100)
      movementSpeedRef.current = Math.min(brightnessDiff + (totalColorChange * 0.5), 100);
      const isMoving = movementSpeedRef.current > 10;
      
      if (isMoving) {
        stillnessCounterRef.current = 0;
      } else {
        stillnessCounterRef.current++;
      }
      
      const stillnessIntensity = Math.min(stillnessCounterRef.current / 30, 1); // Faster fade to silence

      // V3 Highly responsive synthesis like V1
      if (oscillatorRef.current && subOscillatorRef.current && audioContextRef.current) {
        const now = audioContextRef.current.currentTime;
        
        // Performance tracking
        frameCount.current++;
        
        const scaleNotes = MUSICAL_SCALES[selectedPreset.key];
        
        // Dramatic color-based frequency mapping
        let colorFreq;
        const dominant = Math.max(avgRed, avgGreen, avgBlue);
        
        if (avgRed === dominant) {
          // Red = lower frequencies with wide range
          colorFreq = selectedPreset.rootNote + (avgRed / 255) * 200;
        } else if (avgGreen === dominant) {
          // Green = mid frequencies with movement modulation
          colorFreq = selectedPreset.rootNote * 1.5 + (avgGreen / 255) * 300;
        } else {
          // Blue = higher frequencies, more dramatic jumps
          colorFreq = selectedPreset.rootNote * 2 + (avgBlue / 255) * 500;
        }
        
        const quantizedFreq = quantizeToScale(colorFreq, selectedPreset.rootNote, scaleNotes);
        
        // Movement speed affects pitch modulation dramatically
        const speedPitchMod = (movementSpeedRef.current / 100) * 100;
        const targetFreq = quantizedFreq + speedPitchMod;
        const subFreq = targetFreq * 0.5;
        
        // Set oscillator types based on preset
        const synthConfig = {
          'warm_sawtooth': { main: 'sawtooth', sub: 'sine' },
          'crystal_triangle': { main: 'triangle', sub: 'square' },
          'sub_sine': { main: 'sine', sub: 'sine' },
          'square_pulse': { main: 'square', sub: 'triangle' }
        };
        
        const config = synthConfig[selectedPreset.synthType] || synthConfig['warm_sawtooth'];
        oscillatorRef.current.type = config.main;
        subOscillatorRef.current.type = config.sub;
        
        // Smooth frequency changes for longer notes
        const freqDifference = Math.abs(targetFreq - lastFrequencyRef.current);
        
        // Only change frequency if there's significant movement or color change
        const significantChange = freqDifference > 20 || movementSpeedRef.current > 30;
        
        if (significantChange) {
          frequencyChangeCounterRef.current = 0;
          
          // Smooth transition over 200ms instead of immediate
          oscillatorRef.current.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.2);
          subOscillatorRef.current.frequency.exponentialRampToValueAtTime(subFreq, now + 0.2);
          
          lastFrequencyRef.current = targetFreq;
        } else {
          // Hold current frequency for sustained notes
          frequencyChangeCounterRef.current++;
          
          // Minor pitch variation for interest during sustained notes
          if (frequencyChangeCounterRef.current % 30 === 0) {
            const microVariation = (Math.random() - 0.5) * 5; // ±2.5Hz variation
            const variedFreq = lastFrequencyRef.current + microVariation;
            oscillatorRef.current.frequency.exponentialRampToValueAtTime(variedFreq, now + 0.1);
            subOscillatorRef.current.frequency.exponentialRampToValueAtTime(variedFreq * 0.5, now + 0.1);
          }
        }
        
        const finalFreq = lastFrequencyRef.current; // For display purposes
        
        // Movement-responsive filter - closes dramatically when still
        let baseFilterFreq;
        if (stillnessIntensity > 0.3) {
          // When still, filter closes to near-silence
          baseFilterFreq = 50 + (1 - stillnessIntensity) * 150;
        } else if (isMoving) {
          // When moving, filter opens based on movement speed and color
          const speedBoost = (movementSpeedRef.current / 100) * 1000;
          const colorBoost = (avgBlue / 255) * 800;
          baseFilterFreq = 300 + speedBoost + colorBoost;
        } else {
          baseFilterFreq = 200;
        }
        
        const filterFreq = Math.max(baseFilterFreq, 50); // Never completely closed
        
        // Smooth filter changes over 150ms to reduce choppiness
        filterRef.current.frequency.exponentialRampToValueAtTime(filterFreq, now + 0.15);
        
        // Volume dramatically reduces with stillness
        let baseVolume = (brightness / 255) * 0.6;
        
        if (stillnessIntensity > 0.2) {
          // Fade to near silence when still
          baseVolume *= (1 - stillnessIntensity * 0.95);
        } else if (isMoving) {
          // Boost volume with movement speed
          baseVolume *= (1 + (movementSpeedRef.current / 100) * 0.5);
        }
        
        const volume = Math.max(baseVolume, 0.01); // Prevent complete silence for stability
        
        // Smooth volume changes over 100ms for sustained feel
        gainNodeRef.current.gain.exponentialRampToValueAtTime(volume, now + 0.1);
        
        // Movement-responsive tremolo depth - reduces when still
        let tremoloDepth = (avgRed / 255) * 0.5;
        if (stillnessIntensity > 0.3) {
          tremoloDepth *= (1 - stillnessIntensity * 0.8);
        }
        
        // Store current values for next frame comparison
        lastColorRef.current = { r: avgRed, g: avgGreen, b: avgBlue };
        
        // Update visual parameters
        setAudioParams(prev => ({
          ...prev,
          frequency: Math.round(finalFreq),
          subFreq: Math.round(subFreq),
          volume: Math.round(volume * 100),
          filterFreq: Math.round(filterFreq),
          tremoloDepth: Math.round(tremoloDepth * 100),
          movement: Math.round(movementSpeedRef.current)
        }));
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
      } // Close skipProcessing condition
      
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
    if (performanceTimer.current) {
      clearInterval(performanceTimer.current);
      performanceTimer.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Reset all refs
    oscillatorRef.current = null;
    subOscillatorRef.current = null;
    filterRef.current = null;
    sweepFilterRef.current = null;
    gainNodeRef.current = null;
    tremoloRef.current = null;
    filterSweepLFORef.current = null;
    sweepLFOGainRef.current = null;
    masterGainRef.current = null;
    
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
            VERSION 3.0
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
                <div>SWEEP: {preset.filterSweep.type.toUpperCase()} @ {preset.filterSweep.speed}Hz</div>
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

      {/* V3 Synthesis visualization */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px',
        marginBottom: '15px'
      }}>
        {/* Main Frequency */}
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
            color: selectedPreset?.color || teColors.accent,
            fontWeight: '300',
            marginBottom: '15px'
          }}>
            {audioParams.frequency}
          </div>
          <div style={{
            width: '100%',
            height: '3px',
            backgroundColor: teColors.grid,
            position: 'relative'
          }}>
            <div style={{
              width: `${Math.min(((audioParams.frequency - 50) / 500) * 100, 100)}%`,
              height: '100%',
              backgroundColor: selectedPreset?.color || teColors.accent,
              transition: 'width 0.1s ease'
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
            Hz
          </div>
        </div>

        {/* Filter */}
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
            color: selectedPreset?.color || teColors.accent,
            fontWeight: '300',
            marginBottom: '15px'
          }}>
            {audioParams.filterFreq}
          </div>
          <div style={{
            width: '100%',
            height: '3px',
            backgroundColor: teColors.grid,
            position: 'relative'
          }}>
            <div style={{
              width: `${Math.min((audioParams.filterFreq / 2000) * 100, 100)}%`,
              height: '100%',
              backgroundColor: selectedPreset?.color || teColors.accent,
              transition: 'width 0.1s ease'
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

      {/* Performance monitoring */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
        marginBottom: '15px'
      }}>
        <div style={{
          padding: '10px',
          background: teColors.surface,
          border: `1px solid ${teColors.grid}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '8px', color: teColors.textDim, marginBottom: '4px' }}>FPS</div>
          <div style={{ fontSize: '14px', color: teColors.accent }}>{audioParams.frameRate}</div>
        </div>
        <div style={{
          padding: '10px',
          background: teColors.surface,
          border: `1px solid ${teColors.grid}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '8px', color: teColors.textDim, marginBottom: '4px' }}>LATENCY</div>
          <div style={{ fontSize: '14px', color: teColors.accent }}>{audioParams.audioLatency}ms</div>
        </div>
        <div style={{
          padding: '10px',
          background: teColors.surface,
          border: `1px solid ${teColors.grid}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '8px', color: teColors.textDim, marginBottom: '4px' }}>CPU</div>
          <div style={{ 
            fontSize: '14px', 
            color: audioParams.cpuLoad > 80 ? '#ff1744' : teColors.accent 
          }}>
            {audioParams.cpuLoad}%
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
          <div style={{ color: teColors.textDim, marginBottom: '8px' }}>TREMOLO</div>
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
            transition: 'all 0.1s ease'
          }}>
            {audioParams.tremoloDepth}%
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
        {selectedPreset?.key.replace('_', ' ')} | {selectedPreset?.synthType.replace('_', ' ').toUpperCase()} | ROOT: {selectedPreset?.rootNote}Hz
      </div>
    </div>
  );
}

export default VisualSynthV2;