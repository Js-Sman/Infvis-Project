import { colors, layout } from '../../theme.js'

export default function SpikeDot({ cx, cy, color, missing, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={layout.starPlotDotRadius}
      fill={missing ? colors.starPlotMissingDot : color}
      stroke={missing ? 'transparent' : 'rgba(255,255,255,0.3)'}
      strokeWidth={1}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  )
}
