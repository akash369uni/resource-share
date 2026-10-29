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
  const [idCardFile, setIdCardFile] = useState<File | null>(null)
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

    if (password.length < 6) { setMessage('Password must be at least 6 characters.'); setLoading(false); return; }

    if (isSignUp) {
      if (fullName.trim().length < 3) { setMessage('Please enter your full name.'); setLoading(false); return; }
      if (!/^\d{10}$/.test(phone)) { setMessage('Phone number must be exactly 10 digits.'); setLoading(false); return; }
      if (idNumber.trim().length < 5) { setMessage('Please enter a valid Official ID.'); setLoading(false); return; }
      if (!idCardFile) { setMessage('Please upload a photo of your ID card.'); setLoading(false); return; }

      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      
      if (authError) {
        setMessage(authError.message)
      } else if (authData.user) {
        setMessage('Uploading ID photo...')
        const fileExt = idCardFile.name.split('.').pop()
        const fileName = `${authData.user.id}-id.${fileExt}`
        
        const { error: uploadError } = await supabase.storage.from('identity_docs').upload(fileName, idCardFile)
        if (uploadError) { setMessage(`Image upload failed: ${uploadError.message}`); setLoading(false); return; }

        const { data: { publicUrl } } = supabase.storage.from('identity_docs').getPublicUrl(fileName)

        await supabase.from('profiles').update({
          phone: phone, id_number: idNumber, id_card_url: publicUrl, role: role,
        }).eq('id', authData.user.id)
        
        setMessage('Registration successful! Admin verification pending. Please log in.')
        setIsSignUp(false); setPassword(''); setIdCardFile(null)
      }
    } else {
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
    <div className="min-h-screen bg-slate-50/80 flex justify-center items-center p-4 font-sans text-slate-900">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-200/80 w-full max-w-md space-y-6">
        
        {/* BRAND LOGO / HEADER */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-600/20">
            🏫
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isSignUp ? 'Create an Account' : 'Welcome Back'}
          </h1>
          <p className="text-xs text-slate-500">
            {isSignUp ? 'Register to access resource allocations' : 'Enter your credentials to access your portal'}
          </p>
        </div>
        
        {message && (
          <div className={`p-3.5 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
            message.includes('successful') || message.includes('success') 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <span>{message.includes('successful') ? '✨' : '⚠️'}</span>
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  required 
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition" 
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Contact Number</label>
                <input 
                  type="tel" 
                  placeholder="10-digit mobile number" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition" 
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Official ID Number</label>
                <input 
                  type="text" 
                  placeholder="Govt / Employee ID" 
                  value={idNumber} 
                  onChange={(e) => setIdNumber(e.target.value)} 
                  required 
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition" 
                />
              </div>
              
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Official ID Card Photo</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setIdCardFile(e.target.files?.[0] || null)} 
                  required 
                  className="w-full p-2.5 border border-dashed border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-500 cursor-pointer" 
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Account Role</label>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)} 
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="teacher">Teacher (Resource Seeker)</option>
                  <option value="owner">Institution Owner (Resource Provider)</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Email Address</label>
            <input 
              type="email" 
              placeholder="name@institution.edu" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition" 
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Password</label>
            <input 
              type="password" 
              placeholder="At least 6 characters" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition" 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition shadow-sm shadow-indigo-600/20 mt-2"
          >
            {loading ? 'Processing...' : isSignUp ? 'Complete Registration' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }} 
            className="text-indigo-600 font-bold hover:underline"
          >
            {isSignUp ? 'Log In' : 'Create Account'}
          </button>
        </div>

      </div>
    </div>
  )
}