
export interface School {
  id: string;
  name: string;
  username?: string;
  password?: string;
  responsibleSport?: string; // สนามกีฬา / ชนิดกีฬาที่รับผิดชอบ (เช่น "ฟุตบอล, วอลเลย์บอล")
  responsibleSports?: string[]; // รายการชนิดกีฬาที่รับผิดชอบ
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
  responsibleSport?: string; // สนามกีฬา / ชนิดกีฬาที่รับผิดชอบ (เช่น "ฟุตบอล, วอลเลย์บอล")
  responsibleSports?: string[];
}

export function parseResponsibleSports(value?: string | string[]): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(s => String(s).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export function formatResponsibleSports(sports: string[]): string {
  // กรองค่าว่างและค่าซ้ำ
  const unique = Array.from(new Set(sports.map(s => s.trim()).filter(Boolean)));
  return unique.join(', ');
}

export interface Athlete {
  id?: string;
  prefix: string;
  firstName: string;
  lastName: string;
  ageGroup: string;
  athleticsEvent?: string;
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
  rank3SchoolId2?: string; // อันดับ 3 ร่วม (เหรียญทองแดง)
  rank3SchoolName2?: string;
  isPublished?: boolean;
  certStartNo?: string; // เลขที่เกียรติบัตรเริ่มต้น
  certEndNo?: string;   // เลขที่เกียรติบัตรสิ้นสุด
  certTemplate?: string; // เทมเพลตเกียรติบัตร (Base64) - ยังคงไว้เพื่อความเข้ากันได้ แต่อาจไม่ได้ใช้จากจุดนี้
}

export interface MedalStanding {
  schoolId: string;
  schoolName: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
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
