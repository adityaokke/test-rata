import { useApolloClient, useMutation } from "@apollo/client/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "../components/ui/Input";
import { REGISTER_MUTATION } from "../graphql/auth.mutations";
import { useAuth } from "../lib/auth-context";

interface RegisterResult {
  register: {
    accessToken: string;
    user: { id: string; email: string; createdAt: string };
  };
}

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function validate(values: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!values.email) errors.email = "Email is required";
  else if (!/\S+@\S+\.\S+/.test(values.email))
    errors.email = "Enter a valid email";
  if (!values.password) errors.password = "Password is required";
  else if (values.password.length < 8)
    errors.password = "Password must be at least 8 characters";
  if (!values.confirmPassword)
    errors.confirmPassword = "Please confirm your password";
  else if (values.password !== values.confirmPassword)
    errors.confirmPassword = "Passwords do not match";
  return errors;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const apolloClient = useApolloClient();

  const [values, setValues] = useState<FormState>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");

  const [registerMutation, { loading }] = useMutation<RegisterResult>(
    REGISTER_MUTATION,
    {
      onCompleted: async (data) => {
        login(data.register.accessToken, data.register.user);
        await apolloClient.resetStore(); // ← add this
        navigate("/rooms");
      },
      onError(err) {
        setServerError(err.message);
      },
    },
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setServerError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validate(values);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    registerMutation({
      variables: {
        input: { email: values.email, password: values.password },
      },
    });
  }

  return (
    <AuthLayout>
      <div className="animate-fade-up">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <div className="w-3 h-3 rounded-sm bg-surface" />
            </div>
            <span className="font-medium text-sm tracking-tight">CRM Chat</span>
          </div>
          <h1 className="text-2xl font-semibold text-ink mb-1">
            Create an account
          </h1>
          <p className="text-sm text-ink-muted">Get started with CRM Chat</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={handleChange}
            error={errors.email}
            autoComplete="email"
            autoFocus
          />
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Min. 8 characters"
            value={values.password}
            onChange={handleChange}
            error={errors.password}
            autoComplete="new-password"
          />
          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={values.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          {serverError && (
            <div className="bg-red-950/50 border border-danger/30 rounded-xl px-4 py-3 animate-fade-in">
              <p className="text-sm text-danger">{serverError}</p>
            </div>
          )}

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Creating account...
              </span>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-ink-muted mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-accent hover:text-accent-dim transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#6ee7b7 1px, transparent 1px), linear-gradient(90deg, #6ee7b7 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="card p-8">{children}</div>
      </div>
    </div>
  );
}
