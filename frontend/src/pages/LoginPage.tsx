import { useApolloClient, useMutation } from '@apollo/client/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLogo } from '../components/ui/AppLogo'
import { Input } from '../components/ui/Input'
import { ServerError } from '../components/ui/ServerError'
import { Spinner } from '../components/ui/Spinner'
import { AuthLayout } from '../components/layout/AuthLayout'
import { LOGIN_MUTATION } from '../graphql/auth.mutations'
import { useAuth } from '../lib/auth-context'
import type { LoginFormErrors, LoginFormState, LoginResult } from '../types/auth.types'

function validate(values: LoginFormState): LoginFormErrors {
  const errors: LoginFormErrors = {}
  if (!values.email) errors.email = 'Email is required'
  else if (!/\S+@\S+\.\S+/.test(values.email)) errors.email = 'Enter a valid email'
  if (!values.password) errors.password = 'Password is required'
  return errors
}

export function LoginPage() {
  const { login }      = useAuth()
  const navigate       = useNavigate()
  const apolloClient   = useApolloClient()

  const [values, setValues]           = useState<LoginFormState>({ email: '', password: '' })
  const [errors, setErrors]           = useState<LoginFormErrors>({})
  const [serverError, setServerError] = useState('')

  const [loginMutation, { loading }] = useMutation<LoginResult>(LOGIN_MUTATION, {
    onCompleted: async (data) => {
      login(data.login.accessToken, data.login.user)
      await apolloClient.resetStore()
      navigate('/rooms')
    },
    onError(err) {
      setServerError(err.message)
    },
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
    loginMutation({ variables: { input: values } })
  }

  return (
    <AuthLayout>
      <div className="animate-fade-up">
        <div className="mb-8">
          <AppLogo />
          <h1 className="text-2xl font-semibold text-ink mb-1">Welcome back</h1>
          <p className="text-sm text-ink-muted">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Email"    name="email"    type="email"    placeholder="you@example.com" value={values.email}    onChange={handleChange} error={errors.email}    autoComplete="email"            autoFocus />
          <Input label="Password" name="password" type="password" placeholder="••••••••"        value={values.password} onChange={handleChange} error={errors.password} autoComplete="current-password" />
          <ServerError message={serverError} />
          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? <span className="flex items-center justify-center gap-2"><Spinner /> Signing in...</span> : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent hover:text-accent-dim transition-colors">Sign up</Link>
        </p>
      </div>
    </AuthLayout>
  )
}
