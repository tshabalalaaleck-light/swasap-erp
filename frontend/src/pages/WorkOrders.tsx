import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function WorkOrders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res: any = await api.get('/workorders')
        setOrders(res.data)
      } catch (error: any) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  if (loading) return <p>Loading work orders...</p>

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Work Orders</h1>
      <ul>
        {orders.map((order: any) => (
          <li key={order.id} className="border p-2 mb-2">
            {order.id} - {order.title}
          </li>
        ))}
      </ul>
    </div>
  )
}
