'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PendingVerification() {
  const router = useRouter()
  const supabase = createClient()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#fffbeb', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ color: '#92400e', marginBottom: '10px' }}>⏳ Verification Pending</h1>
        <p style={{ color: '#555', marginBottom: '20px' }}>Your account is pending Admin verification. The Admin must verify your ID and contact details before you can access the platform.</p>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ padding: '10px 20px', backgroundColor: '#000', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
      </div>
    </div>
  )
}