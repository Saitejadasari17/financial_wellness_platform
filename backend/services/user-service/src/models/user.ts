
export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  monthly_income: number;
  age: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  id: string;
  user_id: string;
  phone: string | null;
  city: string | null;
  occupation: string | null;
  risk_tolerance: 'low' | 'moderate' | 'high';
  created_at: Date;
}

// DTOs (Data Transfer Objects)
export interface CreateUserDTO {
  email: string;
  name: string;
  password: string;
  monthly_income?: number;
  age?: number;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  monthlyIncome: number;
  age: number | null;
  createdAt: Date;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}
