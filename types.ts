
export interface School {
  id: string;
  name: string;
  username?: string;
  password?: string;
}

export interface Sport {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
}

export interface UserSession {
  schoolId: string;
  schoolName: string;
  isLoggedIn: boolean;
  isAdmin?: boolean;
}

export interface RegistrationRecord {
  sportId: string;
  schoolId: string;
  registeredAt: string;
}
