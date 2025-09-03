import React, { useState } from 'react';
import VisualSynthV2 from './components/VisualSynthV2';
import CollaborativeSoundscape from './components/CollaborativeSoundscape';
import ModeSelector from './components/ModeSelector';

function App() {
  const [mode, setMode] = useState(null);
  
  // Show mode selector if no mode chosen
  if (!mode) {
    return <ModeSelector onSelectMode={setMode} />;
  }
  
  // Show solo visual synth
  if (mode === 'solo') {
    return (
      <div className="App">
        <VisualSynthV2 onBack={() => setMode(null)} />
      </div>
    );
  }
  
  // Show collaborative mode
  if (mode === 'collaborative') {
    return (
      <div className="App">
        <CollaborativeSoundscape />
      </div>
    );
  }
  
  return null;
}

export default App;
