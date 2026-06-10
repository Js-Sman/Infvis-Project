import { colors, typography } from '../../theme.js'

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21"/>
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
    </svg>
  )
}

function SpeedUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 14,12 5,21"/><polygon points="13,3 22,12 13,21"/>
    </svg>
  )
}

function SpeedDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="11,3 2,12 11,21"/><polygon points="19,3 10,12 19,21"/>
    </svg>
  )
}

const btn = (label) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 6,
  border: `1px solid ${colors.ui.panelBorder}`,
  background: 'transparent',
  color: colors.ui.text,
  cursor: 'pointer',
  padding: 0,
  transition: 'background 0.12s',
})

export default function PlaybackControls({ playing, onTogglePlay, onSpeedUp, onSpeedDown, speed }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        onClick={onSpeedDown}
        title="Slow down"
        style={btn()}
        onMouseEnter={(e) => (e.currentTarget.style.background = colors.ui.buttonHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <SpeedDownIcon />
      </button>

      <button
        onClick={onTogglePlay}
        title={playing ? 'Pause' : 'Play'}
        style={{
          ...btn(),
          width: 32,
          height: 32,
          background: playing ? colors.ui.accent + '22' : 'transparent',
          borderColor: playing ? colors.ui.accent : colors.ui.panelBorder,
          color: playing ? colors.ui.accent : colors.ui.text,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = colors.ui.buttonHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = playing ? colors.ui.accent + '22' : 'transparent')}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <button
        onClick={onSpeedUp}
        title="Speed up"
        style={btn()}
        onMouseEnter={(e) => (e.currentTarget.style.background = colors.ui.buttonHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <SpeedUpIcon />
      </button>

      <span
        style={{
          fontFamily: typography.fontMono,
          fontSize: 11,
          color: colors.ui.textDim,
          minWidth: 32,
        }}
      >
        {speed}x
      </span>
    </div>
  )
}
