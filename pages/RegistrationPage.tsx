
import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle
} from 'lucide-react';

declare var Swal: any;

interface RegistrationPageProps {
  onBack: () => void;
  schoolName: string;
  schoolId: string;
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
        fetchAthleteData(value, selectedAthleticsEvent, newMax);
      } else {
        resetToEmpty(newMax, value);
      }
    } else if (value) {
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
      if (sport.name.includes('กรีฑา')) {
        const res = await fetch(`${SCRIPT_URL}?action=getAthleticsList`);
        setAthleticsEvents(await res.json());
        resetToEmpty(initialMax, initialAgeGroup);
      } else {
        await fetchAthleteData(initialAgeGroup, '', initialMax);
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
    const validAthletes = athletes.filter(a => a.firstName.trim() !== "");
    if (validAthletes.length === 0) { Swal.fire('คำแนะนำ', 'กรุณากรอกข้อมูลนักกีฬาอย่างน้อย 1 รายชื่อ', 'warning'); return; }
    
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
      setHasSavedData(true);
      Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false });
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar size={14} className="text-blue-600" /> รุ่นอายุ</h4>
                <select value={globalAgeGroup} onChange={(e) => handleGlobalAgeGroupChange(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm">
                  <option value="">-- เลือกรุ่นอายุ --</option>
                  {ageGroups.map(ag => <option key={ag.id} value={`${ag.age} (${ag.gender})`}>{ag.age} ({ag.gender})</option>)}
                </select>
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
