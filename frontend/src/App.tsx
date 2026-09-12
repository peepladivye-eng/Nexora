import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          NEXORA
        </h1>
        <p className="text-xl text-gray-400 mb-8">Orbital Collision Avoidance System</p>
        <div className="glass p-8 max-w-2xl">
          <p className="text-gray-300 mb-4">
            Phase 0: Project scaffolding complete ✓
          </p>
          <p className="text-sm text-gray-500">
            Next: Implementing satguard engine with real TLE data...
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
