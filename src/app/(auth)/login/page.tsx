'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [idCardFile, setIdCardFile] = useState<File | null>(null) // New state for the image
  const [role, setRole] = useState('teacher') 
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    // VALIDATION
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      setLoading(false); return;
    }

    if (isSignUp) {
      if (fullName.trim().length < 3) {
        setMessage('Please enter your full name.')
        setLoading(false); return;
      }
      if (!/^\d{10}$/.test(phone)) {
        setMessage('Phone number must be exactly 10 digits.')
        setLoading(false); return;
      }
      if (idNumber.trim().length < 5) {
        setMessage('Please enter a valid Official ID.')
        setLoading(false); return;
      }
      if (!idCardFile) {
        setMessage('Please upload a photo of your ID card.')
        setLoading(false); return;
      }

      // 1. Sign up Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email, 
        password, 
        options: { data: { full_name: fullName } },
      })
      
      if (authError) {
        setMessage(authError.message)
        setLoading(false); return;
      } 
      
      if (authData.user) {
        // 2. Upload the ID Image
        setMessage('Uploading ID photo...')
        const fileExt = idCardFile.name.split('.').pop()
        const fileName = `${authData.user.id}-id.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('identity_docs')
          .upload(fileName, idCardFile)

        if (uploadError) {
          setMessage(`Image upload failed: ${uploadError.message}`)
          setLoading(false); return;
        }

        // 3. Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('identity_docs')
          .getPublicUrl(fileName)

        // 4. Update Profile (The trigger already created the basic profile)
        await supabase.from('profiles').update({
          phone: phone,
          id_number: idNumber,
          id_card_url: publicUrl,
          role: role,
        }).eq('id', authData.user.id)
        
        setMessage('Registration successful! Admin verification pending. Please log in.')
        setIsSignUp(false)
        setPassword('')
        setIdCardFile(null)
      }
    } else {
      // Login
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        setMessage(error.message)
      } else if (authData.user) {
        const { data: profile } = await supabase.from('profiles').select('role, verification_status').eq('id', authData.user.id).single()
        
        if (profile?.role === 'admin') router.push('/admin')
        else if (profile?.verification_status !== 'verified') router.push('/pending-verification')
        else if (profile?.role === 'owner') router.push('/owner')
        else router.push('/dashboard')
      }
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '450px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
          {isSignUp ? 'Register Account' : 'Welcome Back'}
        </h1>
        
        {message && <p style={{ color: message.includes('successful') ? 'green' : 'red', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>{message}</p>}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isSignUp && (
            <>
              <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <input type="tel" placeholder="Contact Number (10 digits)" value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <input type="text" placeholder="Official ID (Govt / Emp ID)" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: '#555', fontWeight: 'bold' }}>Upload ID Card Photo (JPG/PNG)</label>
                <input type="file" accept="image/*" onChange={(e) => setIdCardFile(e.target.files?.[0] || null)} required style={{ padding: '8px', border: '1px dashed #ccc', borderRadius: '6px', fontSize: '14px' }} />
              </div>

              <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '6px', backgroundColor: 'white' }}>
                <option value="teacher">I am a Teacher (Seeker)</option>
                <option value="owner">I am an Institution Owner (Provider)</option>
              </select>
            </>
          )}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} />
          <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} />
          
          <button type="submit" disabled={loading} style={{ padding: '12px', backgroundColor: '#000', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }} style={{ color: 'blue', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  )
}