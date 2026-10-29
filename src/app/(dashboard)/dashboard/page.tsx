'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [resources, setResources] = useState<any[]>([])
  const [activeBookings, setActiveBookings] = useState<any[]>([])
  const [pastBookings, setPastBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [selectedResource, setSelectedResource] = useState<any>(null)
  const [bookingDate, setBookingDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [numStudents, setNumStudents] = useState('')
  const [purpose, setPurpose] = useState('')

  const [incidentBookingId, setIncidentBookingId] = useState<string | null>(null)
  const [incidentDesc, setIncidentDesc] = useState('')

  const router = useRouter()
  const supabase = createClient()

  // UNIVERSAL EMAIL SENDER
  const sendEmail = async (payload: any) => {
    try {
      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (err) { console.error("Email failed to send:", err) }
  }

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return; }
    setUser(user)

    const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single()
    if (profile) setUserProfile(profile)

    // Fetch resources and include the owner's email for notifications!
    const { data: resData } = await supabase.from('resources').select('*, profiles!owner_id(full_name, email)').eq('is_active', true)
    if (resData) setResources(resData)

    const { data: myData } = await supabase
      .from('bookings')
      .select('*, resources(name, image_url, profiles!owner_id(email))')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false })
    
    if (myData) {
      setActiveBookings(myData.filter(b => ['pending', 'approved', 'checked_out', 'waitlisted'].includes(b.status)))
      setPastBookings(myData.filter(b => ['returned', 'rejected', 'cancelled'].includes(b.status)))
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isBookingLate = (booking: any) => {
    if (booking.status !== 'checked_out') return false;
    const endDateTime = new Date(`${booking.booking_date}T${booking.end_time}`);
    return endDateTime < new Date();
  }

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setMessage('Analyzing schedule...')

    if (parseInt(numStudents) > selectedResource.capacity) {
      setIsProcessing(false); return setMessage(`❌ Error: Max capacity is ${selectedResource.capacity}.`)
    }

    const { count: activeCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('requester_id', user.id).in('status', ['pending', 'approved', 'checked_out'])
    if (activeCount && activeCount >= 2) {
      setIsProcessing(false); return setMessage(`❌ Fair Usage Limit: You already have 2 active bookings.`)
    }

    const { data: conflicts } = await supabase.from('bookings').select('*').eq('resource_id', selectedResource.id).eq('booking_date', bookingDate).eq('status', 'approved')
    let hasConflict = false; let conflictingBooking = null
    if (conflicts) {
      for (const c of conflicts) {
        if (startTime < c.end_time && endTime > c.start_time) { hasConflict = true; conflictingBooking = c; break; }
      }
    }

    const daysInAdvance = Math.floor((new Date(bookingDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    let score = (parseInt(numStudents) * 2) + Math.max(0, daysInAdvance)
    let finalStatus = 'approved'
    let decisionNote = 'Automatically approved. Slot available.'

    if (hasConflict && conflictingBooking) {
      if (score > conflictingBooking.priority_score) {
        finalStatus = 'approved'
        decisionNote = `Approved. Your score (${score}) beat an existing request (${conflictingBooking.priority_score}).`
        await supabase.from('bookings').update({ status: 'waitlisted', system_decision_note: `Moved to waitlist. A larger group (score: ${score}) took the slot.` }).eq('id', conflictingBooking.id)
      } else {
        finalStatus = 'waitlisted'
        decisionNote = `Waitlisted. Slot contested. Existing request has higher priority (${conflictingBooking.priority_score} vs your ${score}).`
      }
    }

    const { error } = await supabase.from('bookings').insert({
      resource_id: selectedResource.id, requester_id: user.id, status: finalStatus, booking_date: bookingDate, start_time: startTime, end_time: endTime, num_students: parseInt(numStudents), purpose, priority_score: score, system_decision_note: decisionNote
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      await supabase.from('audit_logs').insert({ actor_id: user.id, action: `AUTO_${finalStatus.toUpperCase()}`, entity_type: 'booking', entity_id: selectedResource.id, details: { note: decisionNote } })
      
      // EMAIL: Send to Teacher if auto-waitlisted/approved
      await sendEmail({
        to: userProfile?.email,
        subject: `Booking ${finalStatus.toUpperCase()}: ${selectedResource.name}`,
        title: `Booking ${finalStatus === 'approved' ? 'Confirmed' : 'Waitlisted'}`,
        message: decisionNote,
        details: [
          { label: 'Resource', value: selectedResource.name },
          { label: 'Date', value: bookingDate }
        ]
      })

      // EMAIL: Send to Owner that a request happened
      await sendEmail({
        to: selectedResource.profiles?.email,
        subject: `New Booking Activity: ${selectedResource.name}`,
        title: `New Request for ${selectedResource.name}`,
        message: `${userProfile?.full_name} has requested your resource.`,
        details: [
          { label: 'Date', value: bookingDate },
          { label: 'Students', value: numStudents },
          { label: 'Status', value: finalStatus.toUpperCase() }
        ]
      })

      setMessage(`✅ Request processed: ${finalStatus.toUpperCase()}`)
      setSelectedResource(null)
      loadData()
      setTimeout(() => setMessage(''), 5000)
    }
    setIsProcessing(false)
  }

  const handleConditionAction = async (bookingId: string, file: File, action: 'check_in' | 'check_out', booking: any) => {
    if (!file) return alert("Please select a photo first.")
    setIsProcessing(true)
    setMessage('Uploading condition photo...')

    const fileExt = file.name.split('.').pop()
    const fileName = `${bookingId}-${action}-${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('condition_photos').upload(fileName, file)
    if (uploadError) { setIsProcessing(false); return setMessage(`Upload Error: ${uploadError.message}`) }

    const { data: { publicUrl } } = supabase.storage.from('condition_photos').getPublicUrl(fileName)
    await supabase.from('condition_reports').insert({ booking_id: bookingId, report_type: action, checklist_data: { logged: true }, photo_urls: [publicUrl] })
    const newStatus = action === 'check_in' ? 'checked_out' : 'returned'
    await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId)
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: action.toUpperCase(), entity_type: 'booking', entity_id: bookingId, details: { photo: publicUrl } })

    // EMAIL: Send to Owner on RETURN
    if (action === 'check_out') {
      await sendEmail({
        to: booking.resources?.profiles?.email,
        subject: `Resource Returned: ${booking.resources?.name}`,
        title: `Resource Returned`,
        message: `${userProfile?.full_name} has returned the ${booking.resources?.name}. Please review the condition report.`,
        details: [{ label: 'Date', value: booking.booking_date }]
      })
    }

    setMessage(`✅ Successfully completed ${action === 'check_in' ? 'Check-In' : 'Return'}!`)
    loadData()
    setIsProcessing(false)
  }

  const submitIncident = async () => {
    if (!incidentDesc) return
    setIsProcessing(true)
    await supabase.from('incidents').insert({ booking_id: incidentBookingId, reported_by: user.id, description: incidentDesc, severity: 'medium', status: 'open' })
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'INCIDENT_REPORTED', entity_type: 'booking', entity_id: incidentBookingId, details: { description: incidentDesc } })
    
    // Find the booking to get the owner's email
    const targetBooking = activeBookings.find(b => b.id === incidentBookingId)
    
    // EMAIL: Send to Owner
    await sendEmail({
      to: targetBooking?.resources?.profiles?.email,
      subject: `⚠️ INCIDENT REPORTED: ${targetBooking?.resources?.name}`,
      title: `Incident Reported`,
      message: `A teacher has reported an issue with your resource.`,
      details: [
        { label: 'Resource', value: targetBooking?.resources?.name },
        { label: 'Issue Description', value: incidentDesc }
      ]
    })

    setIncidentBookingId(null)
    setIncidentDesc('')
    setMessage('✅ Incident reported to Admin & Owner.')
    setTimeout(() => setMessage(''), 4000)
    setIsProcessing(false)
  }

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}><span className="spinner spinner-dark" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></span></div>

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      
      <nav style={{ backgroundColor: '#0f172a', color: '#fff', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>🎓 Teacher Portal</h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#cbd5e1' }}>👤 {userProfile?.full_name || user?.email}</span>
          <button onClick={handleLogout} style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
        </div>
      </nav>

      <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
        
        {message && <div style={{ padding: '15px', backgroundColor: message.includes('Error') || message.includes('❌') ? '#fee2e2' : '#dcfce7', color: message.includes('Error') || message.includes('❌') ? '#991b1b' : '#166534', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>{message}</div>}

        {/* DASHBOARD STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '14px' }}>Active Bookings</p>
            <h2 style={{ margin: 0, fontSize: '28px', color: '#0f172a' }}>{activeBookings.length}</h2>
          </div>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '14px' }}>Completed Transactions</p>
            <h2 style={{ margin: 0, fontSize: '28px', color: '#0f172a' }}>{pastBookings.length}</h2>
          </div>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '14px' }}>Usage Limit Status</p>
            <h2 style={{ margin: 0, fontSize: '16px', color: activeBookings.length >= 2 ? '#ef4444' : '#16a34a' }}>{activeBookings.length}/2 Allowed</h2>
          </div>
        </div>

        {activeBookings.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '20px', color: '#1e293b' }}>Active Bookings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {activeBookings.map(booking => (
                <div key={booking.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      {booking.resources?.image_url && <img src={booking.resources.image_url} alt="res" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px' }} />}
                      <div>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{booking.resources?.name}</h3>
                        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>📅 {booking.booking_date} | ⏰ {booking.start_time} to {booking.end_time}</p>
                        
                        {isBookingLate(booking) ? (
                          <p style={{ margin: '5px 0 0 0', fontSize: '13px', fontWeight: 'bold', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            ⚠️ OVERDUE RETURN
                          </p>
                        ) : (
                          <p style={{ margin: '5px 0 0 0', fontSize: '13px', fontWeight: 'bold', color: booking.status === 'approved' ? '#16a34a' : booking.status === 'waitlisted' ? '#d97706' : '#2563eb' }}>
                            {booking.status.replace('_', ' ').toUpperCase()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {booking.status !== 'pending' && booking.status !== 'waitlisted' && (
                        <button onClick={() => setIncidentBookingId(booking.id)} style={{ padding: '8px 16px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>⚠️ Report Issue</button>
                      )}
                      {booking.status === 'approved' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <input type="file" id={`file-in-${booking.id}`} accept="image/*" style={{ fontSize: '12px' }} />
                          <button onClick={() => { const f = (document.getElementById(`file-in-${booking.id}`) as HTMLInputElement).files?.[0]; if (f) handleConditionAction(booking.id, f, 'check_in', booking) }} disabled={isProcessing} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{isProcessing ? <span className="spinner"></span> : 'Check In'}</button>
                        </div>
                      )}
                      {booking.status === 'checked_out' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <input type="file" id={`file-out-${booking.id}`} accept="image/*" style={{ fontSize: '12px' }} />
                          <button onClick={() => { const f = (document.getElementById(`file-out-${booking.id}`) as HTMLInputElement).files?.[0]; if (f) handleConditionAction(booking.id, f, 'check_out', booking) }} disabled={isProcessing} style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{isProcessing ? <span className="spinner"></span> : 'Return Resource'}</button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isBookingLate(booking) && (
                    <div style={{ backgroundColor: '#fee2e2', padding: '12px', borderRadius: '8px', fontSize: '14px', color: '#991b1b', border: '1px solid #f87171', fontWeight: 'bold' }}>
                      ⚠️ WARNING: You have exceeded the return time. Please return this resource immediately to avoid penalties.
                    </div>
                  )}

                  {booking.system_decision_note && (
                    <div style={{ backgroundColor: booking.status === 'waitlisted' ? '#fffbeb' : '#f0fdf4', padding: '12px', borderRadius: '8px', fontSize: '13px', color: booking.status === 'waitlisted' ? '#92400e' : '#166534', border: `1px solid ${booking.status === 'waitlisted' ? '#fde68a' : '#bbf7d0'}` }}>
                      <strong>System Note:</strong> {booking.system_decision_note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 style={{ fontSize: '20px', color: '#1e293b' }}>Discover Resources</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px', marginBottom: '40px' }}>
          {resources.map(res => (
            <div key={res.id} style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              {res.image_url ? <img src={res.image_url} alt={res.name} style={{ width: '100%', height: '180px', objectFit: 'cover' }} /> : <div style={{ height: '180px', backgroundColor: '#e2e8f0' }}></div>}
              <div style={{ padding: '20px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{res.category}</span>
                <h3 style={{ margin: '10px 0 5px 0', fontSize: '18px' }}>{res.name}</h3>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#64748b' }}>📍 {res.location} | 👥 Max: {res.capacity}</p>
                <button onClick={() => setSelectedResource(res)} style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Request Booking</button>
              </div>
            </div>
          ))}
        </div>

        {pastBookings.length > 0 && (
          <div>
            <h2 style={{ fontSize: '20px', color: '#1e293b' }}>Transaction History</h2>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '15px', color: '#64748b' }}>Resource</th>
                    <th style={{ padding: '15px', color: '#64748b' }}>Date Used</th>
                    <th style={{ padding: '15px', color: '#64748b' }}>Status</th>
                    <th style={{ padding: '15px', color: '#64748b' }}>Priority Score</th>
                  </tr>
                </thead>
                <tbody>
                  {pastBookings.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '15px', fontWeight: '500' }}>{b.resources?.name}</td>
                      <td style={{ padding: '15px', color: '#64748b' }}>{b.booking_date}</td>
                      <td style={{ padding: '15px' }}><span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: b.status === 'returned' ? '#dcfce7' : '#fee2e2', color: b.status === 'returned' ? '#166534' : '#991b1b', fontSize: '12px', fontWeight: 'bold' }}>{b.status.toUpperCase()}</span></td>
                      <td style={{ padding: '15px', color: '#64748b' }}>{b.priority_score || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* INCIDENT MODAL */}
      {incidentBookingId && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', color: '#0f172a' }}>Report an Issue</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Describe the damage or problem clearly. This will be sent to the Owner and Admin.</p>
            <textarea value={incidentDesc} onChange={(e) => setIncidentDesc(e.target.value)} placeholder="e.g. The projector lens is cracked..." style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', minHeight: '100px', marginBottom: '20px', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={submitIncident} disabled={isProcessing} style={{ flex: 1, padding: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{isProcessing ? <span className="spinner"></span> : 'Submit Report'}</button>
              <button onClick={() => setIncidentBookingId(null)} style={{ padding: '12px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {selectedResource && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '20px' }}>Request: {selectedResource.name}</h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>Max Capacity: {selectedResource.capacity} students.</p>
            <form onSubmit={submitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="date" required value={bookingDate} onChange={e => setBookingDate(e.target.value)} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', flex: 1 }} />
                <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', flex: 1 }} />
              </div>
              <input type="number" placeholder="Number of Students" required value={numStudents} onChange={e => setNumStudents(e.target.value)} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
              <textarea placeholder="Purpose of visit..." required value={purpose} onChange={e => setPurpose(e.target.value)} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', minHeight: '80px', fontFamily: 'inherit' }} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" disabled={isProcessing} style={{ flex: 1, padding: '12px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{isProcessing ? <span className="spinner"></span> : 'Submit Request'}</button>
                <button type="button" onClick={() => setSelectedResource(null)} style={{ padding: '12px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}