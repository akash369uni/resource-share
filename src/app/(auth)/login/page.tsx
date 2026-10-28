'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (isSignUp) {
      // Sign Up
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })
      if (error) setMessage(error.message)
      else {
        setMessage('Account created! You can now log in.')
        setIsSignUp(false)
      }
    } else {
      // Log In
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) setMessage(error.message)
      else router.push('/dashboard') // We will create this page next
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
          {isSignUp ? 'Create an Account' : 'Welcome Back'}
        </h1>
        
        {message && <p style={{ color: 'red', marginBottom: '10px', fontSize: '14px' }}>{message}</p>}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isSignUp && (
            <input 
              type="text" 
              placeholder="Full Name" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              required
              style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }}
            />
          )}
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
            style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
            style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: '10px', backgroundColor: '#000', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }} 
            style={{ color: 'blue', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  )
}