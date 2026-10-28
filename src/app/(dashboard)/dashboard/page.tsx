'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [resources, setResources] = useState<any[]>([])
  const [pendingBookings, setPendingBookings] = useState<any[]>([])
  const [myBookings, setMyBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  // State for the History Modal
  const [historyLogs, setHistoryLogs] = useState<any[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    const { data: resData } = await supabase.from('resources').select('*')
    if (resData) setResources(resData)

    const { data: bookData } = await supabase.from('bookings').select('*, resources(name)').eq('status', 'pending_approval')
    if (bookData) setPendingBookings(bookData)

    const { data: myData } = await supabase
      .from('bookings')
      .select('*, resources(name)')
      .eq('requester_id', user.id)
      .in('status', ['approved', 'checked_out', 'returned'])
      .order('created_at', { ascending: false })
    if (myData) setMyBookings(myData)
    
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const requestBooking = async (resourceId: string) => {
    setMessage('Processing request...')
    const startTime = new Date()
    startTime.setDate(startTime.getDate() + 1) 
    startTime.setHours(10, 0, 0, 0)
    const endTime = new Date(startTime)
    endTime.setHours(14, 0, 0, 0)

    const { error } = await supabase.from('bookings').insert({
      resource_id: resourceId,
      requester_id: user.id,
      status: 'pending_approval',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      justification: 'Class field trip for science curriculum.'
    })

    if (error) setMessage(`Error: ${error.message}`)
    else {
      setMessage('✅ Booking requested successfully!')
      loadData()
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const handleOwnerAction = async (bookingId: string, newStatus: 'approved' | 'waitlisted') => {
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId)
    if (error) return alert(`Error: ${error.message}`)

    await supabase.from('audit_logs').insert({
      actor_id: user.id, action: `BOOKING_${newStatus.toUpperCase()}`, entity_type: 'booking', entity_id: bookingId, details: { note: `Owner marked booking as ${newStatus}` }
    })
    loadData()
  }

  const handleConditionAction = async (bookingId: string, file: File, action: 'check_in' | 'check_out') => {
    if (!file) return alert("Please select a photo first.")
    setMessage('Uploading photo...')

    const fileExt = file.name.split('.').pop()
    const fileName = `${bookingId}-${action}-${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('condition_photos').upload(fileName, file)
    if (uploadError) return setMessage(`Upload Error: ${uploadError.message}`)

    const { data: { publicUrl } } = supabase.storage.from('condition_photos').getPublicUrl(fileName)

    await supabase.from('condition_reports').insert({
      booking_id: bookingId, report_type: action, checklist_data: { logged: true }, photo_urls: [publicUrl]
    })

    const newStatus = action === 'check_in' ? 'checked_out' : 'returned'
    await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId)

    await supabase.from('audit_logs').insert({
      actor_id: user.id, action: action.toUpperCase(), entity_type: 'booking', entity_id: bookingId, details: { photo: publicUrl }
    })

    setMessage(`✅ Successfully completed ${action.replace('_', ' ')}!`)
    loadData()
  }

  // NEW: Handle Incident Report
  const handleReportIncident = async (bookingId: string) => {
    const description = prompt("Please describe the damage or issue:")
    if (!description) return

    await supabase.from('incidents').insert({
      booking_id: bookingId, reported_by: user.id, description, severity: 'medium', status: 'open'
    })

    await supabase.from('audit_logs').insert({
      actor_id: user.id, action: 'INCIDENT_REPORTED', entity_type: 'booking', entity_id: bookingId, details: { description }
    })

    alert("Incident reported to the owner.")
    loadData()
  }

  // NEW: Fetch Audit History
  const viewHistory = async (bookingId: string) => {
    setHistoryLoading(true)
    setHistoryLogs([]) // Open modal with loading state
    
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_id', bookingId)
      .order('created_at', { ascending: true }) // Oldest to newest
    
    setHistoryLogs(data || [])
    setHistoryLoading(false)
  }

  if (loading) return <div style={{ padding: 40 }}>Loading dashboard...</div>

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      
      {/* HISTORY MODAL */}
      {historyLogs !== null && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>📜 Audit Timeline</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>Immutable record of all actions for this booking.</p>
            
            {historyLoading ? <p>Loading...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                {historyLogs.length === 0 ? <p>No history found.</p> : historyLogs.map((log) => (
                  <div key={log.id} style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '15px' }}>
                    <strong style={{ fontSize: '14px', color: '#1e3a8a' }}>{log.action}</strong>
                    <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                    {log.details?.note && <p style={{ margin: 0, fontSize: '14px' }}>{log.details.note}</p>}
                  </div>
                ))}
              </div>
            )}
            
            <button onClick={() => setHistoryLogs(null)} style={{ marginTop: '20px', width: '100%', padding: '10px', backgroundColor: '#000', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}

      <nav style={{ backgroundColor: '#000', color: '#fff', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>ResourceShare</h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px' }}>{user?.email}</span>
          <button onClick={handleLogout} style={{ background: '#333', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
        </div>
      </nav>

      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        {message && <div style={{ padding: '15px', backgroundColor: message.includes('Error') ? '#fee2e2' : '#dcfce7', color: message.includes('Error') ? '#991b1b' : '#166534', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold' }}>{message}</div>}

        {/* --- MY BOOKINGS SECTION --- */}
        {myBookings.length > 0 && (
          <div style={{ marginBottom: '50px', padding: '20px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px' }}>
            <h2 style={{ marginTop: 0, color: '#1e3a8a' }}>🎒 My Active Bookings</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myBookings.map((booking) => (
                <div key={booking.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <strong>{booking.resources?.name}</strong>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#555' }}>Status: <span style={{ fontWeight: 'bold', color: booking.status === 'returned' ? '#16a34a' : '#2563eb' }}>{booking.status.toUpperCase()}</span></p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => viewHistory(booking.id)} style={{ padding: '8px 12px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      📜 View History
                    </button>
                    
                    {booking.status !== 'returned' && (
                      <button onClick={() => handleReportIncident(booking.id)} style={{ padding: '8px 12px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        ⚠️ Report Issue
                      </button>
                    )}

                    {booking.status === 'approved' && (
                      <div>
                        <input type="file" id={`file-${booking.id}`} accept="image/*" style={{ fontSize: '12px', marginBottom: '5px' }} />
                        <button onClick={() => {
                          const file = (document.getElementById(`file-${booking.id}`) as HTMLInputElement).files?.[0]
                          if (file) handleConditionAction(booking.id, file, 'check_in')
                        }} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Check In</button>
                      </div>
                    )}

                    {booking.status === 'checked_out' && (
                      <div>
                        <input type="file" id={`file-${booking.id}`} accept="image/*" style={{ fontSize: '12px', marginBottom: '5px' }} />
                        <button onClick={() => {
                          const file = (document.getElementById(`file-${booking.id}`) as HTMLInputElement).files?.[0]
                          if (file) handleConditionAction(booking.id, file, 'check_out')
                        }} style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Check Out</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- OWNER SECTION --- */}
        <div style={{ marginBottom: '50px', padding: '20px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px' }}>
          <h2 style={{ marginTop: 0, color: '#92400e' }}>👑 Owner Dashboard (Pending Requests)</h2>
          {pendingBookings.length === 0 ? <p>No pending requests right now.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingBookings.map((booking) => (
                <div key={booking.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{booking.resources?.name}</strong>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#555' }}>{booking.justification}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleOwnerAction(booking.id, 'approved')} style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Approve</button>
                    <button onClick={() => handleOwnerAction(booking.id, 'waitlisted')} style={{ padding: '8px 16px', backgroundColor: '#eab308', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Waitlist</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- TEACHER SECTION --- */}
        <h2 style={{ marginBottom: '20px' }}>Available Resources</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {resources.map((res) => (
            <div key={res.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 'bold', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{res.category}</span>
                <h3 style={{ margin: '10px 0 5px 0' }}>{res.name}</h3>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 15px 0' }}>{res.location}</p>
              </div>
              <button onClick={() => requestBooking(res.id)} style={{ marginTop: '15px', width: '100%', padding: '10px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Request Booking</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}