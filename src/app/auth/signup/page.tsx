'use client'

import { useState } from 'react'
import { signup } from '../actions'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/components/Logo'
import '../auth.css'

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const result = await signup(formData)

    if (result?.error) {
      toast.error(result.error)
      setIsLoading(false)
    } else {
      toast.success('Account created! Welcome to Divid-o.')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-wrapper">
            <Image 
              src="/logo.png" 
              alt="Divid-o Logo" 
              width={120} 
              height={120} 
              className="auth-full-logo"
              priority
            />
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join Divid-o to start splitting</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="firstName">First Name</label>
              <input 
                className="form-input" 
                type="text" 
                id="firstName" 
                name="firstName" 
                placeholder="John" 
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lastName">Last Name</label>
              <input 
                className="form-input" 
                type="text" 
                id="lastName" 
                name="lastName" 
                placeholder="Doe" 
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input 
              className="form-input" 
              type="email" 
              id="email" 
              name="email" 
              placeholder="you@example.com" 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input 
              className="form-input" 
              type="password" 
              id="password" 
              name="password" 
              placeholder="••••••••" 
              required 
            />
          </div>

          <button className="auth-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? 
          <Link href="/auth/login" className="auth-link">Log In</Link>
        </div>
      </div>
    </div>
  )
}
