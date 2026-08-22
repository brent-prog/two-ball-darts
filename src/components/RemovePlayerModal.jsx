'use client';

export default function RemovePlayerModal({ open, players = [], onRemove, onClose }) {
  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 360, background: 'rgba(0,0,0,.8)', padding: '18px', display: 'grid', placeItems: 'center' }}>
      <div className="card" style={{ width: 'min(520px, 96vw)', maxHeight: '90vh', overflow: 'auto', margin: 0, borderColor: '#d0a948' }}>
        <div className="section-heading compact" style={{ marginBottom: '14px', alignItems: 'flex-start' }}>
          <div>
            <p className="eyebrow">Round players</p>
            <h2 style={{ fontSize: 'clamp(2rem, 7vw, 3.2rem)' }}>Remove Player</h2>
          </div>
          <button className="button secondary" onClick={onClose}>Close</button>
        </div>

        <p style={{ margin: '0 0 12px', color: 'rgba(255,244,214,.78)', fontWeight: 800 }}>
          Choose the player to remove from this round.
        </p>

        <div style={{ display: 'grid', gap: '10px' }}>
          {players.map((player, index) => (
            <button
              key={player.id}
              type="button"
              className="button secondary"
              onClick={() => onRemove(player.id)}
              style={{ width: '100%', justifyContent: 'space-between', textAlign: 'left', minHeight: '52px' }}
            >
              <span>{player.name || `Player ${index + 1}`}</span>
              <span style={{ color: '#d0a948', fontSize: '.82rem' }}>Remove</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
