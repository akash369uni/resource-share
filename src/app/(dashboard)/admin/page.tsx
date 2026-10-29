'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [stats, setStats] = useState({ teachers: 0, owners: 0, bookings: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const loadData = async () => {
    const { data: allUsers } = await supabase.from('profiles').select('*')
    if (allUsers) {
      setPendingUsers(allUsers.filter(u => u.verification_status === 'pending'))
      setStats(prev => ({
        ...prev,
        teachers: allUsers.filter(u => u.role === 'teacher').length,
        owners: allUsers.filter(u => u.role === 'owner').length
      }))
    }

    const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true })
    setStats(prev => ({ ...prev, bookings: count || 0 }))

    const { data: incData } = await supabase.from('incidents').select('*, bookings(id, resources(name)), profiles(full_name)').eq('status', 'open')
    if (incData) setIncidents(incData)

    const { data: logData } = await supabase.from('audit_logs').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(20)
    if (logData) setLogs(logData)

    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleVerify = async (userId: string) => {
    await supabase.from('profiles').update({ verification_status: 'verified' }).eq('id', userId)
    await supabase.from('audit_logs').insert({ action: 'USER_VERIFIED', entity_type: 'user', entity_id: userId, details: { by: 'admin' } })
    loadData()
  }

  const resolveIncident = async (incidentId: string) => {
    await supabase.from('incidents').update({ status: 'resolved' }).eq('id', incidentId)
    await supabase.from('audit_logs').insert({ action: 'INCIDENT_RESOLVED', entity_type: 'incident', entity_id: incidentId, details: { by: 'admin' } })
    loadData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-medium">Loading admin controls...</p>
      </div>
    )
  }

  return (
    <div className="font-sans min-h-screen bg-slate-50/70 text-slate-900">
      
      {/* NAVBAR */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-600/20">
              🛡️
            </div>
            <div>
              <h1 className="font-bold text-slate-900 tracking-tight">Platform Administration</h1>
              <p className="text-xs text-slate-500">System Governance & Audit Control</p>
            </div>
          </div>
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} 
            className="bg-slate-100 hover:bg-slate-200/80 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition border border-slate-200"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        
        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Teachers</p>
            <div className="flex items-baseline justify-between mt-3">
              <h2 className="text-2xl font-bold text-slate-900">{stats.teachers}</h2>
              <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">Seekers</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Providers</p>
            <div className="flex items-baseline justify-between mt-3">
              <h2 className="text-2xl font-bold text-slate-900">{stats.owners}</h2>
              <span className="text-xs text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">Owners</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Bookings</p>
            <div className="flex items-baseline justify-between mt-3">
              <h2 className="text-2xl font-bold text-emerald-600">{stats.bookings}</h2>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">Allocated</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Open Incidents</p>
            <div className="flex items-baseline justify-between mt-3">
              <h2 className="text-2xl font-bold text-rose-600">{incidents.length}</h2>
              <span className="text-xs text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-md">Attention</span>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="space-y-8">
            
            {/* PENDING VERIFICATIONS */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Pending Identity Verifications</h2>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md border border-amber-200/60 uppercase">
                  {pendingUsers.length} Action Needed
                </span>
              </div>

              {pendingUsers.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">All user accounts verified.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {pendingUsers.map(user => (
                    <div key={user.id} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{user.full_name}</p>
                          <p className="text-xs text-slate-500 capitalize">Role: {user.role}</p>
                        </div>
                        {user.id_card_url && (
                          <a 
                            href={user.id_card_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100"
                          >
                            🖼️ View ID Card
                          </a>
                        )}
                      </div>

                      <div className="flex gap-2.5">
                        <button 
                          onClick={() => handleVerify(user.id)} 
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-semibold transition shadow-xs"
                        >
                          Verify Account
                        </button>
                        <button 
                          className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-2 rounded-xl text-xs font-semibold transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* OPEN INCIDENTS */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Reported Damage & Incidents</h2>
                <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md border border-rose-200/60 uppercase">
                  {incidents.length} Unresolved
                </span>
              </div>

              {incidents.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">No open incident tickets reported.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {incidents.map(inc => (
                    <div key={inc.id} className="bg-rose-50/40 p-4 rounded-xl border border-rose-200/80 space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-900 text-sm">{inc.bookings?.resources?.name}</h3>
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">Open</span>
                      </div>
                      <p className="text-slate-500 text-xs">Reported by: <span className="text-slate-700 font-medium">{inc.profiles?.full_name}</span></p>
                      <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200/60">"{inc.description}"</p>
                      
                      <div className="pt-1">
                        <button 
                          onClick={() => resolveIncident(inc.id)} 
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                        >
                          Mark as Resolved
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* GLOBAL AUDIT TRAIL */}
          <div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs h-full max-h-[750px] flex flex-col">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h2 className="text-base font-bold text-slate-900">Global Audit Log</h2>
                <p className="text-xs text-slate-500">Real-time system events and transaction records</p>
              </div>

              <div className="overflow-y-auto space-y-3 pr-1 flex-grow">
                {logs.map(log => (
                  <div key={log.id} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-indigo-600 text-xs">{log.action.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-600 text-xs">Actor: <span className="font-medium text-slate-800">{log.profiles?.full_name || 'System Automated'}</span></p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}