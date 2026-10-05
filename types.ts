
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

export interface Coach {
  prefix: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  ageGroup?: string;
  athleticsEvent?: string;
}

export function extractCoachesFromAthletes(athletes: Athlete[]): Coach[] {
  const map = new Map<string, Coach>();
  if (!Array.isArray(athletes)) return [];

  athletes.forEach((ath: any) => {
    // ผู้ฝึกสอน 1
    const c1First = (ath.coach1First || ath.coach1_firstName || '').toString().trim();
    if (c1First) {
      const p = (ath.coach1Prefix || ath.coach1_prefix || '').toString().trim();
      const l = (ath.coach1Last || ath.coach1_lastName || '').toString().trim();
      const fullName = `${p}${c1First} ${l}`.trim();
      if (fullName && !map.has(fullName)) {
        map.set(fullName, { 
          prefix: p, 
          firstName: c1First, 
          lastName: l, 
          fullName, 
          phone: ath.coach1Phone || '',
          ageGroup: ath.ageGroup || '',
          athleticsEvent: ath.athleticsEvent || ''
        });
      }
    }

    // ผู้ฝึกสอน 2
    const c2First = (ath.coach2First || ath.coach2_firstName || '').toString().trim();
    if (c2First) {
      const p = (ath.coach2Prefix || ath.coach2_prefix || '').toString().trim();
      const l = (ath.coach2Last || ath.coach2_lastName || '').toString().trim();
      const fullName = `${p}${c2First} ${l}`.trim();
      if (fullName && !map.has(fullName)) {
        map.set(fullName, { 
          prefix: p, 
          firstName: c2First, 
          lastName: l, 
          fullName, 
          phone: ath.coach2Phone || '',
          ageGroup: ath.ageGroup || '',
          athleticsEvent: ath.athleticsEvent || ''
        });
      }
    }

    // ผู้ฝึกสอน 3
    const c3First = (ath.coach3First || ath.coach3_firstName || '').toString().trim();
    if (c3First) {
      const p = (ath.coach3Prefix || ath.coach3_prefix || '').toString().trim();
      const l = (ath.coach3Last || ath.coach3_lastName || '').toString().trim();
      const fullName = `${p}${c3First} ${l}`.trim();
      if (fullName && !map.has(fullName)) {
        map.set(fullName, { 
          prefix: p, 
          firstName: c3First, 
          lastName: l, 
          fullName, 
          phone: ath.coach3Phone || '',
          ageGroup: ath.ageGroup || '',
          athleticsEvent: ath.athleticsEvent || ''
        });
      }
    }
  });

  return Array.from(map.values());
}

export interface CompetitionResult {
  id: string;
  sportId: string;
  sportName: string;
  ageGroup: string;
  athleticsEvent: string;
  rank1SchoolId: string;
  rank1SchoolName: string;
  rank1AthleteName?: string; // ชื่อนักเรียนที่ได้รับเหรียญทอง
  rank2SchoolId: string;
  rank2SchoolName: string;
  rank2AthleteName?: string; // ชื่อนักเรียนที่ได้รับเหรียญเงิน
  rank3SchoolId: string;
  rank3SchoolName: string;
  rank3AthleteName?: string; // ชื่อนักเรียนที่ได้รับเหรียญทองแดง
  rank3SchoolId2?: string; // อันดับ 3 ร่วม (เหรียญทองแดง)
  rank3SchoolName2?: string;
  rank3AthleteName2?: string; // ชื่อนักเรียนที่ได้รับเหรียญทองแดง (ร่วม)
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
