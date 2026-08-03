import { useEffect, useState } from 'react'
import { api } from '../lib/api'

type Cutting = {
  id: number
  name: string
}

export default function Casts() {
  const [cutting, setCutting] = useState<Cutting | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCasts = async () => {
      try {
        const res = await api.get('/casts')
        setCutting(res.data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchCasts()
  }, [])

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <h1>Casts</h1>
      <p>{cutting?.name || 'No cutting found'}</p>
    </div>
  )
}
