import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components'
import {
  Dashboard,
  NewRun,
  RoomRegistration,
  RunDetail,
  RunEdit,
  RunHistory,
  RunFinished,
  Statistics,
  Comparison,
  Resources,
  Dungeons
} from './pages'

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new-run" element={<NewRun />} />
          <Route path="/run/:id/room" element={<RoomRegistration />} />
          <Route path="/run/:id/finished" element={<RunFinished />} />
          <Route path="/run/:id" element={<RunDetail />} />
          <Route path="/run/:id/edit" element={<RunEdit />} />
          <Route path="/history" element={<RunHistory />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/compare" element={<Comparison />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/dungeons" element={<Dungeons />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
