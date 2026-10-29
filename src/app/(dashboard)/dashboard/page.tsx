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

  const sendEmail = async (payload: any) => {
    try {
      await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } catch (err) { console.error(err) }
  }

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return; }
    setUser(user)

    const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single()
    if (profile) setUserProfile(profile)

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
    return new Date(`${booking.booking_date}T${booking.end_time}`) < new Date();
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

    // 1. CALCULATE PRIORITY SCORE
    const daysInAdvance = Math.floor((new Date(bookingDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    let score = (parseInt(numStudents) * 2) + Math.max(0, daysInAdvance)
    
    // 2. CHECK FOR CONFLICTS
    const { data: conflicts } = await supabase.from('bookings').select('*').eq('resource_id', selectedResource.id).eq('booking_date', bookingDate).in('status', ['approved', 'pending'])
    let hasConflict = false
    if (conflicts) {
      for (const c of conflicts) {
        if (startTime < c.end_time && endTime > c.start_time) { hasConflict = true; break; }
      }
    }

    // 3. SET STATUS TO PENDING, WITH SMART NOTES FOR OWNER
    let decisionNote = hasConflict 
      ? `System Alert: There is a scheduling conflict for this time slot. Priority Score: ${score}.`
      : `System Check Passed: No conflicts detected. Priority Score: ${score}.`

    const { error } = await supabase.from('bookings').insert({
      resource_id: selectedResource.id, 
      requester_id: user.id, 
      status: 'pending', 
      booking_date: bookingDate, 
      start_time: startTime, 
      end_time: endTime, 
      num_students: parseInt(numStudents), 
      purpose, 
      priority_score: score, 
      system_decision_note: decisionNote
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      await supabase.from('audit_logs').insert({ actor_id: user.id, action: `BOOKING_REQUESTED`, entity_type: 'booking', entity_id: selectedResource.id, details: { note: decisionNote } })
      
      await sendEmail({
        to: selectedResource.profiles?.email, subject: `New Request for ${selectedResource.name}`, title: `New Booking Request`,
        message: `${userProfile?.full_name} requested your resource.`, details: [{ label: 'Date', value: bookingDate }, { label: 'Priority Score', value: score.toString() }]
      })

      setMessage(`✅ Request sent to Owner. Priority Score: ${score}`)
      setSelectedResource(null)
      loadData()
      setTimeout(() => setMessage(''), 5000)
    }
    setIsProcessing(false)
  }

  const handleConditionAction = async (bookingId: string, file: File, action: 'check_in' | 'check_out', booking: any) => {
    if (!file) return alert("Please select a photo first.")
    setIsProcessing(true)
    setMessage('Uploading photo...')

    const fileExt = file.name.split('.').pop()
    const fileName = `${bookingId}-${action}-${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('condition_photos').upload(fileName, file)
    if (uploadError) { setIsProcessing(false); return setMessage(`Upload Error: ${uploadError.message}`) }

    const { data: { publicUrl } } = supabase.storage.from('condition_photos').getPublicUrl(fileName)
    await supabase.from('condition_reports').insert({ booking_id: bookingId, report_type: action, checklist_data: { logged: true }, photo_urls: [publicUrl] })
    
    const newStatus = action === 'check_in' ? 'checked_out' : 'returned'
    await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId)
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: action.toUpperCase(), entity_type: 'booking', entity_id: bookingId, details: { photo: publicUrl } })

    if (action === 'check_out') {
      await sendEmail({
        to: booking.resources?.profiles?.email, subject: `Resource Returned`, title: `Resource Returned`,
        message: `${userProfile?.full_name} returned the ${booking.resources?.name}.`, details: [{ label: 'Date', value: booking.booking_date }]
      })
    }

    setMessage(`✅ Successfully completed!`)
    loadData()
    setIsProcessing(false)
  }

  const submitIncident = async () => {
    if (!incidentDesc) return
    setIsProcessing(true)
    await supabase.from('incidents').insert({ booking_id: incidentBookingId, reported_by: user.id, description: incidentDesc, severity: 'medium', status: 'open' })
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'INCIDENT_REPORTED', entity_type: 'booking', entity_id: incidentBookingId, details: { description: incidentDesc } })
    
    const targetBooking = activeBookings.find(b => b.id === incidentBookingId)
    await sendEmail({
      to: targetBooking?.resources?.profiles?.email, subject: `⚠️ INCIDENT: ${targetBooking?.resources?.name}`, title: `Incident Reported`,
      message: `An issue was reported.`, details: [{ label: 'Resource', value: targetBooking?.resources?.name }, { label: 'Issue', value: incidentDesc }]
    })

    setIncidentBookingId(null); setIncidentDesc(''); setMessage('✅ Incident reported.')
    setTimeout(() => setMessage(''), 4000); setIsProcessing(false)
  }

  const getStatusBadge = (status: string, isLate: boolean) => {
    if (isLate) return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">⚠️ OVERDUE RETURN</span>
    switch(status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">🟢 CONFIRMED</span>
      case 'pending':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">⏳ PENDING REVIEW</span>
      case 'checked_out':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">🔵 CHECKED OUT</span>
      case 'waitlisted':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">🟠 WAITLISTED</span>
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{status.toUpperCase()}</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-medium">Loading teacher dashboard...</p>
      </div>
    )
  }

  return (
    <div className="font-sans min-h-screen bg-slate-50/70 text-slate-900">
      
      {/* NAVBAR */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-600/20">
              🎓
            </div>
            <div>
              <h1 className="font-bold text-slate-900 tracking-tight">Teacher Portal</h1>
              <p className="text-xs text-slate-500">Resource Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-600 hidden sm:inline bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60">
              👤 {userProfile?.full_name || user?.email}
            </span>
            <button 
              onClick={handleLogout} 
              className="bg-slate-100 hover:bg-slate-200/80 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition border border-slate-200"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        
        {/* MESSAGE ALERT */}
        {message && (
          <div className={`p-4 rounded-xl font-medium text-sm border shadow-xs flex items-center gap-2.5 ${
            message.includes('Error') || message.includes('❌') 
              ? 'bg-red-50 text-red-800 border-red-200' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            <span>{message.includes('Error') || message.includes('❌') ? '⚠️' : '✨'}</span>
            <span>{message}</span>
          </div>
        )}

        {/* METRICS STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Active Bookings</p>
            <div className="flex items-baseline justify-between mt-3">
              <h2 className="text-2xl font-bold text-slate-900">{activeBookings.length}</h2>
              <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">Live</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Completed Transactions</p>
            <div className="flex items-baseline justify-between mt-3">
              <h2 className="text-2xl font-bold text-slate-900">{pastBookings.length}</h2>
              <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">History</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Fair Usage Quota</p>
            <div className="flex items-baseline justify-between mt-3">
              <h2 className={`text-xl font-bold ${activeBookings.length >= 2 ? 'text-red-600' : 'text-emerald-600'}`}>
                {activeBookings.length} <span className="text-xs font-normal text-slate-400">/ 2 Allowed</span>
              </h2>
              <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${activeBookings.length >= 2 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                  style={{ width: `${(activeBookings.length / 2) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIVE BOOKINGS */}
        {activeBookings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Active Bookings</h2>
            <div className="flex flex-col gap-3">
              {activeBookings.map(booking => {
                const late = isBookingLate(booking);
                return (
                  <div key={booking.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      
                      <div className="flex gap-4 items-center">
                        {booking.resources?.image_url ? (
                          <img src={booking.resources.image_url} alt="res" className="w-16 h-16 object-cover rounded-xl border border-slate-100 shadow-xs" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">📦</div>
                        )}
                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-900">{booking.resources?.name}</h3>
                          <p className="text-xs text-slate-500">📅 {booking.booking_date} • ⏰ {booking.start_time} to {booking.end_time}</p>
                          <div className="pt-1">{getStatusBadge(booking.status, late)}</div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 items-center">
                        {booking.status !== 'pending' && booking.status !== 'waitlisted' && (
                          <button 
                            onClick={() => setIncidentBookingId(booking.id)} 
                            className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200/80 rounded-xl text-xs font-semibold hover:bg-red-100 transition"
                          >
                            ⚠️ Report Issue
                          </button>
                        )}

                        {booking.status === 'approved' && (
                          <div className="flex items-center gap-2">
                            <input type="file" id={`file-in-${booking.id}`} accept="image/*" className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                            <button 
                              onClick={() => { const f = (document.getElementById(`file-in-${booking.id}`) as HTMLInputElement).files?.[0]; if (f) handleConditionAction(booking.id, f, 'check_in', booking) }} 
                              disabled={isProcessing} 
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                            >
                              Check In
                            </button>
                          </div>
                        )}

                        {booking.status === 'checked_out' && (
                          <div className="flex items-center gap-2">
                            <input type="file" id={`file-out-${booking.id}`} accept="image/*" className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" />
                            <button 
                              onClick={() => { const f = (document.getElementById(`file-out-${booking.id}`) as HTMLInputElement).files?.[0]; if (f) handleConditionAction(booking.id, f, 'check_out', booking) }} 
                              disabled={isProcessing} 
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                            >
                              Return
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {late && (
                      <div className="bg-red-50 p-3 rounded-xl text-xs text-red-700 border border-red-200 font-medium">
                        ⚠️ WARNING: Allocation end time exceeded. Please return the resource immediately.
                      </div>
                    )}

                    {booking.system_decision_note && (
                      <div className="p-3 rounded-xl text-xs bg-slate-50 text-slate-700 border border-slate-200">
                        <strong>System Note:</strong> {booking.system_decision_note}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* DISCOVER RESOURCES */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">Discover Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {resources.map(res => (
              <div key={res.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col group hover:border-indigo-300 transition">
                {res.image_url ? (
                  <img src={res.image_url} alt={res.name} className="w-full h-44 object-cover" />
                ) : (
                  <div className="w-full h-44 bg-slate-100 flex items-center justify-center text-slate-400 text-sm">No Image</div>
                )}
                <div className="p-5 flex flex-col flex-grow justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md uppercase tracking-wider">{res.category}</span>
                    <h3 className="font-bold text-slate-900 text-base mt-2">{res.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">📍 {res.location} • 👥 Max: {res.capacity}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedResource(res)} 
                    className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                  >
                    Request Booking
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TRANSACTION HISTORY */}
        {pastBookings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Transaction History</h2>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="p-4 font-semibold">Resource</th>
                      <th className="p-4 font-semibold">Date Used</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold">Priority Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pastBookings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-semibold text-slate-900">{b.resources?.name}</td>
                        <td className="p-4 text-slate-500">{b.booking_date}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            b.status === 'returned' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {b.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500">{b.priority_score || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INCIDENT MODAL */}
      {incidentBookingId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl border border-slate-200 space-y-4">
            <h2 className="font-bold text-base text-slate-900">Report an Issue</h2>
            <p className="text-slate-500 text-xs">This will notify the resource owner and admin immediately.</p>
            <textarea 
              value={incidentDesc} 
              onChange={(e) => setIncidentDesc(e.target.value)} 
              placeholder="Describe the issue clearly..." 
              className="w-full p-3 border border-slate-200 rounded-xl min-h-[100px] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
            />
            <div className="flex gap-2.5">
              <button 
                onClick={submitIncident} 
                disabled={isProcessing} 
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition"
              >
                {isProcessing ? 'Submitting...' : 'Submit Report'}
              </button>
              <button 
                onClick={() => setIncidentBookingId(null)} 
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {selectedResource && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl border border-slate-200 space-y-4 my-8">
            <div>
              <h2 className="font-bold text-base text-slate-900">Request: {selectedResource.name}</h2>
              <p className="text-slate-500 text-xs">Max capacity limit: {selectedResource.capacity} students.</p>
            </div>
            
            <form onSubmit={submitRequest} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Booking Date</label>
                <input 
                  type="date" 
                  required 
                  value={bookingDate} 
                  onChange={e => setBookingDate(e.target.value)} 
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Start Time</label>
                  <input 
                    type="time" 
                    required 
                    value={startTime} 
                    onChange={e => setStartTime(e.target.value)} 
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">End Time</label>
                  <input 
                    type="time" 
                    required 
                    value={endTime} 
                    onChange={e => setEndTime(e.target.value)} 
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Students Count</label>
                <input 
                  type="number" 
                  placeholder="Number of students" 
                  required 
                  value={numStudents} 
                  onChange={e => setNumStudents(e.target.value)} 
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Purpose</label>
                <textarea 
                  placeholder="Purpose of visit..." 
                  required 
                  value={purpose} 
                  onChange={e => setPurpose(e.target.value)} 
                  className="w-full p-2.5 border border-slate-200 rounded-xl min-h-[70px] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button 
                  type="submit" 
                  disabled={isProcessing} 
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                >
                  {isProcessing ? 'Processing...' : 'Submit Request'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setSelectedResource(null)} 
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}