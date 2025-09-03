import React from 'react';

const ModeSelector = ({ onSelectMode }) => {
  const styles = {
    container: {
      minHeight: '100vh',
      background: '#f5f5f5', // Match original Visual Synth
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Space Mono", "IBM Plex Mono", monospace'
    },
    content: {
      textAlign: 'center',
      color: '#2a2a2a', // Match original Visual Synth
      padding: '40px',
      maxWidth: '800px'
    },
    title: {
      fontSize: '48px',
      marginBottom: '12px',
      fontWeight: '300',
      letterSpacing: '0.1em',
      textTransform: 'uppercase'
    },
    subtitle: {
      fontSize: '14px',
      marginBottom: '60px',
      opacity: 0.6,
      letterSpacing: '0.05em'
    },
    cardsContainer: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '30px',
      marginTop: '40px'
    },
    card: {
      background: '#ffffff',
      border: '2px solid #e0e0e0',
      borderRadius: '0px',
      padding: '40px 30px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    cardIcon: {
      fontSize: '80px',
      marginBottom: '20px'
    },
    cardTitle: {
      fontSize: '28px',
      marginBottom: '15px',
      fontWeight: '600'
    },
    cardDescription: {
      fontSize: '16px',
      lineHeight: '1.6',
      opacity: 0.9
    },
    badge: {
      display: 'inline-block',
      background: 'rgba(76, 217, 100, 0.3)',
      color: '#4cd964',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      marginTop: '15px',
      fontWeight: '600'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>BD-1 WAVELENGTH</h1>
        <p style={styles.subtitle}>COLLABORATIVE VISUAL SYNTH</p>
        
        <div style={styles.cardsContainer}>
          <div 
            style={styles.card}
            onClick={() => onSelectMode('solo')}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#333333';
              e.currentTarget.style.background = '#fafafa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e0e0e0';
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            <div style={styles.cardIcon}>◊</div>
            <h2 style={styles.cardTitle}>Solo Mode</h2>
            <p style={styles.cardDescription}>
              Transform your camera feed into music. 
              Choose from unique presets that respond to color and movement.
            </p>
          </div>
          
          <div 
            style={styles.card}
            onClick={() => onSelectMode('collaborative')}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#333333';
              e.currentTarget.style.background = '#fafafa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e0e0e0';
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            <div style={styles.cardIcon}>∆∆</div>
            <h2 style={styles.cardTitle}>Collaborative Jam</h2>
            <p style={styles.cardDescription}>
              Create music with a friend in real-time. 
              Use visual synth, pad controller, or both together.
            </p>
          </div>
        </div>
        
        <p style={{ marginTop: '40px', opacity: 0.6, fontSize: '11px', letterSpacing: '0.05em' }}>
          by RALPH // Version 5.0
        </p>
      </div>
    </div>
  );
};

export default ModeSelector;