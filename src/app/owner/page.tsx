'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OwnerPage() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [myResources, setMyResources] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [pastTransactions, setPastTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('lab')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState('30')
  const [description, setDescription] = useState('')
  const [resPerson, setResPerson] = useState('')
  const [resPhone, setResPhone] = useState('')
  const [rules, setRules] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

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

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    if (profile) setUserProfile(profile)

    const { data: resData } = await supabase.from('resources').select('*').eq('owner_id', user.id)
    if (resData) setMyResources(resData)

    // Notice we now fetch the teacher's email for notifications
    const { data: reqData } = await supabase
      .from('bookings')
      .select('*, resources!inner(name, owner_id), profiles!requester_id(full_name, phone, email)')
      .eq('resources.owner_id', user.id)
      .order('created_at', { ascending: false })
    
    if (reqData) {
      setPendingRequests(reqData.filter(b => b.status === 'pending'))
      setPastTransactions(reqData.filter(b => b.status !== 'pending'))
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageFile) return alert("Please upload an image of the resource.")
    setIsProcessing(true)
    setMessage('Publishing resource...')

    const fileExt = imageFile.name.split('.').pop()
    const fileName = `res-${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('condition_photos').upload(fileName, imageFile)
    if (uploadError) { setIsProcessing(false); return setMessage(`Upload Error: ${uploadError.message}`) }

    const { data: { publicUrl } } = supabase.storage.from('condition_photos').getPublicUrl(fileName)
    const { error } = await supabase.from('resources').insert({ owner_id: user.id, name, category, location, capacity: parseInt(capacity), description, resource_person_name: resPerson, resource_person_phone: resPhone, rules, image_url: publicUrl })

    if (error) setMessage(`Error: ${error.message}`)
    else {
      setMessage('Resource published successfully!')
      setShowForm(false); setName(''); setDescription(''); setImageFile(null)
      loadData()
    }
    setIsProcessing(false)
  }

  const handleRequestAction = async (bookingId: string, newStatus: 'approved' | 'rejected', req: any) => {
    setIsProcessing(true)
    
    await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId)
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: `OWNER_${newStatus.toUpperCase()}`, entity_type: 'booking', entity_id: bookingId, details: { note: `Owner marked as ${newStatus}` } })

    // EMAIL: Notify Teacher of manual Approval/Rejection
    await sendEmail({
      to: req.profiles?.email,
      subject: `Booking ${newStatus.toUpperCase()}: ${req.resources?.name}`,
      title: `Booking ${newStatus === 'approved' ? 'Approved' : 'Rejected'}`,
      message: newStatus === 'approved' 
        ? 'The provider has reviewed and approved your booking request.' 
        : 'Unfortunately, the provider has rejected your booking request.',
      details: [
        { label: 'Resource', value: req.resources?.name },
        { label: 'Date', value: req.booking_date }
      ]
    })

    loadData()
    setIsProcessing(false)
  }

  const isBookingLate = (booking: any) => {
    if (booking.status !== 'checked_out') return false;
    const endDateTime = new Date(`${booking.booking_date}T${booking.end_time}`);
    return endDateTime < new Date();
  }

  const getBookedCount = (resId: string) => pastTransactions.filter(t => t.resource_id === resId).length;

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}><span className="spinner spinner-dark" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></span></div>

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      
      <nav style={{ backgroundColor: '#0f172a', color: '#fff', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>🏢 Provider Dashboard</h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#cbd5e1' }}>👤 {userProfile?.full_name || user?.email}</span>
          <button onClick={() => setShowForm(!showForm)} style={{ backgroundColor: '#38bdf8', color: '#0f172a', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>{showForm ? 'Cancel' : '+ List New Resource'}</button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
        </div>
      </nav>

      <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
        {message && <div style={{ padding: '15px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold' }}>{message}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '14px' }}>Total Resources Listed</p>
            <h2 style={{ margin: 0, fontSize: '28px', color: '#0f172a' }}>{myResources.length}</h2>
          </div>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '14px' }}>Pending Requests</p>
            <h2 style={{ margin: 0, fontSize: '28px', color: '#d97706' }}>{pendingRequests.length}</h2>
          </div>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '14px' }}>Total Transactions</p>
            <h2 style={{ margin: 0, fontSize: '28px', color: '#16a34a' }}>{pastTransactions.length}</h2>
          </div>
        </div>

        {showForm && (
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', marginBottom: '40px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ marginTop: 0 }}>List a New Resource</h2>
            <form onSubmit={handleCreateResource} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <input type="text" placeholder="Resource Name" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                <option value="lab">Laboratory</option>
                <option value="smart_classroom">Smart Classroom</option>
                <option value="science_park">Science Park</option>
                <option value="sports_ground">Sports Ground</option>
                <option value="transportation">Transportation</option>
              </select>
              <input type="text" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} required style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
              <input type="number" placeholder="Max Capacity" value={capacity} onChange={e => setCapacity(e.target.value)} required style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
              <input type="text" placeholder="Resource Person Name" value={resPerson} onChange={e => setResPerson(e.target.value)} required style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
              <input type="tel" placeholder="Resource Person Phone" value={resPhone} onChange={e => setResPhone(e.target.value)} required style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
              <div style={{ gridColumn: 'span 2' }}><textarea placeholder="Description..." value={description} onChange={e => setDescription(e.target.value)} required style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', minHeight: '80px', fontFamily: 'inherit' }} /></div>
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Upload Image</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} required style={{ padding: '10px', border: '1px dashed #cbd5e1', borderRadius: '8px' }} />
              </div>
              <button type="submit" disabled={isProcessing} style={{ gridColumn: 'span 2', padding: '12px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{isProcessing ? <span className="spinner"></span> : 'Publish Resource'}</button>
            </form>
          </div>
        )}

        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px' }}>Pending Requests</h2>
          {pendingRequests.length === 0 ? <p style={{ color: '#64748b' }}>No pending requests.</p> : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {pendingRequests.map(req => (
                <div key={req.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0' }}>{req.resources?.name}</h3>
                    <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#475569' }}><strong>Teacher:</strong> {req.profiles?.full_name} ({req.profiles?.phone})</p>
                    <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#475569' }}><strong>Date:</strong> {req.booking_date} | <strong>Students:</strong> {req.num_students}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleRequestAction(req.id, 'approved', req)} disabled={isProcessing} style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Approve</button>
                    <button onClick={() => handleRequestAction(req.id, 'rejected', req)} disabled={isProcessing} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <h2 style={{ fontSize: '20px' }}>My Resources</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {myResources.map(res => (
            <div key={res.id} style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              {res.image_url && <img src={res.image_url} alt={res.name} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />}
              <div style={{ padding: '15px' }}>
                <h3 style={{ margin: '5px 0', fontSize: '16px' }}>{res.name}</h3>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#64748b' }}>Capacity: {res.capacity}</p>
                <div style={{ backgroundColor: '#f1f5f9', padding: '8px', borderRadius: '6px', fontSize: '13px', textAlign: 'center', color: '#334155', fontWeight: 'bold' }}>
                  Booked {getBookedCount(res.id)} times
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '20px' }}>Past Transactions Ledger</h2>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '15px', color: '#64748b' }}>Resource</th>
                <th style={{ padding: '15px', color: '#64748b' }}>Teacher</th>
                <th style={{ padding: '15px', color: '#64748b' }}>Date</th>
                <th style={{ padding: '15px', color: '#64748b' }}>Students</th>
                <th style={{ padding: '15px', color: '#64748b' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pastTransactions.map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '15px', fontWeight: '500' }}>{tx.resources?.name}</td>
                  <td style={{ padding: '15px', color: '#64748b' }}>{tx.profiles?.full_name}</td>
                  <td style={{ padding: '15px', color: '#64748b' }}>{tx.booking_date}</td>
                  <td style={{ padding: '15px', color: '#64748b' }}>{tx.num_students}</td>
                  <td style={{ padding: '15px' }}>
                    {isBookingLate(tx) ? (
                      <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '12px', fontWeight: 'bold', border: '1px solid #f87171' }}>
                        ⚠️ OVERDUE RETURN
                      </span>
                    ) : (
                      <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: tx.status === 'returned' ? '#dcfce7' : tx.status === 'rejected' ? '#fee2e2' : '#e0f2fe', color: tx.status === 'returned' ? '#166534' : tx.status === 'rejected' ? '#991b1b' : '#0369a1', fontSize: '12px', fontWeight: 'bold' }}>
                        {tx.status.toUpperCase().replace('_', ' ')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}