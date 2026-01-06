
export interface School {
  id: string;
  name: string;
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
}

export interface RegistrationRecord {
  sportId: string;
  schoolId: string;
  registeredAt: string;
}
