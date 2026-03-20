import { useApolloClient, useMutation } from '@apollo/client/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLogo } from '../components/ui/AppLogo'
import { Input } from '../components/ui/Input'
import { ServerError } from '../components/ui/ServerError'
import { Spinner } from '../components/ui/Spinner'
import { AuthLayout } from '../components/layout/AuthLayout'
import { REGISTER_MUTATION } from '../graphql/auth.mutations'
import { useAuth } from '../lib/auth-context'
import type { RegisterFormErrors, RegisterFormState, RegisterResult } from '../types/auth.types'

function validate(values: RegisterFormState): RegisterFormErrors {
  const errors: RegisterFormErrors = {}
  if (!values.email) errors.email = 'Email is required'
  else if (!/\S+@\S+\.\S+/.test(values.email)) errors.email = 'Enter a valid email'
  if (!values.password) errors.password = 'Password is required'
  else if (values.password.length < 8) errors.password = 'Password must be at least 8 characters'
  if (!values.confirmPassword) errors.confirmPassword = 'Please confirm your password'
  else if (values.password !== values.confirmPassword) errors.confirmPassword = 'Passwords do not match'
  return errors
}

export function RegisterPage() {
  const navigate     = useNavigate()
  const { login }    = useAuth()
  const apolloClient = useApolloClient()

  const [role, setRole]               = useState<'CUSTOMER' | 'AGENT'>('CUSTOMER')
  const [values, setValues]           = useState<RegisterFormState>({ email: '', password: '', confirmPassword: '' })
  const [errors, setErrors]           = useState<RegisterFormErrors>({})
  const [serverError, setServerError] = useState('')

  const [registerMutation, { loading }] = useMutation<RegisterResult>(REGISTER_MUTATION, {
    onCompleted: async (data) => {
      login(data.register.accessToken, data.register.user)
      await apolloClient.resetStore()
      navigate('/rooms')
    },
    onError(err) { setServerError(err.message) },
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setValues(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: undefined }))
    setServerError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validation = validate(values)
    if (Object.keys(validation).length > 0) { setErrors(validation); return }
    registerMutation({ variables: { input: { email: values.email, password: values.password, role } } })
  }

  return (
    <AuthLayout>
      <div className="animate-fade-up">
        <div className="mb-8">
          <AppLogo />
          <h1 className="text-2xl font-semibold text-ink mb-1">Create an account</h1>
          <p className="text-sm text-ink-muted">Get started with CRM Chat</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Email"            name="email"           type="email"    placeholder="you@example.com"  value={values.email}           onChange={handleChange} error={errors.email}           autoComplete="email"        autoFocus />
          <Input label="Password"         name="password"        type="password" placeholder="Min. 8 characters" value={values.password}        onChange={handleChange} error={errors.password}        autoComplete="new-password" />
          <Input label="Confirm Password" name="confirmPassword" type="password" placeholder="••••••••"          value={values.confirmPassword} onChange={handleChange} error={errors.confirmPassword} autoComplete="new-password" />

          <ServerError message={serverError} />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wider">I am a</label>
            <div className="flex gap-2">
              {(['CUSTOMER', 'AGENT'] as const).map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    role === r ? 'bg-accent text-surface border-accent' : 'border-zinc-700 text-ink-muted hover:border-zinc-600'
                  }`}
                >
                  {r === 'CUSTOMER' ? 'Customer' : 'Agent'}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? <span className="flex items-center justify-center gap-2"><Spinner /> Creating account...</span> : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:text-accent-dim transition-colors">Sign in</Link>
        </p>
      </div>
    </AuthLayout>
  )
}
