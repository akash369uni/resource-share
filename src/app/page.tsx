'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const [resources, setResources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    async function fetchResources() {
      const { data, error } = await supabase
        .from('resources')
        .select('*, organizations(name)')
      
      if (data) setResources(data)
      if (error) console.error(error)
      setLoading(false)
    }
    
    fetchResources()
  }, [])

  if (loading) return <div style={{ padding: 40 }}>Loading resources...</div>

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto' }}>
      <h1>Resource Sharing Platform</h1>
      <p>Available Resources:</p>
      
      <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
        {resources.map((res) => (
          <div key={res.id} style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
            <h2 style={{ margin: 0 }}>{res.name}</h2>
            <p style={{ color: '#666', margin: '5px 0' }}>{res.category.toUpperCase()} • {res.location}</p>
            <p>{res.description}</p>
            <p style={{ fontSize: '14px', color: '#444' }}>
              <strong>Owner:</strong> {res.organizations?.name} <br/>
              <strong>Capacity:</strong> {res.capacity} people
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}