import { useState, useRef, useCallback } from 'react'
import './App.css'
import Header from './components/header/Header.jsx'
import SplitScreenContainer from './components/ui/SplitScreenContainer.jsx'
import Timeline from './components/timeline/Timeline.jsx'
import useAppStore from './store/appStore.js'
import { ZOOM_LEVEL } from './hooks/useZoom.js'

export default function App() {
  const [leftZoomLevel, setLeftZoomLevel] = useState(ZOOM_LEVEL.WORLD)
  const [searchTargetLeft, setSearchTargetLeft] = useState(null)
  const [searchTargetRight, setSearchTargetRight] = useState(null)

  const leftMapRef = useRef(null)

  const hideTimeline = leftZoomLevel === ZOOM_LEVEL.DATA

  function handleHome() {
    // The map listens to a special home search target — instead, we wire it
    // by exposing a reset() on MapView via ref. For now use a hack: set a
    // special search target that resets.
    setSearchTargetLeft({ type: 'reset' })
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Header
        onHome={handleHome}
        onSelectCountryLeft={(name) => setSearchTargetLeft({ type: 'country', value: name })}
        onSelectRegionLeft={(id) => setSearchTargetLeft({ type: 'region', value: id })}
        onSelectCountryRight={(name) => setSearchTargetRight({ type: 'country', value: name })}
        onSelectRegionRight={(id) => setSearchTargetRight({ type: 'region', value: id })}
        leftZoomLevel={leftZoomLevel}
        rightZoomLevel={ZOOM_LEVEL.WORLD}
      />

      <SplitScreenContainer
        searchTargetLeft={searchTargetLeft}
        searchTargetRight={searchTargetRight}
        onSearchConsumedLeft={() => setSearchTargetLeft(null)}
        onSearchConsumedRight={() => setSearchTargetRight(null)}
      />

      <Timeline hidden={hideTimeline} />
    </div>
  )
}
