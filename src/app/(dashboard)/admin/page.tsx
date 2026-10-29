'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [verifiedUsers, setVerifiedUsers] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [stats, setStats] = useState({ teachers: 0, owners: 0, bookings: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const loadData = async () => {
    // 1. Fetch Users
    const { data: allUsers } = await supabase.from('profiles').select('*')
    if (allUsers) {
      setPendingUsers(allUsers.filter(u => u.verification_status === 'pending'))
      setVerifiedUsers(allUsers.filter(u => u.verification_status === 'verified' && u.role !== 'admin'))
      setStats({
        teachers: allUsers.filter(u => u.role === 'teacher').length,
        owners: allUsers.filter(u => u.role === 'owner').length,
        bookings: 0 // Will fill below
      })
    }

    // 2. Fetch Bookings Count
    const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true })
    setStats(prev => ({ ...prev, bookings: count || 0 }))

    // 3. Fetch Incidents
    const { data: incData } = await supabase.from('incidents').select('*, bookings(id, resources(name)), profiles(full_name)').eq('status', 'open')
    if (incData) setIncidents(incData)

    // 4. Fetch Audit Logs WITH Names
    const { data: logData } = await supabase
      .from('audit_logs')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(20)
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

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', backgroundColor: '#0f172a', height: '100vh', color: 'white' }}><span className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></span></div>

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white' }}>
      
      <nav style={{ backgroundColor: '#1e293b', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#f87171' }}>🛡️ Platform Admin</h1>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
      </nav>

      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* PLATFORM STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <p style={{ margin: '0 0 5px 0', color: '#94a3b8', fontSize: '14px' }}>Total Teachers</p>
            <h2 style={{ margin: 0, fontSize: '28px' }}>{stats.teachers}</h2>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <p style={{ margin: '0 0 5px 0', color: '#94a3b8', fontSize: '14px' }}>Total Providers</p>
            <h2 style={{ margin: 0, fontSize: '28px' }}>{stats.owners}</h2>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <p style={{ margin: '0 0 5px 0', color: '#94a3b8', fontSize: '14px' }}>Total Bookings</p>
            <h2 style={{ margin: 0, fontSize: '28px' }}>{stats.bookings}</h2>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <p style={{ margin: '0 0 5px 0', color: '#94a3b8', fontSize: '14px' }}>Open Incidents</p>
            <h2 style={{ margin: 0, fontSize: '28px', color: '#f87171' }}>{incidents.length}</h2>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* VERIFICATIONS */}
            <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
              <h2 style={{ marginTop: 0, color: '#fcd34d', fontSize: '18px' }}>Pending Verifications</h2>
              {pendingUsers.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>No pending verifications.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {pendingUsers.map(user => (
                    <div key={user.id} style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                      <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{user.full_name} <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>({user.role})</span></p>
                      {user.id_card_url && <a href={user.id_card_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontSize: '13px' }}>🖼️ View ID Document</a>}
                      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                        <button onClick={() => handleVerify(user.id)} style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', flex: 1, fontWeight: 'bold' }}>Verify</button>
                        <button style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', flex: 1, fontWeight: 'bold' }}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* INCIDENTS */}
            <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
              <h2 style={{ marginTop: 0, color: '#f87171', fontSize: '18px' }}>Damage Reports</h2>
              {incidents.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>No open incidents.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {incidents.map(inc => (
                    <div key={inc.id} style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                      <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{inc.bookings?.resources?.name}</p>
                      <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#94a3b8' }}>Reported by: {inc.profiles?.full_name}</p>
                      <p style={{ margin: '0 0 15px 0', fontSize: '14px' }}>"{inc.description}"</p>
                      <button onClick={() => resolveIncident(inc.id)} style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Mark Resolved</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* GLOBAL AUDIT TRAIL */}
            <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155', maxHeight: '600px', overflowY: 'auto' }}>
              <h2 style={{ marginTop: 0, color: '#93c5fd', fontSize: '18px' }}>Global Audit Trail</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {logs.map(log => (
                  <div key={log.id} style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '15px', fontSize: '13px' }}>
                    <strong style={{ color: '#93c5fd' }}>{log.action.replace('_', ' ')}</strong>
                    <p style={{ margin: '4px 0', color: '#e2e8f0' }}>By: {log.profiles?.full_name || 'System'}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* VERIFICATION HISTORY */}
            <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
              <h2 style={{ marginTop: 0, color: '#a7f3d0', fontSize: '18px' }}>Verified Network</h2>
              <div style={{ display: 'grid', gap: '10px' }}>
                {verifiedUsers.map(u => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#0f172a', borderRadius: '6px', fontSize: '13px' }}>
                    <span>{u.full_name}</span>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ {u.role.toUpperCase()}</span>
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