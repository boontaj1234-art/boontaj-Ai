
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
  rulesPdf?: string; // Base64 encoded PDF string
}

export interface SportType {
  id: string;
  name: string;
  description: string;
  certTemplate?: string;
  rulesPdf?: string; // Base64 encoded PDF string
}

export interface AthleticsEvent {
  id: string;
  eventNo: string;
  name: string;
  description: string;
}

export interface AgeGroup {
  id: string;
  age: string;
  gender: string;
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

export interface SchoolProfile {
  schoolId: string;
  directorName: string;
  schoolColors: string;
  staffCount: string;
  motto: string;
  phoneNumber: string;
  logo: string;
}

export interface Athlete {
  id?: string;
  prefix: string;
  firstName: string;
  lastName: string;
  ageGroup: string;
  avatar: string;
  coach1Prefix: string;
  coach1First: string;
  coach1Last: string;
  coach1Phone: string;
  coach2Prefix: string;
  coach2First: string;
  coach2Last: string;
  coach2Phone: string;
  coach3Prefix: string;
  coach3First: string;
  coach3Last: string;
  coach3Phone: string;
}

export interface CompetitionResult {
  id: string;
  sportId: string;
  sportName: string;
  ageGroup: string;
  athleticsEvent: string;
  rank1SchoolId: string;
  rank1SchoolName: string;
  rank2SchoolId: string;
  rank2SchoolName: string;
  rank3SchoolId: string;
  rank3SchoolName: string;
  isPublished?: boolean;
  certStartNo?: string; // เลขที่เกียรติบัตรเริ่มต้น
  certEndNo?: string;   // เลขที่เกียรติบัตรสิ้นสุด
  certTemplate?: string; // เทมเพลตเกียรติบัตร (Base64) - ยังคงไว้เพื่อความเข้ากันได้ แต่อาจไม่ได้ใช้จากจุดนี้
}

export interface FeedbackRecord {
  id: string;
  schoolId: string;
  schoolName: string;
  type: string;
  subject: string;
  details: string;
  status: string;
  timestamp: string;
  reply?: string;
  repliedAt?: string;
}
