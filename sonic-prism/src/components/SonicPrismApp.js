import React, { useState, useRef, useEffect } from 'react';

// Utility to map a range of values
const mapRange = (value, inMin, inMax, outMin, outMax) => {
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
};

// Create distortion curve for waveshaper
const makeDistortionCurve = (amount) => {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  
  return curve;
};


function SonicPrismApp() {
  // Add error boundary state
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Error handling wrapper
  const handleError = (error, context = 'Unknown') => {
    console.error(`Error in ${context}:`, error);
    setErrorMessage(`${context}: ${error.message}`);
    setHasError(true);
  };

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const subOscillatorRef = useRef(null);
  const filterRef = useRef(null);
  const gainNodeRef = useRef(null);
  const streamRef = useRef(null);
  
  // Effects nodes
  const delayNodeRef = useRef(null);
  const feedbackNodeRef = useRef(null);
  const delayGainRef = useRef(null);
  const convolverRef = useRef(null);
  const reverbGainRef = useRef(null);
  
  // Modulation nodes
  const tremoloLFORef = useRef(null);
  const tremoloGainRef = useRef(null);
  const pitchLFORef = useRef(null);
  const filterLFORef = useRef(null);
  const filterLFOGainRef = useRef(null);
  
  // Cinematic effects
  const waveShaperRef = useRef(null);
  const compressorRef = useRef(null);
  const pannerRef = useRef(null);
  const subGainRef = useRef(null);
  
  // Arpeggiator
  const arpOscillatorsRef = useRef([]);
  const arpGainNodesRef = useRef([]);
  const arpIndexRef = useRef(0);
  const arpIntervalRef = useRef(null);
  const lastBrightnessRef = useRef(0);
  const stillnessCounterRef = useRef(0);
  const stillnessThresholdRef = useRef(60); // frames of stillness before "deep stillness"
  
  const [isActive, setIsActive] = useState(false);
  const [effectIntensity, setEffectIntensity] = useState(0.5);
  const [delayTime, setDelayTime] = useState(0.9);
  const [delayFeedback, setDelayFeedback] = useState(0.7);
  const [reverbMix, setReverbMix] = useState(0.9);
  const [tremoloRate, setTremoloRate] = useState(4);
  const [tremoloDepth, setTremoloDepth] = useState(0.85);
  const [pitchLFORate, setPitchLFORate] = useState(0.5);
  const [pitchLFODepth, setPitchLFODepth] = useState(20);
  const [arpEnabled, setArpEnabled] = useState(true);
  const [arpSpeed, setArpSpeed] = useState(300);
  const [movementThreshold, setMovementThreshold] = useState(30);
  const [audioParams, setAudioParams] = useState({
    frequency: 0,
    filterFreq: 0,
    waveform: 'sine',
    redAvg: 0,
    greenAvg: 0,
    blueAvg: 0,
    delayAmount: 0,
    reverbAmount: 0
  });

  // Arpeggiator functions
  const getArpChord = (baseFreq) => {
    // Reduced to 3 notes for less jarring sound during movement
    return [
      baseFreq,           // Root
      baseFreq * 1.2,     // Minor third
      baseFreq * 1.5      // Perfect fifth
    ];
  };

  const startArpeggiator = (baseFreq) => {
    if (!arpEnabled || arpIntervalRef.current) return;
    
    const chord = getArpChord(baseFreq);
    arpIndexRef.current = 0;
    
    arpIntervalRef.current = setInterval(() => {
      // Fade out previous note
      if (arpGainNodesRef.current.length > 0) {
        arpGainNodesRef.current.forEach(gain => {
          gain.gain.setValueAtTime(gain.gain.value, audioContextRef.current.currentTime);
          gain.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + 0.05);
        });
      }
      
      // Set frequency and fade in current note
      const currentOsc = arpOscillatorsRef.current[arpIndexRef.current];
      const currentGain = arpGainNodesRef.current[arpIndexRef.current];
      
      if (currentOsc && currentGain) {
        currentOsc.frequency.setValueAtTime(chord[arpIndexRef.current], audioContextRef.current.currentTime);
        currentGain.gain.setValueAtTime(0, audioContextRef.current.currentTime);
        currentGain.gain.linearRampToValueAtTime(0.3, audioContextRef.current.currentTime + 0.05);
      }
      
      arpIndexRef.current = (arpIndexRef.current + 1) % chord.length;
    }, arpSpeed);
  };

  const stopArpeggiator = () => {
    if (arpIntervalRef.current) {
      clearInterval(arpIntervalRef.current);
      arpIntervalRef.current = null;
      
      // Fade out all arp notes
      arpGainNodesRef.current.forEach(gain => {
        if (gain && audioContextRef.current) {
          gain.gain.setValueAtTime(gain.gain.value, audioContextRef.current.currentTime);
          gain.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + 0.2);
        }
      });
    }
  };

  // Create impulse response for reverb
  const createImpulseResponse = (duration, decay) => {
    const sampleRate = audioContextRef.current.sampleRate;
    const length = sampleRate * duration;
    const impulse = audioContextRef.current.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    
    return impulse;
  };

  // Initialize audio context and setup
  const initAudio = async () => {
    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
          throw new Error('Web Audio API not supported');
        }
        audioContextRef.current = new AudioContext();
      
      // Handle Chrome mobile autoplay restrictions
      if (audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
          console.log('Audio context resumed for mobile Chrome');
        } catch (err) {
          console.error('Failed to resume audio context:', err);
        }
      }

      // Create main oscillator
      oscillatorRef.current = audioContextRef.current.createOscillator();
      
      // Create sub-bass oscillator (one octave lower)
      subOscillatorRef.current = audioContextRef.current.createOscillator();
      subOscillatorRef.current.type = 'sine'; // Always sine for clean sub
      
      // Create filter - more gentle for ambient sound
      filterRef.current = audioContextRef.current.createBiquadFilter();
      filterRef.current.type = 'lowpass';
      filterRef.current.frequency.value = 600; // Lower cutoff for warmer tone
      filterRef.current.Q.value = 0.8; // Much lower resonance for smoother sound

      // Create delay effect
      delayNodeRef.current = audioContextRef.current.createDelay(2.0);
      delayNodeRef.current.delayTime.value = delayTime;
      
      feedbackNodeRef.current = audioContextRef.current.createGain();
      feedbackNodeRef.current.gain.value = delayFeedback;
      
      delayGainRef.current = audioContextRef.current.createGain();
      delayGainRef.current.gain.value = 0.3;
      
      // Create reverb effect
      convolverRef.current = audioContextRef.current.createConvolver();
      convolverRef.current.buffer = createImpulseResponse(2, 2);
      
      reverbGainRef.current = audioContextRef.current.createGain();
      reverbGainRef.current.gain.value = reverbMix;

      // Create tremolo (amplitude modulation) - much gentler
      tremoloLFORef.current = audioContextRef.current.createOscillator();
      tremoloLFORef.current.frequency.value = 0.8; // Even slower for ambient feel
      tremoloGainRef.current = audioContextRef.current.createGain();
      tremoloGainRef.current.gain.value = tremoloDepth * 0.3; // Much gentler modulation
      
      // Create pitch LFO for subtle vibrato - very slow and gentle
      pitchLFORef.current = audioContextRef.current.createOscillator();
      pitchLFORef.current.frequency.value = 0.15; // Even slower vibrato
      pitchLFORef.current.type = 'sine';
      const pitchLFOGain = audioContextRef.current.createGain();
      pitchLFOGain.gain.value = pitchLFODepth * 0.7; // Reduced vibrato depth
      
      // Create filter LFO for filter sweeps - much slower and gentler
      filterLFORef.current = audioContextRef.current.createOscillator();
      filterLFORef.current.frequency.value = 0.05; // Ultra slow filter sweep
      filterLFORef.current.type = 'sine';
      filterLFOGainRef.current = audioContextRef.current.createGain();
      filterLFOGainRef.current.gain.value = 200; // Much gentler filter modulation

      // Create distortion/waveshaper for warmth - much gentler
      waveShaperRef.current = audioContextRef.current.createWaveShaper();
      waveShaperRef.current.curve = makeDistortionCurve(20); // Much less distortion
      waveShaperRef.current.oversample = '4x';
      
      // Create compressor for dynamics
      compressorRef.current = audioContextRef.current.createDynamicsCompressor();
      compressorRef.current.threshold.value = -24;
      compressorRef.current.knee.value = 30;
      compressorRef.current.ratio.value = 12;
      compressorRef.current.attack.value = 0.003;
      compressorRef.current.release.value = 0.25;
      
      // Create stereo panner
      pannerRef.current = audioContextRef.current.createStereoPanner();
      pannerRef.current.pan.value = 0;
      
      // Sub oscillator gain - reduced for less bass heaviness
      subGainRef.current = audioContextRef.current.createGain();
      subGainRef.current.gain.value = 0.2; // Reduced from 0.3
      
      // Create arpeggiator oscillators (3 notes for smoother sound)
      arpOscillatorsRef.current = [];
      arpGainNodesRef.current = [];
      
      for (let i = 0; i < 3; i++) {
        const arpOsc = audioContextRef.current.createOscillator();
        const arpGain = audioContextRef.current.createGain();
        
        arpOsc.type = 'sine';
        arpGain.gain.value = 0; // Start silent
        
        arpOsc.connect(arpGain);
        arpGain.connect(filterRef.current);
        
        arpOsc.start();
        
        arpOscillatorsRef.current.push(arpOsc);
        arpGainNodesRef.current.push(arpGain);
      }

      // Create main gain node for volume control - lower for ambient feel
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 0.35; // Reduced from 0.5
      
      // Connect pitch LFO to both oscillators
      pitchLFORef.current.connect(pitchLFOGain);
      pitchLFOGain.connect(oscillatorRef.current.frequency);
      pitchLFOGain.connect(subOscillatorRef.current.frequency);
      
      // Connect filter LFO to filter frequency
      filterLFORef.current.connect(filterLFOGainRef.current);
      filterLFOGainRef.current.connect(filterRef.current.frequency);
      
      // Connect tremolo LFO to gain
      tremoloLFORef.current.connect(tremoloGainRef.current);
      tremoloGainRef.current.connect(gainNodeRef.current.gain);

      // Main signal path with distortion
      oscillatorRef.current.connect(filterRef.current);
      filterRef.current.connect(waveShaperRef.current);
      waveShaperRef.current.connect(pannerRef.current);
      pannerRef.current.connect(gainNodeRef.current);
      
      // Sub bass path (bypasses filter for clean lows)
      subOscillatorRef.current.connect(subGainRef.current);
      subGainRef.current.connect(gainNodeRef.current);
      
      // Delay effect chain
      filterRef.current.connect(delayNodeRef.current);
      delayNodeRef.current.connect(feedbackNodeRef.current);
      feedbackNodeRef.current.connect(delayNodeRef.current);
      delayNodeRef.current.connect(delayGainRef.current);
      delayGainRef.current.connect(gainNodeRef.current);
      
      // Reverb effect chain
      filterRef.current.connect(convolverRef.current);
      convolverRef.current.connect(reverbGainRef.current);
      reverbGainRef.current.connect(gainNodeRef.current);
      
      // Final output through compressor
      gainNodeRef.current.connect(compressorRef.current);
      compressorRef.current.connect(audioContextRef.current.destination);
      
      // Start oscillators and LFOs
      oscillatorRef.current.start();
      subOscillatorRef.current.start();
      tremoloLFORef.current.start();
      pitchLFORef.current.start();
      filterLFORef.current.start();
      }
    } catch (error) {
      handleError(error, 'Audio Initialization');
      throw error;
    }
  };

  // Start camera stream
  const startCamera = async () => {
    try {
      console.log('Requesting camera access...');
      console.log('User agent:', navigator.userAgent);
      console.log('Platform:', navigator.platform);
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported');
        alert('Camera not supported on this device or browser');
        return;
      }
      
      // Check Web Audio API support
      if (!window.AudioContext && !window.webkitAudioContext) {
        console.error('Web Audio API not supported');
        alert('Audio synthesis not supported on this browser');
        return;
      }
      
      // Mobile-optimized constraints for Chrome
      const constraints = {
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: { ideal: 'environment' }, // Prefer back camera on mobile
          aspectRatio: { ideal: 16/9 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('Camera stream obtained');
      streamRef.current = stream;
      
      // Initialize audio first - await for mobile Chrome
      await initAudio();
      
      // Set active state to show UI
      setIsActive(true);
      
      console.log('Waiting for video element to be available...');
      // Wait a bit for React to render the video element
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          console.log('Setting video source');
          videoRef.current.srcObject = streamRef.current;
          
          // Play video when metadata loads
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            videoRef.current.play().then(() => {
              console.log('Video playing, dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
            }).catch(err => {
              console.error('Error playing video:', err);
            });
          };
        }
      }, 100);
      
    } catch (err) {
      console.error("Camera access error:", err);
      
      // More specific error handling for mobile Chrome
      let errorMessage = "Camera access denied or not available. ";
      
      if (err.name === 'NotAllowedError') {
        errorMessage += "Please allow camera access in your browser settings and reload the page.";
      } else if (err.name === 'NotFoundError') {
        errorMessage += "No camera found on this device.";
      } else if (err.name === 'NotSupportedError') {
        errorMessage += "Camera not supported on this browser.";
      } else {
        errorMessage += `Error: ${err.message}`;
      }
      
      handleError(err, 'Camera Access');
      alert(errorMessage);
    }
  };

  // Analyze video frame
  const analyzeFrame = () => {
    if (!canvasRef.current || !videoRef.current) {
      console.log('Canvas or video not ready');
      return;
    }
    
    // Check if video dimensions are ready
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      // Try again in a moment
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Performance optimization: limit canvas size for mobile Chrome
    const maxWidth = 320;
    const maxHeight = 240;
    const videoAspect = videoRef.current.videoWidth / videoRef.current.videoHeight;
    
    let canvasWidth, canvasHeight;
    if (videoAspect > maxWidth / maxHeight) {
      canvasWidth = maxWidth;
      canvasHeight = maxWidth / videoAspect;
    } else {
      canvasHeight = maxHeight;
      canvasWidth = maxHeight * videoAspect;
    }
    
    // Set canvas size only if it changes
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      console.log('Canvas optimized for mobile:', canvas.width, 'x', canvas.height);
    }
    
    // Draw current video frame with tech effects
    try {
      // Draw the video frame first
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Apply tech-style visual effects
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Process each pixel for enhanced contrast and technicolor effect
      for (let i = 0; i < data.length; i += 4) {
        // Get RGB values
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        
        // Extreme contrast boost
        const contrast = 1.8;
        r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
        g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
        b = ((b / 255 - 0.5) * contrast + 0.5) * 255;
        
        // Technicolor enhancement - boost all colors dramatically
        const brightness = (r + g + b) / 3;
        
        // Color separation and boosting
        if (r > brightness) {
          r = Math.min(255, r * 1.4); // Boost reds
        }
        if (g > brightness) {
          g = Math.min(255, g * 1.5); // Boost greens even more
        }
        if (b > brightness) {
          b = Math.min(255, b * 1.3); // Boost blues
        }
        
        // Add color cross-processing for vintage technicolor look
        r = Math.min(255, r + (g * 0.1)); // Add green to reds
        g = Math.min(255, g + (b * 0.05)); // Add blue to greens  
        b = Math.min(255, b + (r * 0.08)); // Add red to blues
        
        // Saturation boost
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        const saturation = 2.2;
        r = gray + (r - gray) * saturation;
        g = gray + (g - gray) * saturation;
        b = gray + (b - gray) * saturation;
        
        // Clamp values
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
      
      // Put the processed image back
      ctx.putImageData(imageData, 0, 0);
      
      // Add colorful scan lines effect
      ctx.globalCompositeOperation = 'screen';
      for (let y = 0; y < canvas.height; y += 4) {
        // Alternate between different colored scan lines
        if (y % 12 === 0) {
          ctx.fillStyle = 'rgba(255, 0, 128, 0.04)'; // Hot pink
        } else if (y % 8 === 0) {
          ctx.fillStyle = 'rgba(0, 255, 255, 0.04)'; // Cyan
        } else {
          ctx.fillStyle = 'rgba(0, 255, 65, 0.02)'; // Green
        }
        ctx.fillRect(0, y, canvas.width, 1);
      }
      ctx.globalCompositeOperation = 'source-over';
      
      // Use the processed image data for audio analysis
      
      // Calculate average color intensity
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

      // Map color intensity to sound parameters
      if (oscillatorRef.current && filterRef.current && audioContextRef.current) {
        // Pitch based on green intensity (lowered by two octaves)
        const frequency = mapRange(avgGreen, 0, 255, 25, 500);
        oscillatorRef.current.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
        
        // Sub oscillator one octave lower
        if (subOscillatorRef.current) {
          subOscillatorRef.current.frequency.setValueAtTime(frequency * 0.5, audioContextRef.current.currentTime);
        }

        // Dynamic filter that closes when no input, opens with movement
        const brightness = (avgRed + avgGreen + avgBlue) / 3;
        const currentBrightness = brightness;
        const brightnessDiff = Math.abs(currentBrightness - lastBrightnessRef.current);
        
        // Base filter frequency - starts closed (muffled)
        let baseFilterFreq = 300; // Very closed by default
        
        // Open filter based on movement detection
        if (brightnessDiff > movementThreshold * 0.5) {
          // Movement detected - open filter for harshness
          baseFilterFreq = mapRange(brightnessDiff, movementThreshold * 0.5, 100, 400, 2000);
        } else {
          // No significant movement - keep filter closed for warmth
          baseFilterFreq = 300 + (avgBlue * 0.5); // Slight variation based on blue
        }
        
        const filterFreq = Math.min(baseFilterFreq, 2000); // Cap at 2kHz
        filterRef.current.frequency.setValueAtTime(filterFreq, audioContextRef.current.currentTime);

        // Oscillator type based on red intensity
        const oscTypes = ['sine', 'square', 'sawtooth', 'triangle'];
        const typeIndex = Math.floor(mapRange(avgRed, 0, 255, 0, oscTypes.length - 0.01));
        oscillatorRef.current.type = oscTypes[typeIndex];
        
        // Map brightness to delay and reverb
        // brightness already calculated above
        
        // Delay amount based on overall brightness
        if (delayGainRef.current) {
          const delayAmount = mapRange(brightness, 0, 255, 0, 0.5);
          delayGainRef.current.gain.setValueAtTime(delayAmount, audioContextRef.current.currentTime);
        }
        
        // Reverb amount based on darkness (inverse of brightness)
        if (reverbGainRef.current) {
          const reverbAmount = mapRange(brightness, 0, 255, 0.6, 0);
          reverbGainRef.current.gain.setValueAtTime(reverbAmount, audioContextRef.current.currentTime);
        }
        
        
        // Stereo panning based on color balance (red = left, blue = right)
        if (pannerRef.current) {
          const panPosition = mapRange(avgRed - avgBlue, -255, 255, -0.8, 0.8);
          pannerRef.current.pan.setValueAtTime(panPosition, audioContextRef.current.currentTime);
        }
        
        // Movement detection and stillness analysis
        // brightnessDiff already calculated above
        
        // Track stillness
        if (brightnessDiff < movementThreshold * 0.2) {
          stillnessCounterRef.current++;
        } else {
          stillnessCounterRef.current = 0;
        }
        
        const isStill = stillnessCounterRef.current > stillnessThresholdRef.current;
        const stillnessIntensity = Math.min(stillnessCounterRef.current / stillnessThresholdRef.current, 1);
        
        // Apply stillness effects
        let adjustedFrequency = frequency;
        let adjustedTremoloSpeed = 0.5;
        let adjustedFilterLFOSpeed = 0.03;
        
        if (isStill) {
          // In deep stillness - drop everything way down
          adjustedFrequency = frequency * (0.5 - stillnessIntensity * 0.3); // Drop pitch significantly
          adjustedTremoloSpeed = 0.2 - stillnessIntensity * 0.15; // Almost stop tremolo
          adjustedFilterLFOSpeed = 0.01 - stillnessIntensity * 0.008; // Barely moving filter
          
          // Update main oscillator with dropped frequency
          oscillatorRef.current.frequency.setValueAtTime(adjustedFrequency, audioContextRef.current.currentTime);
          if (subOscillatorRef.current) {
            subOscillatorRef.current.frequency.setValueAtTime(adjustedFrequency * 0.5, audioContextRef.current.currentTime);
          }
        }
        
        // Arpeggiator logic (unchanged)
        if (brightnessDiff > movementThreshold) {
          // High movement detected - start arpeggiator
          if (!arpIntervalRef.current && arpEnabled) {
            startArpeggiator(frequency);
          }
        } else if (brightnessDiff < movementThreshold * 0.3) {
          // Low movement - stop arpeggiator
          stopArpeggiator();
        }
        
        // Update tremolo and filter LFO with stillness adjustments - much gentler ranges
        if (tremoloLFORef.current) {
          const baseSpeed = isStill ? adjustedTremoloSpeed : mapRange(Math.abs(brightness - (audioParams.redAvg + audioParams.greenAvg + audioParams.blueAvg) / 3), 0, 50, 0.3, 1.5);
          tremoloLFORef.current.frequency.setValueAtTime(baseSpeed, audioContextRef.current.currentTime);
        }
        
        if (filterLFORef.current) {
          const colorVariation = Math.abs(avgRed - avgGreen) + Math.abs(avgGreen - avgBlue) + Math.abs(avgBlue - avgRed);
          const baseFilterSpeed = isStill ? adjustedFilterLFOSpeed : mapRange(colorVariation, 0, 300, 0.02, 0.2);
          filterLFORef.current.frequency.setValueAtTime(baseFilterSpeed, audioContextRef.current.currentTime);
        }
        
        lastBrightnessRef.current = currentBrightness;
        
        // Update state for display
        setAudioParams({
          frequency: Math.round(isStill ? adjustedFrequency : frequency),
          filterFreq: Math.round(filterFreq),
          waveform: oscTypes[typeIndex],
          redAvg: Math.round(avgRed),
          greenAvg: Math.round(avgGreen),
          blueAvg: Math.round(avgBlue),
          delayAmount: delayGainRef.current ? delayGainRef.current.gain.value : 0,
          reverbAmount: reverbGainRef.current ? reverbGainRef.current.gain.value : 0,
          stillnessLevel: Math.round(stillnessIntensity * 100),
          isStill: isStill
        });
      }
    } catch (err) {
      console.error('Error analyzing frame:', err);
    }
  };

  // Start analysis loop
  useEffect(() => {
    let animationFrameId;
    let retryCount = 0;
    const maxRetries = 50;
    
    if (isActive) {
      const loop = () => {
        // Try to analyze frame
        analyzeFrame();
        
        // Check if we need to retry getting video dimensions
        if (videoRef.current && videoRef.current.videoWidth === 0 && retryCount < maxRetries) {
          retryCount++;
          console.log(`Waiting for video dimensions... retry ${retryCount}/${maxRetries}`);
        }
        
        animationFrameId = requestAnimationFrame(loop);
      };
      
      // Start loop after a small delay
      setTimeout(() => {
        loop();
      }, 500);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isActive]);

  // Stop everything
  const stopSonicPrism = () => {
    console.log('Stopping Sonic Prism...');
    
    // Stop video stream
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      streamRef.current = null;
    }

    // Stop audio
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) {
        console.log('Oscillator already stopped');
      }
      oscillatorRef.current = null;
    }

    // Reset audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsActive(false);
  };

  // Update effect intensity
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = effectIntensity;
    }
  }, [effectIntensity]);
  
  // Update delay settings
  useEffect(() => {
    if (delayNodeRef.current) {
      delayNodeRef.current.delayTime.setValueAtTime(delayTime, audioContextRef.current?.currentTime || 0);
    }
    if (feedbackNodeRef.current) {
      feedbackNodeRef.current.gain.setValueAtTime(delayFeedback, audioContextRef.current?.currentTime || 0);
    }
  }, [delayTime, delayFeedback]);
  
  // Update reverb settings
  useEffect(() => {
    if (reverbGainRef.current && audioContextRef.current) {
      // Update reverb buffer with new settings
      convolverRef.current.buffer = createImpulseResponse(2, 2 + reverbMix * 3);
    }
  }, [reverbMix]);

  // 8-bit retro color palette
  const colors = {
    primary: '#00ff41',    // Matrix green
    secondary: '#ff0080',   // Hot pink
    accent: '#00bfff',     // Electric blue
    warning: '#ffff00',    // Bright yellow
    background: '#0a0a0a', // Deep black
    surface: '#1a1a2e',   // Dark blue-gray
    surfaceLight: '#16213e', // Lighter blue-gray
    text: '#00ff41',      // Green text
    textDim: '#00cc33',   // Dimmer green
    border: '#003d0f'     // Dark green border
  };

  const pixelFont = {
    fontFamily: 'Monaco, "Lucida Console", "Courier New", monospace',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  };

  const retroButton = {
    ...pixelFont,
    background: `linear-gradient(145deg, ${colors.surface}, ${colors.surfaceLight})`,
    border: `3px solid ${colors.primary}`,
    color: colors.primary,
    padding: '12px 20px',
    borderRadius: '0px',
    cursor: 'pointer',
    fontSize: '14px',
    boxShadow: `0 0 20px ${colors.primary}33, inset 0 0 20px ${colors.surface}`,
    transition: 'all 0.2s ease'
  };

  // Early return for error state
  if (hasError) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#ff0080',
        padding: '20px',
        textAlign: 'center',
        fontFamily: 'Monaco, "Lucida Console", "Courier New", monospace'
      }}>
        <h1 style={{ color: '#ff0080', marginBottom: '20px' }}>🚨 ERROR DETECTED</h1>
        <div style={{ 
          background: '#1a1a2e', 
          border: '2px solid #ff0080', 
          padding: '20px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>{errorMessage}</pre>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            background: '#ff0080',
            color: '#0a0a0a',
            border: 'none',
            padding: '15px 30px',
            fontSize: '16px',
            fontFamily: 'inherit',
            cursor: 'pointer'
          }}
        >
          🔄 RELOAD APP
        </button>
        <div style={{ marginTop: '20px', fontSize: '12px', opacity: 0.7 }}>
          Check browser console for detailed error information
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes glow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }
        * { box-sizing: border-box; }
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.surface} 100%)`,
        color: colors.text,
        ...pixelFont,
        padding: '10px',
        overflowX: 'hidden'
      }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '20px',
        padding: '15px',
        background: colors.surface,
        border: `2px solid ${colors.primary}`,
        boxShadow: `0 0 30px ${colors.primary}33`,
        position: 'relative'
      }}>
        <div style={{
          ...pixelFont,
          fontSize: '24px',
          color: colors.primary,
          textShadow: `0 0 10px ${colors.primary}`,
          marginBottom: '5px'
        }}>
          ◢ VISUAL SYNTH ◤
        </div>
        <div style={{
          fontSize: '12px',
          color: colors.textDim,
          letterSpacing: '2px'
        }}>
          PROTOTYPE v1.0
        </div>
        <div style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          width: '8px',
          height: '8px',
          background: colors.warning,
          boxShadow: `0 0 8px ${colors.warning}`,
          animation: 'blink 2s infinite'
        }} />
      </div>

      {/* Main Control */}
      <div style={{
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        {!isActive ? (
          <button 
            onClick={startCamera}
            onTouchStart={(e) => {
              e.target.style.boxShadow = `0 0 40px ${colors.primary}, inset 0 0 40px ${colors.primary}33`;
            }}
            onTouchEnd={(e) => {
              e.target.style.boxShadow = `0 0 30px ${colors.primary}66, inset 0 0 30px ${colors.primary}22`;
            }}
            style={{
              ...retroButton,
              fontSize: '16px',
              padding: '15px 25px',
              background: `linear-gradient(145deg, ${colors.primary}22, ${colors.primary}44)`,
              border: `3px solid ${colors.primary}`,
              color: colors.primary,
              boxShadow: `0 0 30px ${colors.primary}66, inset 0 0 30px ${colors.primary}22`,
              touchAction: 'manipulation'
            }}
            onMouseOver={(e) => {
              e.target.style.boxShadow = `0 0 40px ${colors.primary}, inset 0 0 40px ${colors.primary}33`;
            }}
            onMouseOut={(e) => {
              e.target.style.boxShadow = `0 0 30px ${colors.primary}66, inset 0 0 30px ${colors.primary}22`;
            }}
          >
            ▶ PRESS TO ACTIVATE ◀
          </button>
        ) : (
          <button 
            onClick={stopSonicPrism}
            onTouchStart={(e) => {
              e.target.style.boxShadow = `0 0 40px ${colors.secondary}, inset 0 0 40px ${colors.secondary}33`;
            }}
            onTouchEnd={(e) => {
              e.target.style.boxShadow = `0 0 30px ${colors.secondary}66, inset 0 0 30px ${colors.secondary}22`;
            }}
            style={{
              ...retroButton,
              fontSize: '16px',
              padding: '15px 25px',
              background: `linear-gradient(145deg, ${colors.secondary}22, ${colors.secondary}44)`,
              border: `3px solid ${colors.secondary}`,
              color: colors.secondary,
              boxShadow: `0 0 30px ${colors.secondary}66, inset 0 0 30px ${colors.secondary}22`,
              touchAction: 'manipulation'
            }}
            onMouseOver={(e) => {
              e.target.style.boxShadow = `0 0 40px ${colors.secondary}, inset 0 0 40px ${colors.secondary}33`;
            }}
            onMouseOut={(e) => {
              e.target.style.boxShadow = `0 0 30px ${colors.secondary}66, inset 0 0 30px ${colors.secondary}22`;
            }}
          >
            ■ TERMINATE SYNTH ■
          </button>
        )}
      </div>

      {isActive && (
        <>
          {/* Video Display */}
          <div style={{
            marginBottom: '20px',
            padding: '10px',
            background: colors.surface,
            border: `2px solid ${colors.accent}`,
            boxShadow: `0 0 20px ${colors.accent}33`
          }}>
            <div style={{
              ...pixelFont,
              fontSize: '12px',
              color: colors.accent,
              marginBottom: '10px',
              textAlign: 'center',
              letterSpacing: '2px'
            }}>
              ═══ VISUAL INPUT MATRIX ═══
            </div>
            <video 
              ref={videoRef} 
              style={{ 
                display: 'none'
              }}
              autoPlay
              playsInline
              muted
              webkit-playsinline="true"
              controls={false}
              preload="metadata"
            />
            <canvas 
              ref={canvasRef} 
              style={{ 
                width: '100%',
                maxWidth: '100%',
                height: 'auto',
                border: `3px solid ${colors.accent}`,
                backgroundColor: colors.background,
                boxShadow: `inset 0 0 30px ${colors.accent}22, 0 0 15px ${colors.accent}33, 0 0 30px ${colors.accent}44`,
                display: 'block',
                filter: 'brightness(1.05) saturate(1.1)',
                animation: 'glow 3s ease-in-out infinite'
              }}
            />
          </div>
          
          {/* Real-time parameters display */}
          <div style={{ 
            marginBottom: '20px',
            padding: '15px', 
            background: colors.surface,
            border: `2px solid ${colors.primary}`,
            boxShadow: `0 0 20px ${colors.primary}33`,
            textAlign: 'left'
          }}>
            <div style={{
              ...pixelFont,
              fontSize: '14px',
              color: colors.primary,
              textAlign: 'center',
              marginBottom: '15px',
              letterSpacing: '2px',
              textShadow: `0 0 10px ${colors.primary}`
            }}>
              ▌█ LIVE AUDIO PARAMETERS █▐
            </div>
            
            {/* Main Parameters Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '15px' }}>
              <div style={{ 
                padding: '8px', 
                background: colors.surfaceLight,
                border: `2px solid ${colors.primary}`,
                boxShadow: `0 0 10px ${colors.primary}22`
              }}>
                <div style={{ 
                  ...pixelFont,
                  fontSize: '10px', 
                  color: colors.textDim, 
                  marginBottom: '5px',
                  letterSpacing: '1px'
                }}>
                  FREQ (HZ)
                </div>
                <div style={{ 
                  ...pixelFont,
                  fontSize: '16px', 
                  color: colors.primary,
                  textShadow: `0 0 8px ${colors.primary}`
                }}>
                  {audioParams.frequency}
                </div>
                <div style={{ 
                  height: '6px', 
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  marginTop: '5px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${(audioParams.frequency - 25) / (500 - 25) * 100}%`,
                    background: `linear-gradient(90deg, ${colors.primary}44, ${colors.primary})`,
                    boxShadow: `0 0 8px ${colors.primary}`,
                    transition: 'width 0.1s'
                  }} />
                </div>
              </div>
              
              <div style={{ 
                padding: '8px', 
                background: colors.surfaceLight,
                border: `2px solid ${colors.accent}`,
                boxShadow: `0 0 10px ${colors.accent}22`
              }}>
                <div style={{ 
                  ...pixelFont,
                  fontSize: '10px', 
                  color: colors.textDim, 
                  marginBottom: '5px',
                  letterSpacing: '1px'
                }}>
                  FILTER (HZ)
                </div>
                <div style={{ 
                  ...pixelFont,
                  fontSize: '16px', 
                  color: colors.accent,
                  textShadow: `0 0 8px ${colors.accent}`
                }}>
                  {audioParams.filterFreq}
                </div>
                <div style={{ 
                  height: '6px', 
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  marginTop: '5px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${(audioParams.filterFreq - 100) / (5000 - 100) * 100}%`,
                    background: `linear-gradient(90deg, ${colors.accent}44, ${colors.accent})`,
                    boxShadow: `0 0 8px ${colors.accent}`,
                    transition: 'width 0.1s'
                  }} />
                </div>
              </div>
            </div>
            
            {/* Waveform Display */}
            <div style={{ 
              padding: '10px', 
              background: colors.surfaceLight,
              border: `2px solid ${colors.secondary}`,
              boxShadow: `0 0 10px ${colors.secondary}22`,
              marginBottom: '15px'
            }}>
              <div style={{ 
                ...pixelFont,
                fontSize: '10px', 
                color: colors.textDim, 
                marginBottom: '8px',
                letterSpacing: '1px'
              }}>
                WAVEFORM TYPE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px' }}>
                {['sine', 'square', 'sawtooth', 'triangle'].map(wave => (
                  <div key={wave} style={{
                    ...pixelFont,
                    padding: '4px 2px',
                    textAlign: 'center',
                    fontSize: '9px',
                    background: audioParams.waveform === wave 
                      ? `linear-gradient(145deg, ${colors.secondary}, ${colors.secondary}cc)` 
                      : colors.background,
                    color: audioParams.waveform === wave ? colors.background : colors.textDim,
                    border: `1px solid ${audioParams.waveform === wave ? colors.secondary : colors.border}`,
                    boxShadow: audioParams.waveform === wave 
                      ? `0 0 10px ${colors.secondary}66, inset 0 0 10px ${colors.secondary}22` 
                      : 'none',
                    transition: 'all 0.2s'
                  }}>
                    {wave.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '5px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>Color Analysis (RGB)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ 
                    width: '50px', 
                    height: '50px', 
                    backgroundColor: `rgb(${audioParams.redAvg}, 0, 0)`,
                    borderRadius: '50%',
                    margin: '0 auto 5px'
                  }} />
                  <div style={{ fontSize: '12px', color: '#f44336' }}>Red: {audioParams.redAvg}</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ 
                    width: '50px', 
                    height: '50px', 
                    backgroundColor: `rgb(0, ${audioParams.greenAvg}, 0)`,
                    borderRadius: '50%',
                    margin: '0 auto 5px'
                  }} />
                  <div style={{ fontSize: '12px', color: '#4CAF50' }}>Green: {audioParams.greenAvg}</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ 
                    width: '50px', 
                    height: '50px', 
                    backgroundColor: `rgb(0, 0, ${audioParams.blueAvg})`,
                    borderRadius: '50%',
                    margin: '0 auto 5px'
                  }} />
                  <div style={{ fontSize: '12px', color: '#2196F3' }}>Blue: {audioParams.blueAvg}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Effects Controls */}
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>Effects & Controls</h3>
            
            {/* Live effect indicators */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '5px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Delay Amount</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#9C27B0' }}>
                  {Math.round(audioParams.delayAmount * 100)}%
                </div>
                <div style={{ 
                  height: '4px', 
                  backgroundColor: '#e0e0e0', 
                  borderRadius: '2px',
                  marginTop: '5px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${audioParams.delayAmount * 100}%`,
                    backgroundColor: '#9C27B0',
                    transition: 'width 0.1s'
                  }} />
                </div>
              </div>
              
              <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '5px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Reverb Amount</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF9800' }}>
                  {Math.round(audioParams.reverbAmount * 100)}%
                </div>
                <div style={{ 
                  height: '4px', 
                  backgroundColor: '#e0e0e0', 
                  borderRadius: '2px',
                  marginTop: '5px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${audioParams.reverbAmount * 100}%`,
                    backgroundColor: '#FF9800',
                    transition: 'width 0.1s'
                  }} />
                </div>
              </div>
              
              <div style={{ 
                padding: '10px', 
                backgroundColor: audioParams.isStill ? '#1a1a2e' : '#fff', 
                borderRadius: '5px',
                color: audioParams.isStill ? '#fff' : '#333',
                border: audioParams.isStill ? '2px solid #16213e' : '1px solid #ddd'
              }}>
                <div style={{ fontSize: '12px', color: audioParams.isStill ? '#bbb' : '#666', marginBottom: '5px' }}>
                  Stillness Mode
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: audioParams.isStill ? '#4fc3f7' : '#666' }}>
                  {audioParams.isStill ? 'ACTIVE' : 'OFF'}
                </div>
                <div style={{ 
                  height: '4px', 
                  backgroundColor: audioParams.isStill ? '#0d47a1' : '#e0e0e0', 
                  borderRadius: '2px',
                  marginTop: '5px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${audioParams.stillnessLevel || 0}%`,
                    backgroundColor: '#4fc3f7',
                    transition: 'width 0.2s'
                  }} />
                </div>
              </div>
            </div>
            
            {/* Manual controls */}
            <div style={{ marginTop: '10px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
                Volume: {Math.round(effectIntensity * 100)}%
              </label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={effectIntensity}
                onChange={(e) => setEffectIntensity(parseFloat(e.target.value))}
                style={{ width: '100%', marginBottom: '15px' }}
              />
              
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
                Delay Time: {delayTime.toFixed(2)}s
              </label>
              <input 
                type="range" 
                min="0.05" 
                max="1" 
                step="0.05" 
                value={delayTime}
                onChange={(e) => setDelayTime(parseFloat(e.target.value))}
                style={{ width: '100%', marginBottom: '15px' }}
              />
              
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
                Delay Feedback: {Math.round(delayFeedback * 100)}%
              </label>
              <input 
                type="range" 
                min="0" 
                max="0.8" 
                step="0.05" 
                value={delayFeedback}
                onChange={(e) => setDelayFeedback(parseFloat(e.target.value))}
                style={{ width: '100%', marginBottom: '15px' }}
              />
              
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
                Reverb Size: {Math.round(reverbMix * 100)}%
              </label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={reverbMix}
                onChange={(e) => setReverbMix(parseFloat(e.target.value))}
                style={{ width: '100%', marginBottom: '15px' }}
              />
              
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
                Tremolo Depth: {Math.round(tremoloDepth * 100)}%
              </label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={tremoloDepth}
                onChange={(e) => {
                  setTremoloDepth(parseFloat(e.target.value));
                  if (tremoloGainRef.current) {
                    tremoloGainRef.current.gain.value = parseFloat(e.target.value) * 0.5;
                  }
                }}
                style={{ width: '100%', marginBottom: '15px' }}
              />
              
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
                Vibrato Depth: {pitchLFODepth} Hz
              </label>
              <input 
                type="range" 
                min="0" 
                max="50" 
                step="5" 
                value={pitchLFODepth}
                onChange={(e) => setPitchLFODepth(parseFloat(e.target.value))}
                style={{ width: '100%', marginBottom: '15px' }}
              />
              
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <input 
                  type="checkbox" 
                  checked={arpEnabled}
                  onChange={(e) => {
                    setArpEnabled(e.target.checked);
                    if (!e.target.checked) {
                      stopArpeggiator();
                    }
                  }}
                  style={{ marginRight: '10px' }}
                />
                <label style={{ fontSize: '14px' }}>Enable Arpeggiator (Movement Trigger)</label>
              </div>
              
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
                Arpeggio Speed: {arpSpeed}ms
              </label>
              <input 
                type="range" 
                min="100" 
                max="500" 
                step="25" 
                value={arpSpeed}
                onChange={(e) => setArpSpeed(parseInt(e.target.value))}
                style={{ width: '100%', marginBottom: '15px' }}
              />
              
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
                Movement Sensitivity: {movementThreshold}
              </label>
              <input 
                type="range" 
                min="10" 
                max="100" 
                step="5" 
                value={movementThreshold}
                onChange={(e) => setMovementThreshold(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            <p>🎵 Green → Pitch | Blue → Filter | Red → Waveform</p>
            <p>✨ Brightness → More Delay | Darkness → More Reverb</p>
            <p>🌊 Motion → Tremolo Speed | Color Variation → Filter Sweep</p>
            <p>🎼 High Movement → Triggers Cinematic Arpeggios</p>
            <p>🧘 Stillness → Pitch Drops, Everything Slows to Deep Meditation</p>
          </div>
        </>
      )}
      </div>
    </>
  );
}

export default SonicPrismApp;