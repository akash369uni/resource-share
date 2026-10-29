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

  const sendEmail = async (payload: any) => {
    try {
      await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } catch (err) { console.error(err) }
  }

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return; }
    setUser(user)

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    if (profile) setUserProfile(profile)

    const { data: resData } = await supabase.from('resources').select('*').eq('owner_id', user.id)
    if (resData) setMyResources(resData)

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
    setIsProcessing(true); setMessage('Publishing resource...')

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

  const handleRequestAction = async (bookingId: string, newStatus: 'approved' | 'rejected' | 'waitlisted', req: any) => {
    setIsProcessing(true)
    await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId)
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: `OWNER_${newStatus.toUpperCase()}`, entity_type: 'booking', entity_id: bookingId, details: { note: `Owner marked as ${newStatus}` } })

    await sendEmail({
      to: req.profiles?.email, subject: `Booking ${newStatus.toUpperCase()}: ${req.resources?.name}`, title: `Booking Update`,
      message: newStatus === 'approved' ? 'The provider approved your request.' : newStatus === 'waitlisted' ? 'You have been placed on the waitlist.' : 'The provider rejected your request.',
      details: [{ label: 'Resource', value: req.resources?.name }, { label: 'Date', value: req.booking_date }]
    })
    loadData(); setIsProcessing(false)
  }

  const isBookingLate = (booking: any) => {
    if (booking.status !== 'checked_out') return false;
    return new Date(`${booking.booking_date}T${booking.end_time}`) < new Date();
  }

  const getBookedCount = (resId: string) => pastTransactions.filter(t => t.resource_id === resId).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-medium">Loading provider dashboard...</p>
      </div>
    )
  }

  return (
    <div className="font-sans min-h-screen bg-slate-50/70 text-slate-900">
      
      {/* NAVBAR */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-600/20">
              🏢
            </div>
            <div>
              <h1 className="font-bold text-slate-900 tracking-tight">Provider Dashboard</h1>
              <p className="text-xs text-slate-500">Resource Ownership Portal</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60 hidden sm:inline">
              👤 {userProfile?.full_name || user?.email}
            </span>
            <button 
              onClick={() => setShowForm(!showForm)} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition shadow-sm"
            >
              {showForm ? 'Cancel Form' : '+ New Resource'}
            </button>
            <button 
              onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} 
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
          <div className="p-4 rounded-xl font-medium text-sm border shadow-xs bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-2.5">
            <span>✨</span>
            <span>{message}</span>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Resources Listed</p>
            <div className="flex items-baseline justify-between mt-3">
              <h2 className="text-2xl font-bold text-slate-900">{myResources.length}</h2>
              <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">Assets</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Pending Requests</p>
            <div className="flex items-baseline justify-between mt-3">
              <h2 className="text-2xl font-bold text-amber-600">{pendingRequests.length}</h2>
              <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md">Action Required</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Transactions</p>
            <div className="flex items-baseline justify-between mt-3">
              <h2 className="text-2xl font-bold text-emerald-600">{pastTransactions.length}</h2>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">Fulfilled</span>
            </div>
          </div>
        </div>

        {/* CREATE FORM */}
        {showForm && (
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-bold text-base text-slate-900">List a New Resource</h2>
              <p className="text-xs text-slate-500 mt-0.5">Provide detailed specifications for accurate booking allocations.</p>
            </div>
            
            <form onSubmit={handleCreateResource} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Resource Name</label>
                <input type="text" placeholder="e.g. Advanced Physics Lab" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Category Type</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                  <option value="lab">Laboratory</option>
                  <option value="smart_classroom">Smart Classroom</option>
                  <option value="science_park">Science Park</option>
                  <option value="sports_ground">Sports Ground</option>
                  <option value="transportation">Transportation</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Location Venue</label>
                <input type="text" placeholder="e.g. Science Block, Floor 2" value={location} onChange={e => setLocation(e.target.value)} required className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Max Capacity Limit</label>
                <input type="number" placeholder="30" value={capacity} onChange={e => setCapacity(e.target.value)} required className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Contact Person Name</label>
                <input type="text" placeholder="e.g. Prof. John Doe" value={resPerson} onChange={e => setResPerson(e.target.value)} required className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Contact Phone Number</label>
                <input type="tel" placeholder="+1 (555) 000-0000" value={resPhone} onChange={e => setResPhone(e.target.value)} required className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Detailed Description</label>
                <textarea placeholder="Describe features, equipment included..." value={description} onChange={e => setDescription(e.target.value)} required className="w-full p-2.5 border border-slate-200 rounded-xl min-h-[80px] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Resource Photo</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} required className="w-full p-2 border border-dashed border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-500 cursor-pointer" />
              </div>

              <button 
                type="submit" 
                disabled={isProcessing} 
                className="md:col-span-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
              >
                {isProcessing ? 'Publishing...' : 'Publish Resource'}
              </button>
            </form>
          </div>
        )}

        {/* PENDING REQUESTS (HYBRID AI + MANUAL APPROVAL) */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">Pending Requests (Review)</h2>
          {pendingRequests.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 text-center text-slate-400 text-xs">
              No pending booking requests awaiting review.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 text-base">{req.resources?.name}</h3>
                      <p className="text-xs text-slate-600"><strong>Teacher:</strong> {req.profiles?.full_name} ({req.profiles?.phone || 'No phone'})</p>
                      <p className="text-xs text-slate-500">📅 Date: {req.booking_date} • 👥 Students: {req.num_students}</p>
                      <p className="text-xs text-slate-600 italic mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">"{req.purpose}"</p>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 min-w-[160px] text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Auto-Priority Score</p>
                      <p className="text-xl font-black text-indigo-600">{req.priority_score} pts</p>
                    </div>
                  </div>

                  {/* System Note */}
                  <div className="bg-indigo-50/70 text-indigo-900 p-3 rounded-xl text-xs border border-indigo-100">
                    <strong>System Analysis:</strong> {req.system_decision_note}
                  </div>

                  <div className="flex flex-wrap gap-2.5 w-full pt-1">
                    <button 
                      onClick={() => handleRequestAction(req.id, 'approved', req)} 
                      disabled={isProcessing} 
                      className="flex-1 min-w-[100px] py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleRequestAction(req.id, 'waitlisted', req)} 
                      disabled={isProcessing} 
                      className="flex-1 min-w-[100px] py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                    >
                      Waitlist
                    </button>
                    <button 
                      onClick={() => handleRequestAction(req.id, 'rejected', req)} 
                      disabled={isProcessing} 
                      className="flex-1 min-w-[100px] py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MY RESOURCES */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">My Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {myResources.map(res => (
              <div key={res.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col group">
                {res.image_url ? (
                  <img src={res.image_url} alt={res.name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">No Image</div>
                )}
                <div className="p-5 flex flex-col flex-grow justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{res.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">Capacity Limit: {res.capacity}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl text-center text-xs font-semibold text-slate-700 border border-slate-100">
                    Booked {getBookedCount(res.id)} times
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PAST TRANSACTIONS */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">Past Transactions Ledger</h2>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="p-4 font-semibold">Resource</th>
                    <th className="p-4 font-semibold">Teacher</th>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Students</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pastTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-semibold text-slate-900">{tx.resources?.name}</td>
                      <td className="p-4 text-slate-600">{tx.profiles?.full_name}</td>
                      <td className="p-4 text-slate-500">{tx.booking_date}</td>
                      <td className="p-4 text-slate-500">{tx.num_students}</td>
                      <td className="p-4">
                        {isBookingLate(tx) ? (
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-red-50 text-red-700 border border-red-200">⚠️ OVERDUE</span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            tx.status === 'returned' 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : tx.status === 'rejected' 
                              ? 'bg-red-50 text-red-700' 
                              : tx.status === 'waitlisted'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}>
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

      </div>
    </div>
  )
}