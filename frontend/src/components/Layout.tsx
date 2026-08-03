import { Outlet, Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function Layout() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div>
      <nav>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/casts">Casts</Link>
        <span>{user?.name || 'User'}</span>
        <button onClick={handleLogout}>Logout</button>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
