import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export function Layout(): React.JSX.Element {
  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      <Navbar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
