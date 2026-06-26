// App.jsx — корневой роутер по экранам.

import { useState } from 'react'
import { useSettings } from './state/store.js'
import Background from './components/Background.jsx'
import Nav from './components/Nav.jsx'
import DiaryEntry from './components/DiaryEntry.jsx'
import PatternsPanel from './components/PatternsPanel.jsx'
import ExercisePanel from './components/ExercisePanel.jsx'
import Timeline from './components/Timeline.jsx'
import DreamInDream from './components/DreamInDream.jsx'
import Collective from './components/Collective.jsx'
import SymbolDictionary from './components/SymbolDictionary.jsx'
import Settings from './components/Settings.jsx'

export default function App() {
  const [screen, setScreen] = useState('today')
  const { settings } = useSettings()
  const theme = settings.theme || 'cosmos'

  return (
    <div className={`app theme-${theme}`}>
      {theme === 'cosmos' && <Background style={settings.bgStyle} />}
      {theme === 'glass' && (
        <div className="glass-bg" aria-hidden>
          <span className="cloud c1" />
          <span className="cloud c2" />
          <span className="cloud c3" />
          <span className="cloud c4" />
          <span className="cloud c5" />
          <span className="cloud c6" />
          <span className="cloud c7" />
        </div>
      )}
      {theme === 'eink' && <div className="paper-bg" aria-hidden />}
      <Nav screen={screen} setScreen={setScreen} />
      <main className="main">
        {screen === 'today' && <DiaryEntry />}
        {screen === 'patterns' && <PatternsPanel onExercise={() => setScreen('exercises')} />}
        {screen === 'exercises' && <ExercisePanel />}
        {screen === 'timeline' && <Timeline />}
        {screen === 'dream' && <DreamInDream />}
        {screen === 'collective' && <Collective />}
        {screen === 'symbols' && <SymbolDictionary />}
        {screen === 'settings' && <Settings />}
      </main>
      <footer className="foot">
        OneiroLog · не предсказание, а способ увидеть, куда смотрит твоё сознание
      </footer>
    </div>
  )
}
