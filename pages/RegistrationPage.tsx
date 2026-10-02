
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ICON_MAP, SCRIPT_URL } from '../constants';
import { Sport, Athlete, AgeGroup, SchoolProfile, AthleticsEvent } from '../types';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Search, 
  Loader2, 
  Save, 
  Trophy, 
  AlertCircle, 
  Users, 
  Camera, 
  UserPlus, 
  Briefcase, 
  Calendar, 
  XCircle, 
  Phone, 
  RefreshCw,
  Trophy as TrophyIcon,
  UserCheck,
  FileText,
  Trash2,
  AlertTriangle,
  ClipboardList,
  Info,
  Layers,
  ChevronRight
} from 'lucide-react';

declare var Swal: any;

interface RegistrationPageProps {
  onBack: () => void;
  schoolName: string;
  schoolId: string;
}

interface RegisteredCategorySummary {
  ageGroup: string;
  athleticsEvent: string;
  athleteCount: number;
  athletes: Athlete[];
}

const PREFIXES_ATHLETE = ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว'];
const PREFIXES_COACH = ['นาย', 'นาง', 'นางสาว'];

const emptyAthlete = (): Athlete => ({
  prefix: 'เด็กชาย',
  firstName: '',
  lastName: '',
  ageGroup: '',
  avatar: '',
  coach1Prefix: 'นาย', coach1First: '', coach1Last: '', coach1Phone: '',
  coach2Prefix: 'นาย', coach2First: '', coach2Last: '', coach2Phone: '',
  coach3Prefix: 'นาย', coach3First: '', coach3Last: '', coach3Phone: ''
} as any);

