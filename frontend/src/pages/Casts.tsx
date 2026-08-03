import { useEffect, useState } from 'react'
import { api } from '../lib/api'

type Cutting = {
  id: number
  name: string
}

export default function Casts() {
  const [cutting, setCutting] = useState<Cutting | null>(null)

  useEffect(() => {
    api.get('/casts').then(res: any) => setCutting(res.data))
  }, [])

  return (
    <div>
      <h1>Casts</h1>
      <p>{cutting?.name || 'No cutting found'}</p>
    </div>
  )
}
