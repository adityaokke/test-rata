interface AuthPayload {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: "CUSTOMER" | "AGENT";
    createdAt: string;
  };
}


export interface LoginResult {
  login: AuthPayload;
}

export interface LoginFormState {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

export interface RegisterResult {
  register: AuthPayload;
}

export interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}