const RegistrationPage: React.FC<RegistrationPageProps> = ({ onBack, schoolName, schoolId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sportsList, setSportsList] = useState<Sport[]>([]);
  const [registeredSports, setRegisteredSports] = useState<string[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [athleticsEvents, setAthleticsEvents] = useState<AthleticsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [selectedSportForAthletes, setSelectedSportForAthletes] = useState<Sport | null>(null);
  const [globalAgeGroup, setGlobalAgeGroup] = useState<string>('');
  const [selectedAthleticsEvent, setSelectedAthleticsEvent] = useState<string>('');
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [genderMismatch, setGenderMismatch] = useState(false);
  
  // ข้อมูลนักกีฬาทั้งหมดที่เคยลงทะเบียนไว้ในประเภทกีฬานี้
  const [allAthletesInCurrentSport, setAllAthletesInCurrentSport] = useState<Athlete[]>([]);
  const [isLoadingAllSportAthletes, setIsLoadingAllSportAthletes] = useState(false);

  const [maxAthletes, setMaxAthletes] = useState(12);
  const [maxCoaches, setMaxCoaches] = useState(3);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  
  const [coaches, setCoaches] = useState({
    coach1Prefix: 'นาย', coach1First: '', coach1Last: '', coach1Phone: '',
    coach2Prefix: 'นาย', coach2First: '', coach2Last: '', coach2Phone: '',
    coach3Prefix: 'นาย', coach3First: '', coach3Last: '', coach3Phone: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentAthleteIndex, setCurrentAthleteIndex] = useState<number | null>(null);

  const calculateMaxAthletes = (sportName: string, ageGroup: string, event: string): number => {
    const name = sportName.toLowerCase();
    if (name.includes('กรีฑา')) {
      if (event.includes('ผลัด')) return 5;
      if (ageGroup.includes('15')) return 2;
      return 1;
    }
    if (name.includes('ตะกร้อ')) return 5; 
    if (name.includes('ฟุตบอล')) return name.includes('7') ? 12 : 18;
    if (name.includes('ฟุตซอล') || name.includes('วอลเลย์บอล') || name.includes('แฮนด์บอล')) return 12;
    if (name.includes('เปตอง') || name.includes('เทเบิลเทนนิส')) return 4;
    return 12;
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [sportsRes, regRes, ageRes, profileRes] = await Promise.all([
          fetch(`${SCRIPT_URL}?action=getSports`),
          fetch(`${SCRIPT_URL}?action=getRegistrations&schoolId=${schoolId}`),
          fetch(`${SCRIPT_URL}?action=getAgeGroups`),
          fetch(`${SCRIPT_URL}?action=getSchoolProfile&schoolId=${schoolId}`)
        ]);
        const sportsData = await sportsRes.json();
        const regData = await regRes.json();
        const ageData = await ageRes.json();
        const profileData = await profileRes.json();
        if (Array.isArray(sportsData)) setSportsList(sportsData);
        if (Array.isArray(regData)) setRegisteredSports(regData);
        if (Array.isArray(ageData)) setAgeGroups(ageData);
        if (profileData && profileData.schoolId) setSchoolProfile(profileData);
      } catch (err: any) {
        console.error('Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [schoolId]);

  // สรุปรายการกีฬาและรุ่นอายุที่ลงทะเบียนแล้วในประเภทนี้
  const registeredCategories = useMemo<RegisteredCategorySummary[]>(() => {
    if (!selectedSportForAthletes || allAthletesInCurrentSport.length === 0) return [];
    const isAthletics = selectedSportForAthletes.name.includes('กรีฑา');
    const map = new Map<string, RegisteredCategorySummary>();

    allAthletesInCurrentSport.forEach(ath => {
      const age = (ath.ageGroup || '').trim();
      const ev = (ath.athleticsEvent || '').trim();
      if (!age) return;
      const key = isAthletics ? `${age}___${ev}` : age;

      if (!map.has(key)) {
        map.set(key, {
          ageGroup: age,
          athleticsEvent: ev,
          athleteCount: 0,
          athletes: []
        });
      }
      const entry = map.get(key)!;
      entry.athleteCount += 1;
      entry.athletes.push(ath);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.ageGroup !== b.ageGroup) return a.ageGroup.localeCompare(b.ageGroup);
      return a.athleticsEvent.localeCompare(b.athleticsEvent);
    });
  }, [selectedSportForAthletes, allAthletesInCurrentSport]);

  // ตรวจสอบความสอดคล้องของเพศ
  useEffect(() => {
    if (globalAgeGroup && selectedAthleticsEvent && selectedSportForAthletes?.name.includes('กรีฑา')) {
      const isFemaleAge = globalAgeGroup.includes('หญิง');
      const isMaleAge = globalAgeGroup.includes('ชาย') && !globalAgeGroup.includes('หญิง');
      const isFemaleEvent = selectedAthleticsEvent.includes('หญิง');
      const isMaleEvent = selectedAthleticsEvent.includes('ชาย') && !selectedAthleticsEvent.includes('หญิง');

      if ((isFemaleAge && isMaleEvent) || (isMaleAge && isFemaleEvent)) {
        setGenderMismatch(true);
      } else {
        setGenderMismatch(false);
      }
    } else {
      setGenderMismatch(false);
    }
  }, [globalAgeGroup, selectedAthleticsEvent, selectedSportForAthletes]);

  const filteredSports = sportsList.filter(sport => 
    sport.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ดึงข้อมูลนักกีฬาทั้งหมดในประเภทกีฬานี้ของโรงเรียน เพื่อใช้แสดงสถานะและตรวจสอบซ้ำ
  const fetchAllAthletesInSport = async (sportId: string) => {
    setIsLoadingAllSportAthletes(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?action=getAthletes&schoolId=${schoolId}&sportId=${sportId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllAthletesInCurrentSport(data);
        return data;
      }
      setAllAthletesInCurrentSport([]);
      return [];
    } catch (e) {
      console.error('Failed to fetch all athletes in sport:', e);
      setAllAthletesInCurrentSport([]);
      return [];
    } finally {
      setIsLoadingAllSportAthletes(false);
    }
  };

  const getExistingAthletesForCategory = (ageGroup: string, athleticsEvent: string, athleteList: Athlete[] = allAthletesInCurrentSport) => {
    const isAthletics = selectedSportForAthletes?.name.includes('กรีฑา');
    return athleteList.filter(a => {
      const matchAge = (a.ageGroup || '').trim() === (ageGroup || '').trim();
      if (isAthletics) {
        return matchAge && (a.athleticsEvent || '').trim() === (athleticsEvent || '').trim();
      }
      return matchAge;
    });
  };

  const isCurrentCategoryRegistered = (ageGroup: string, athleticsEvent: string, athleteList: Athlete[] = allAthletesInCurrentSport) => {
    return getExistingAthletesForCategory(ageGroup, athleticsEvent, athleteList).length > 0;
  };

  const checkAndWarnDuplicate = (ageGroup: string, eventValue: string, athleteList: Athlete[] = allAthletesInCurrentSport) => {
    if (!ageGroup) return;
    const existing = getExistingAthletesForCategory(ageGroup, eventValue, athleteList);
    if (existing.length > 0) {
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
        didOpen: (toast: any) => {
          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
      });
      Toast.fire({
        icon: 'info',
        title: 'รายการนี้เคยลงทะเบียนไว้แล้ว',
        text: `พบข้อมูลนักกีฬา ${existing.length} คนในระบบ (บันทึกเพื่ออัปเดตข้อมูลเดิม)`
      });
    }
  };

  const handleSelectRegisteredCategory = async (age: string, event: string) => {
    setGlobalAgeGroup(age);
    setSelectedAthleticsEvent(event);
    if (!selectedSportForAthletes) return;
    const newMax = calculateMaxAthletes(selectedSportForAthletes.name, age, event);
    setMaxAthletes(newMax);
    fetchAthleteData(age, event, newMax);
  };

  const handleGlobalAgeGroupChange = async (value: string) => {
    setGlobalAgeGroup(value);
    if (!selectedSportForAthletes) return;

    const newMax = calculateMaxAthletes(selectedSportForAthletes.name, value, selectedAthleticsEvent);
    setMaxAthletes(newMax);

    const isAthletics = selectedSportForAthletes.name.includes('กรีฑา');
    if (isAthletics) {
      if (value && selectedAthleticsEvent) {
        // จะดึงข้อมูลเฉพาะถ้าเพศตรงกัน
        if (!validateGenderMatch(value, selectedAthleticsEvent)) {
           resetToEmpty(newMax, value);
           return;
        }
        checkAndWarnDuplicate(value, selectedAthleticsEvent);
        fetchAthleteData(value, selectedAthleticsEvent, newMax);
      } else {
        resetToEmpty(newMax, value);
      }
    } else if (value) {
      checkAndWarnDuplicate(value, '');
      fetchAthleteData(value, '', newMax);
    } else {
      resetToEmpty(newMax, value);
    }
  };

  const handleAthleticsEventChange = async (eventValue: string) => {
    setSelectedAthleticsEvent(eventValue);
    if (!selectedSportForAthletes) return;

    const newMax = calculateMaxAthletes(selectedSportForAthletes.name, globalAgeGroup, eventValue);
    setMaxAthletes(newMax);

    if (globalAgeGroup && eventValue) {
      if (!validateGenderMatch(globalAgeGroup, eventValue)) {
         resetToEmpty(newMax, globalAgeGroup);
         return;
      }
      checkAndWarnDuplicate(globalAgeGroup, eventValue);
      fetchAthleteData(globalAgeGroup, eventValue, newMax);
    } else {
      resetToEmpty(newMax, globalAgeGroup);
    }
  };

  const validateGenderMatch = (ageGroup: string, event: string) => {
    const isFemaleAge = ageGroup.includes('หญิง');
    const isMaleAge = ageGroup.includes('ชาย') && !ageGroup.includes('หญิง');
    const isFemaleEvent = event.includes('หญิง');
    const isMaleEvent = event.includes('ชาย') && !event.includes('หญิง');
    return !((isFemaleAge && isMaleEvent) || (isMaleAge && isFemaleEvent));
  };

  const resetToEmpty = (currentMax: number, ageGroup: string) => {
    const dp = ageGroup.includes('หญิง') ? (ageGroup.includes('15') ? 'นางสาว' : 'เด็กหญิง') : (ageGroup.includes('15') ? 'นาย' : 'เด็กชาย');
    const resetAthletes = Array(currentMax).fill(null).map(() => {
      const ath = emptyAthlete();
      ath.prefix = dp;
      return ath;
    });
    setAthletes(resetAthletes);
    setCoaches({
      coach1Prefix: 'นาย', coach1First: '', coach1Last: '', coach1Phone: '',
      coach2Prefix: 'นาย', coach2First: '', coach2Last: '', coach2Phone: '',
      coach3Prefix: 'นาย', coach3First: '', coach3Last: '', coach3Phone: ''
    });
    setHasSavedData(false);
  };

  const fetchAthleteData = async (ageGroup: string, athleticsEvent: string, currentMax: number) => {
    if (!ageGroup) return;
    
    setIsRefreshing(true);
    try {
      let url = `${SCRIPT_URL}?action=getAthletes&schoolId=${schoolId}&sportId=${selectedSportForAthletes?.id}&ageGroup=${encodeURIComponent(ageGroup)}`;
      if (athleticsEvent) url += `&athleticsEvent=${encodeURIComponent(athleticsEvent)}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      const resetAthletes = Array(currentMax).fill(null).map(() => emptyAthlete());
      const dp = ageGroup.includes('หญิง') ? (ageGroup.includes('15') ? 'นางสาว' : 'เด็กหญิง') : (ageGroup.includes('15') ? 'นาย' : 'เด็กชาย');
      
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        setCoaches({
          coach1Prefix: first.coach1Prefix || 'นาย', coach1First: first.coach1First || '', coach1Last: first.coach1Last || '', coach1Phone: first.coach1Phone || '',
          coach2Prefix: first.coach2Prefix || 'นาย', coach2First: first.coach2First || '', coach2Last: first.coach2Last || '', coach2Phone: first.coach2Phone || '',
          coach3Prefix: first.coach3Prefix || 'นาย', coach3First: first.coach3First || '', coach3Last: first.coach3Last || '', coach3Phone: first.coach3Phone || ''
        });
        data.forEach((item, idx) => { 
          if (idx < currentMax) resetAthletes[idx] = { ...item }; 
        });
        setHasSavedData(true); // มีข้อมูลเดิมในระบบ
      } else {
        setCoaches({
          coach1Prefix: 'นาย', coach1First: '', coach1Last: '', coach1Phone: '',
          coach2Prefix: 'นาย', coach2First: '', coach2Last: '', coach2Phone: '',
          coach3Prefix: 'นาย', coach3First: '', coach3Last: '', coach3Phone: ''
        });
        resetAthletes.forEach(ath => {
          ath.prefix = dp;
        });
        setHasSavedData(false); // ไม่มีข้อมูลเดิม
      }
      setAthletes(resetAthletes);
    } catch (error) {
      console.error("Fetch athlete data error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleSport = async (id: string) => {
    if (processingId) return;
    const isCurrentlyRegistered = registeredSports.includes(id);
    if (isCurrentlyRegistered) {
      const result = await Swal.fire({
        title: 'ยกเลิกรายการ?',
        text: 'ข้อมูลนักกีฬาที่บันทึกไว้จะถูกลบออกทั้งหมด',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'ยืนยันยกเลิก',
        cancelButtonText: 'กลับ'
      });
      if (!result.isConfirmed) return;
    }
    const newRegisteredSports = isCurrentlyRegistered ? registeredSports.filter(s => s !== id) : [...registeredSports, id];
    setProcessingId(id);
    const items = newRegisteredSports.map(sid => ({ sportId: sid, sportName: sportsList.find(s => s.id === sid)?.name || '' }));
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveRegistration', data: { schoolId, schoolName, items } })
      });
      setRegisteredSports(newRegisteredSports);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteCurrentSet = async () => {
    const result = await Swal.fire({
      title: 'ลบข้อมูลชุดนี้?',
      text: `ต้องการลบข้อมูลนักกีฬาและผู้ฝึกสอนในรุ่น ${globalAgeGroup} ${selectedAthleticsEvent ? `(${selectedAthleticsEvent})` : ''} ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'ยืนยันลบข้อมูล',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        setIsSaving(true);
        Swal.fire({ title: 'กำลังลบข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            // ส่งอาร์เรย์ว่างไปทับข้อมูลเดิม
            await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                  action: 'saveAthletes',
                  data: { 
                    schoolId, 
                    schoolName, 
                    sportId: selectedSportForAthletes?.id, 
                    sportName: selectedSportForAthletes?.name, 
                    athleticsEvent: selectedAthleticsEvent, 
                    athletes: [], // อาร์เรย์ว่างเพื่อลบ
                    coaches: {
                        coach1Prefix: 'นาย', coach1First: '', coach1Last: '', coach1Phone: '',
                        coach2Prefix: 'นาย', coach2First: '', coach2Last: '', coach2Phone: '',
                        coach3Prefix: 'นาย', coach3First: '', coach3Last: '', coach3Phone: ''
                    }
                  }
                })
            });
            resetToEmpty(maxAthletes, globalAgeGroup);
            if (selectedSportForAthletes?.id) {
              await fetchAllAthletesInSport(selectedSportForAthletes.id);
            }
            Swal.fire({ icon: 'success', title: 'ลบข้อมูลเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });
        } catch (err) {
            Swal.fire('ผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
        } finally {
            setIsSaving(false);
        }
    }
  };

  const handleOpenAthleteRegistration = async (sport: Sport) => {
    setSelectedSportForAthletes(sport);
    setIsLoading(true);
    let initialAgeGroup = ageGroups.length > 0 ? `${ageGroups[0].age} (${ageGroups[0].gender})` : '';
    setGlobalAgeGroup(initialAgeGroup);
    setSelectedAthleticsEvent(''); 
    
    const initialMax = calculateMaxAthletes(sport.name, initialAgeGroup, '');
    setMaxAthletes(initialMax);
    
    // ตั้งค่าจำนวนผู้ฝึกสอนตามประเภทกีฬา
    const sportNameLower = sport.name.toLowerCase();
    const needsTwoCoaches = sportNameLower.includes('ตะกร้อ') || 
                           sportNameLower.includes('เปตอง') || 
                           sportNameLower.includes('เทเบิลเทนนิส') || 
                           sportNameLower.includes('กรีฑา');
    setMaxCoaches(needsTwoCoaches ? 2 : 3);
    
    try {
      // ดึงข้อมูลนักกีฬาทั้งหมดในกีฬานี้เพื่อแสดงสถานะรายการที่ลงทะเบียนแล้ว
      const allSportAthletes = await fetchAllAthletesInSport(sport.id);

      if (sport.name.includes('กรีฑา')) {
        const res = await fetch(`${SCRIPT_URL}?action=getAthleticsList`);
        setAthleticsEvents(await res.json());
        resetToEmpty(initialMax, initialAgeGroup);
      } else {
        await fetchAthleteData(initialAgeGroup, '', initialMax);
        if (allSportAthletes.some(a => (a.ageGroup || '').trim() === initialAgeGroup)) {
          checkAndWarnDuplicate(initialAgeGroup, '', allSportAthletes);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveAthletesRegistration = async () => {
    if (genderMismatch) {
        Swal.fire('ข้อมูลไม่สอดคล้อง', 'กรุณาเลือกรายการแข่งขันให้ตรงกับเพศของรุ่นอายุ', 'error');
        return;
    }
    if (!selectedSportForAthletes) return;
    if (!globalAgeGroup) {
        Swal.fire('คำแนะนำ', 'กรุณาเลือกรุ่นอายุก่อนบันทึกข้อมูล', 'warning');
        return;
    }
    if (selectedSportForAthletes.name.includes('กรีฑา') && !selectedAthleticsEvent) {
        Swal.fire('คำแนะนำ', 'กรุณาเลือกรายการกรีฑาก่อนบันทึกข้อมูล', 'warning');
        return;
    }

    const validAthletes = athletes.filter(a => a.firstName.trim() !== "");
    if (validAthletes.length === 0) { 
      Swal.fire('คำแนะนำ', 'กรุณากรอกข้อมูลนักกีฬาอย่างน้อย 1 รายชื่อ', 'warning'); 
      return; 
    }

    // 1. ตรวจสอบรายชื่อนักกีฬาซ้ำกันภายในชุดเดียวกัน
    const nameMap = new Map<string, number>();
    let duplicateName = '';
    for (const ath of validAthletes) {
      const full = `${ath.firstName.trim()} ${ath.lastName.trim()}`.toLowerCase();
      if (nameMap.has(full)) {
        duplicateName = `${ath.prefix}${ath.firstName} ${ath.lastName}`;
        break;
      }
      nameMap.set(full, 1);
    }

    if (duplicateName) {
      Swal.fire({
        icon: 'warning',
        title: 'พบรายชื่อนักกีฬาซ้ำกัน',
        text: `พบชื่อนักกีฬา "${duplicateName}" ซ้ำกันในชุดเดียวกัน กรุณาตรวจสอบและแก้ไขให้ถูกต้องก่อนบันทึก`,
        confirmButtonText: 'ตกลง'
      });
      return;
    }

    // 2. ตรวจสอบการลงทะเบียนซ้ำเดิมของรายการกีฬาและรุ่นอายุ (และรายการกรีฑา)
    const existingAthletes = getExistingAthletesForCategory(globalAgeGroup, selectedAthleticsEvent);
    if (existingAthletes.length > 0) {
      const isAth = selectedSportForAthletes.name.includes('กรีฑา');
      const confirmResult = await Swal.fire({
        title: 'แจ้งเตือน: มีการลงทะเบียนรายการนี้ไว้แล้ว!',
        html: `
          <div class="text-left text-sm space-y-2">
            <p class="text-slate-700">กีฬา: <b class="text-slate-900">${selectedSportForAthletes.name}</b></p>
            <p class="text-slate-700">รุ่นอายุ: <b class="text-blue-600">${globalAgeGroup}</b> ${isAth && selectedAthleticsEvent ? `<br/>รายการแข่งขัน: <b class="text-orange-600">${selectedAthleticsEvent}</b>` : ''}</p>
            <div class="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-amber-900 text-xs mt-3">
              ⚠️ <b>เคยลงทะเบียนไว้แล้วในระบบ (${existingAthletes.length} คน)</b><br/>
              การกดยืนยันจะเป็นการบันทึกทับ/อัปเดตข้อมูลชุดเดิมด้วยรายชื่อชุดใหม่ (${validAthletes.length} คน)
            </div>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ยืนยันบันทึกทับข้อมูลเดิม',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#94a3b8'
      });

      if (!confirmResult.isConfirmed) {
        return;
      }
    }
    
    setIsSaving(true);
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
      const athletesWithDetails = validAthletes.map(ath => ({
        ...ath,
        ageGroup: globalAgeGroup,
        athleticsEvent: selectedAthleticsEvent
      }));

      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveAthletes',
          data: { 
            schoolId, 
            schoolName, 
            sportId: selectedSportForAthletes.id, 
            sportName: selectedSportForAthletes.name, 
            athleticsEvent: selectedAthleticsEvent, 
            athletes: athletesWithDetails,
            coaches: coaches 
          }
        })
      });
      await fetchAllAthletesInSport(selectedSportForAthletes.id);
      setHasSavedData(true);
      Swal.fire({ 
        icon: 'success', 
        title: 'บันทึกสำเร็จ', 
        text: `บันทึกข้อมูลนักกีฬา ${selectedSportForAthletes.name} ${globalAgeGroup} เรียบร้อยแล้ว`,
        timer: 1800, 
        showConfirmButton: false 
      });
    } catch (err) {
      console.error('Save error:', err);
      Swal.fire('ผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintOfficialList = () => {
    if (!hasSavedData) {
        Swal.fire('ไม่ได้บันทึกข้อมูล', 'กรุณากดปุ่มบันทึกข้อมูลก่อนพิมพ์ใบสมัคร', 'warning');
        return;
    }
    
    const validAthletes = athletes.filter(a => a.firstName.trim() !== "");
    if (validAthletes.length === 0) { Swal.fire('คำแนะนำ', 'ไม่พบรายชื่อนักกีฬาสำหรับพิมพ์', 'warning'); return; }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = validAthletes.map((ath, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="text-align:center; padding: 5px;">
          ${ath.avatar ? `<img src="${ath.avatar}" style="width:1.8cm; height:2.4cm; object-fit:cover; border:1px solid #ddd; border-radius:4px;" />` : '<div style="width:1.8cm; height:2.4cm; border:1px dashed #ccc; margin:auto; display:flex; align-items:center; justify-content:center; font-size:8pt; color:#999;">ไม่มีรูป</div>'}
        </td>
        <td style="padding-left:10px; font-weight:bold;">${ath.prefix}${ath.firstName} ${ath.lastName}</td>
        <td style="text-align:center;">${globalAgeGroup}</td>
        <td style="text-align:center;">${selectedAthleticsEvent || '-'}</td>
        <td></td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>บัญชีรายชื่อพร้อมรูปถ่าย - ${selectedSportForAthletes?.name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 portrait; margin: 1.5cm; }
            body { font-family: 'Sarabun', sans-serif; font-size: 14pt; line-height: 1.3; color: black; margin: 0; }
            
            .header-container {
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
              margin-bottom: 25px;
              min-height: 100px;
            }
            .school-logo {
              position: absolute;
              left: 0;
              top: 0;
              width: 90px;
              height: 90px;
              object-fit: contain;
            }
            .header-text {
              text-align: center;
              font-weight: bold;
              line-height: 1.4;
            }
            
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .info-table th, .info-table td { border: 1px solid black; padding: 5px; font-size: 11pt; }
            .info-table th { background: #f8f9fa; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; }
            .sign-block { text-align: center; width: 45%; font-size: 10pt; }
            .seal-area { text-align: center; margin-top: 20px; font-size: 10pt; font-style: italic; color: #555; }
          </style>
        </head>
        <body>
          <div class="header-container">
            ${schoolProfile?.logo ? `<img src="${schoolProfile.logo}" class="school-logo" />` : ''}
            <div class="header-text">
              <div style="font-size: 16pt;">บัญชีรายชื่อและรูปถ่ายนักกีฬา</div>
              <div style="font-size: 14pt;">กลุ่มโรงเรียนตะเคียน-ลมศักดิ์ ประจำปี ${new Date().getFullYear() + 543}</div>
              <div style="margin-top:5px; font-size:18pt; color: #1e40af;">${schoolName}</div>
            </div>
          </div>
          
          <div style="margin-bottom:8px; font-size:12pt;"><strong>ประเภทกีฬา:</strong> ${selectedSportForAthletes?.name} ${selectedAthleticsEvent ? `(${selectedAthleticsEvent})` : ''}</div>
          <div style="margin-bottom:15px; font-size:12pt;"><strong>รุ่นอายุ:</strong> ${globalAgeGroup}</div>
          
          <table class="info-table">
            <thead>
              <tr>
                <th width="5%">ลำดับ</th>
                <th width="15%">รูปถ่าย</th>
                <th width="35%">ชื่อ-นามสกุล</th>
                <th width="15%">รุ่นอายุ</th>
                <th width="20%">รายการ</th>
                <th width="10%">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          
          <div class="footer">
            <div class="sign-block">
              <div style="margin-bottom:25px;">ลงชื่อ..................................ผู้ฝึกสอน</div>
              <div>(${coaches.coach1Prefix}${coaches.coach1First} ${coaches.coach1Last})</div>
              <div style="font-size:10pt;">ผู้รับรองข้อมูล</div>
            </div>
            <div class="sign-block">
              <div style="margin-bottom:25px;">ลงชื่อ..................................ผู้จัดการทีม</div>
              <div>(${schoolProfile?.directorName || '..............................'})</div>
              <div style="font-size:10pt;">ผู้อำนวยการโรงเรียน${schoolName}</div>
            </div>
          </div>
          <div class="seal-area">(ประทับตราสถานศึกษาเพื่อรับรอง)</div>
          <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleAthleteChange = (index: number, field: keyof Athlete, value: string) => {
    const newAthletes = [...athletes];
    (newAthletes[index] as any)[field] = value;
    setAthletes(newAthletes);
    setHasSavedData(false); // มีการแก้ไข ต้องบันทึกใหม่ก่อนพิมพ์
  };

  const handleCoachChange = (field: string, value: string) => {
    setCoaches(prev => ({ ...prev, [field]: value }));
    setHasSavedData(false);
  };

  const handleAvatarClick = (index: number) => {
    setCurrentAthleteIndex(index);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentAthleteIndex !== null) {
      const reader = new FileReader();
      reader.onloadend = () => handleAthleteChange(currentAthleteIndex, 'avatar', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center py-40 gap-6"><Loader2 className="animate-spin text-blue-600" size={56} /></div>;

  if (selectedSportForAthletes) {
    const isAthletics = selectedSportForAthletes.name.includes('กรีฑา');
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-2xl border border-slate-100 relative overflow-hidden">
          {isRefreshing && <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center"><RefreshCw className="animate-spin text-blue-600" size={40} /></div>}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              <button onClick={() => setSelectedSportForAthletes(null)} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 mb-2 font-black text-xs uppercase transition-colors"><ArrowLeft size={16} /> ย้อนกลับ</button>
              <h3 className="text-3xl font-black text-slate-900 flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg">{ICON_MAP[selectedSportForAthletes.icon] || <Trophy size={24} />}</div>
                {selectedSportForAthletes.name}
              </h3>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <button 
                onClick={handlePrintOfficialList} 
                disabled={!hasSavedData}
                className={`flex-1 md:flex-none px-8 py-4 rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 text-sm ${hasSavedData ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}
              >
                <FileText size={18} /> พิมพ์ใบสมัคร {!hasSavedData && "(กรุณาบันทึกก่อน)"}
              </button>
              <button onClick={saveAthletesRegistration} className="flex-1 md:flex-none bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm">
                <Save size={20} /> บันทึกข้อมูลนักกีฬา
              </button>
              {hasSavedData && (
                 <button onClick={handleDeleteCurrentSet} className="flex-1 md:flex-none bg-red-50 text-red-600 border-2 border-red-100 px-8 py-4 rounded-2xl font-black hover:bg-red-100 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm">
                    <Trash2 size={18} /> ลบข้อมูลรุ่นนี้
                 </button>
              )}
            </div>
          </div>

          {/* ส่วนแสดงสถานะรายการกีฬาที่ได้ลงทะเบียนแล้วในประเภทนี้ */}
          <div className="bg-slate-50/90 border border-slate-200/90 rounded-[2rem] p-6 mb-8 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-md">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
                    สถานะรายการกีฬาที่ได้ลงทะเบียนแล้วในประเภทนี้
                    <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">
                      {registeredCategories.length} รายการ
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    คลิกที่รายการด้านล่างเพื่อสลับไปดูหรือแก้ไขข้อมูลนักกีฬาที่เคยลงทะเบียนไว้
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => selectedSportForAthletes && fetchAllAthletesInSport(selectedSportForAthletes.id)}
                disabled={isLoadingAllSportAthletes}
                className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm active:scale-95"
              >
                <RefreshCw size={13} className={isLoadingAllSportAthletes ? 'animate-spin text-blue-600' : ''} />
                รีเฟรชสถานะ
              </button>
            </div>

            {isLoadingAllSportAthletes ? (
              <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs font-bold">
                <Loader2 size={18} className="animate-spin text-blue-600" />
                กำลังตรวจสอบสถานะรายการกีฬาที่ลงทะเบียน...
              </div>
            ) : registeredCategories.length === 0 ? (
              <div className="bg-white rounded-2xl p-5 border border-dashed border-slate-200 text-center">
                <div className="inline-flex p-2 bg-amber-50 text-amber-500 rounded-xl mb-2">
                  <Info size={20} />
                </div>
                <p className="text-xs font-bold text-slate-600">
                  ยังไม่มีรายการใดลงทะเบียนในประเภทกีฬานี้
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ท่านสามารถเลือกรุ่นอายุและกรอกรายชื่อนักกีฬาด้านล่าง จากนั้นกด "บันทึกข้อมูลนักกีฬา" เพื่อลงทะเบียน
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {registeredCategories.map((cat, idx) => {
                  const isCurrent = cat.ageGroup === globalAgeGroup && (!isAthletics || cat.athleticsEvent === selectedAthleticsEvent);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectRegisteredCategory(cat.ageGroup, cat.athleticsEvent)}
                      className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between group relative overflow-hidden active:scale-95 ${
                        isCurrent
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 ring-2 ring-blue-400 ring-offset-2'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          isCurrent ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          ✓ ลงทะเบียนแล้ว
                        </span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                          isCurrent ? 'bg-white text-blue-700' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {cat.athleteCount} คน
                        </span>
                      </div>
                      <div>
                        <p className={`font-black text-xs leading-tight ${isCurrent ? 'text-white' : 'text-slate-800'}`}>
                          {cat.ageGroup}
                        </p>
                        {cat.athleticsEvent && (
                          <p className={`text-[11px] font-bold mt-1 line-clamp-1 ${isCurrent ? 'text-blue-100' : 'text-slate-500'}`}>
                            {cat.athleticsEvent}
                          </p>
                        )}
                      </div>
                      <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] font-bold ${
                        isCurrent ? 'border-white/20 text-blue-100' : 'border-slate-100 text-slate-400 group-hover:text-blue-600'
                      }`}>
                        <span>{isCurrent ? '● กำลังแก้ไขชุดนี้' : 'คลิกเพื่อแก้ไขชุดนี้'}</span>
                        <ChevronRight size={12} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar size={14} className="text-blue-600" /> รุ่นอายุ</h4>
                <select value={globalAgeGroup} onChange={(e) => handleGlobalAgeGroupChange(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm">
                  <option value="">-- เลือกรุ่นอายุ --</option>
                  {ageGroups.map(ag => <option key={ag.id} value={`${ag.age} (${ag.gender})`}>{ag.age} ({ag.gender})</option>)}
                </select>

                {globalAgeGroup && (
                  <div className="mt-4">
                    {isCurrentCategoryRegistered(globalAgeGroup, selectedAthleticsEvent) ? (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-900 shadow-sm animate-in fade-in">
                        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-black">
                            สถานะ: ลงทะเบียนแล้ว ({getExistingAthletesForCategory(globalAgeGroup, selectedAthleticsEvent).length} คน)
                          </p>
                          <p className="text-[11px] text-amber-700 mt-0.5 font-medium leading-relaxed">
                            รายการและรุ่นนี้มีข้อมูลอยู่ในระบบแล้ว การบันทึกจะเป็นการแก้ไข/บันทึกทับข้อมูลเดิม
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 shadow-sm animate-in fade-in">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <p className="text-xs font-black">
                          สถานะ: ยังไม่ได้ลงทะเบียน (เป็นชุดใหม่)
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {isAthletics && (
                  <div className="mt-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><TrophyIcon size={14} className="text-blue-600" /> รายการกรีฑา</h4>
                    <select value={selectedAthleticsEvent} onChange={(e) => handleAthleticsEventChange(e.target.value)} className={`w-full bg-white border rounded-xl px-5 py-4 text-sm font-black outline-none focus:ring-4 transition-all shadow-sm ${genderMismatch ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:ring-blue-500/10'}`}>
                      <option value="">-- เลือกรายการ --</option>
                      {athleticsEvents.map(ev => <option key={ev.id} value={`${ev.eventNo} ${ev.name}`}>{ev.eventNo}. {ev.name}</option>)}
                    </select>
                    {genderMismatch && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 animate-bounce">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            <p className="text-[10px] font-black">เพศไม่สอดคล้องกับรุ่นอายุที่เลือก! กรุณาตรวจสอบ</p>
                        </div>
                    )}
                  </div>
                )}
              </div>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Briefcase size={14} className="text-blue-600" /> ผู้ฝึกสอน ({maxCoaches} คน)</h4>
                {Array.from({ length: maxCoaches }, (_, i) => i + 1).map(num => (
                  <div key={num} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 mb-3">
                    <p className="text-[9px] font-black text-slate-300">ลำดับ {num}</p>
                    <div className="flex gap-2">
                      <select value={(coaches as any)[`coach${num}Prefix`]} onChange={(e) => handleCoachChange(`coach${num}Prefix`, e.target.value)} className="bg-slate-50 border border-slate-100 rounded-lg px-2 text-xs font-bold outline-none">
                        {PREFIXES_COACH.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <input type="text" placeholder="ชื่อ" value={(coaches as any)[`coach${num}First`]} onChange={(e) => handleCoachChange(`coach${num}First`, e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
                    </div>
                    <input type="text" placeholder="นามสกุล" value={(coaches as any)[`coach${num}Last`]} onChange={(e) => handleCoachChange(`coach${num}Last`, e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 overflow-x-auto">
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-inner overflow-hidden min-w-[600px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
                    <tr><th className="px-6 py-5 w-16">ลำดับ</th><th className="px-6 py-5 w-24">รูปถ่าย</th><th className="px-6 py-5">ชื่อ-นามสกุล</th><th className="px-6 py-5 w-32 text-center bg-blue-900">สถานะ</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {athletes.map((ath, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/20 transition-all">
                        <td className="px-6 py-6 text-center font-black text-slate-300">{idx + 1}</td>
                        <td className="px-6 py-6"><div onClick={() => handleAvatarClick(idx)} className="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer overflow-hidden">{ath.avatar ? <img src={ath.avatar} className="w-full h-full object-cover" alt="avatar" /> : <Camera size={20} className="text-slate-300" />}</div></td>
                        <td className="px-6 py-6"><div className="flex gap-2"><select value={ath.prefix} onChange={(e) => handleAthleteChange(idx, 'prefix', e.target.value)} className="bg-white border border-slate-200 rounded-xl px-2 py-3 text-xs font-bold outline-none">{PREFIXES_ATHLETE.map(p => <option key={p} value={p}>{p}</option>)}</select><input type="text" placeholder="ชื่อ" value={ath.firstName} onChange={(e) => handleAthleteChange(idx, 'firstName', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none" /><input type="text" placeholder="นามสกุล" value={ath.lastName} onChange={(e) => handleAthleteChange(idx, 'lastName', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none" /></div></td>
                        <td className="px-6 py-6 text-center">{ath.firstName.trim() ? <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl flex items-center justify-center"><UserCheck size={20} /></div> : <div className="bg-slate-100 text-slate-300 p-2 rounded-xl flex items-center justify-center"><Users size={20} /></div>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 p-8 rounded-[3rem] border border-white backdrop-blur-md">
        <div><button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-2 font-bold text-xs uppercase"><ArrowLeft size={16} /> กลับหน้าแรก</button><h2 className="text-3xl font-black text-slate-900 leading-tight">ประเภทกีฬาที่คุณเลือก</h2></div>
        <div className="relative w-full md:w-80"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} /><input type="text" placeholder="ค้นหาชนิดกีฬา..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[2rem] w-full font-bold text-sm outline-none shadow-sm" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredSports.map((sport) => {
          const isRegistered = registeredSports.includes(sport.id);
          const isProcessing = processingId === sport.id;
          return (
            <div key={sport.id} className={`bg-white rounded-[3rem] p-8 shadow-sm border-2 transition-all relative flex flex-col ${isRegistered ? 'border-blue-600 bg-blue-50/10 shadow-2xl scale-[1.02]' : 'border-transparent hover:border-slate-200 hover:shadow-xl'}`}>
              {isRegistered && <div className="absolute top-6 right-6 text-blue-600"><CheckCircle2 size={36} /></div>}
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 ${isRegistered ? 'bg-blue-600 text-white rotate-6' : 'bg-slate-50 text-slate-400'}`}>{ICON_MAP[sport.icon] || <Trophy size={40} />}</div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight">{sport.name}</h3>
              <p className="text-sm text-slate-400 mb-8 font-medium line-clamp-2">{sport.description || 'จัดการข้อมูลนักกีฬาในประเภทนี้'}</p>
              <div className="mt-auto space-y-3">
                <button onClick={() => handleToggleSport(sport.id)} disabled={isProcessing} className={`w-full py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${isRegistered ? 'bg-white border-2 border-red-500 text-red-500 hover:bg-red-50' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl'}`}>
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : isRegistered ? <><XCircle size={18} /> ยกเลิกรายการ</> : <><CheckCircle2 size={18} /> เลือกลงทะเบียน</>}
                </button>
                {isRegistered && <button onClick={() => handleOpenAthleteRegistration(sport)} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl hover:bg-blue-700 transition-all"><UserPlus size={18} /> จัดการรายชื่อนักกีฬา</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RegistrationPage;
