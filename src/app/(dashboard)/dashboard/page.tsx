'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [resources, setResources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      // 1. Check if logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // 2. Fetch resources
      const { data: resData } = await supabase
        .from('resources')
        .select('*')
      
      if (resData) setResources(resData)
      setLoading(false)
    }
    loadData()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const requestBooking = async (resourceId: string) => {
    setMessage('Processing request...')
    
    // For the hackathon demo, we'll auto-set the dates to tomorrow
    const startTime = new Date()
    startTime.setDate(startTime.getDate() + 1)
    startTime.setHours(10, 0, 0, 0) // 10:00 AM
    
    const endTime = new Date(startTime)
    endTime.setHours(14, 0, 0, 0) // 2:00 PM

    const { error } = await supabase.from('bookings').insert({
      resource_id: resourceId,
      requester_id: user.id,
      status: 'pending_approval',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      justification: 'Class field trip for science curriculum.'
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('✅ Booking requested successfully! Go to Supabase to see it.')
      setTimeout(() => setMessage(''), 5000)
    }
  }

  if (loading) return <div style={{ padding: 40 }}>Loading dashboard...</div>

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      
      {/* Top Navigation */}
      <nav style={{ backgroundColor: '#000', color: '#fff', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>ResourceShare</h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px' }}>Logged in as: {user?.email}</span>
          <button onClick={handleLogout} style={{ background: '#333', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '20px' }}>Available Resources</h2>
        
        {message && (
          <div style={{ padding: '15px', backgroundColor: message.includes('Error') ? '#fee2e2' : '#dcfce7', color: message.includes('Error') ? '#991b1b' : '#166534', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold' }}>
            {message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {resources.map((res) => (
            <div key={res.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 'bold', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                  {res.category}
                </span>
                <h3 style={{ margin: '10px 0 5px 0' }}>{res.name}</h3>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 15px 0' }}>{res.location}</p>
                <p style={{ fontSize: '14px', color: '#374151' }}>{res.description}</p>
              </div>
              
              <button 
                onClick={() => requestBooking(res.id)}
                style={{ marginTop: '15px', width: '100%', padding: '10px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Request Booking
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}