import React, { useState, useEffect, useRef } from 'react';
import { SCRIPT_URL } from '../constants';
import { School, AgeGroup, SportType, AthleticsEvent, CompetitionResult, Athlete, Coach, extractCoachesFromAthletes, FeedbackRecord, parseResponsibleSports, formatResponsibleSports } from '../types';
import { 
  Users, 
  Trophy, 
  Search, 
  Plus, 
  Trash2, 
  Loader2, 
  X, 
  RefreshCw,
  ChevronRight,
  Menu,
  Save,
  School as SchoolIcon,
  Edit2,
  Dribbble,
  FileText,
  ChevronDown,
  AlertCircle,
  PersonStanding,
  Hash,
  Info,
  Award,
  Medal,
  CheckCircle2,
  ScrollText,
  Printer,
  UserCheck,
  User,
  Eye,
  EyeOff,
  CloudUpload,
  ExternalLink,
  ImageIcon,
  Camera,
  PrinterCheck,
  AlertTriangle,
  ClipboardCopy,
  Zap,
  Key,
  FileDown,
  FileUp,
  MessageSquare,
  Reply,
  LayoutDashboard,
  BarChart3,
  Clock,
  ChevronUp,
  Target,
  TrophyIcon,
  CheckSquare,
  Square
} from 'lucide-react';

declare var Swal: any;

interface MedalStanding {
  schoolId: string;
  schoolName: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

interface RegistrationSummary {
  schoolId: string;
  schoolName: string;
  sportId: string;
  sportName: string;
}

interface AnnouncementStat {
  count: number;
  items: string[];
}

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'ageGroups' | 'sportTypes' | 'athletics' | 'results' | 'certificates' | 'feedback-view'>('overview');
  const [schools, setSchools] = useState<School[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [sportTypes, setSportTypes] = useState<SportType[]>([]);
  const [athleticsList, setAthleticsList] = useState<AthleticsEvent[]>([]);
  const [resultsList, setResultsList] = useState<CompetitionResult[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<RegistrationSummary[]>([]);
  const [announcementStats, setAnnouncementStats] = useState<Record<string, AnnouncementStat>>({});
  
  const [selectedSchoolForMedals, setSelectedSchoolForMedals] = useState<MedalStanding | null>(null);

  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [editingAgeGroup, setEditingAgeGroup] = useState<AgeGroup | null>(null);
  const [editingSportType, setEditingSportType] = useState<SportType | null>(null);
  const [editingAthletics, setEditingAthletics] = useState<AthleticsEvent | null>(null);
  const [editingResult, setEditingResult] = useState<Partial<CompetitionResult> | null>(null);
  const [replyingFeedback, setReplyingFeedback] = useState<FeedbackRecord | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('');
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingCert, setIsSavingCert] = useState<string | null>(null);
  
  const [showProgressDetails, setShowProgressDetails] = useState<string | null>(null);

  const templateInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [currentSportForTemplate, setCurrentSportForTemplate] = useState<string | null>(null);
  const [currentSportForPdf, setCurrentSportForPdf] = useState<string | null>(null);

  const [resSportId, setResSportId] = useState('');
  const [resAgeGroup, setResAgeGroup] = useState('');
  const [resAthEvent, setResAthEvent] = useState('');
  const [resRegisteredSchools, setResRegisteredSchools] = useState<{id: string, name: string}[]>([]);
  const [isResLoadingSchools, setIsResLoadingSchools] = useState(false);
  const [schoolAthletesMap, setSchoolAthletesMap] = useState<Record<string, Athlete[]>>({});
  const [loadingAthletesForSchool, setLoadingAthletesForSchool] = useState<Record<string, boolean>>({});

  // ฟังก์ชันดึงรายชื่อนักกีฬาของโรงเรียนในรายการแข่งขันนี้
  const fetchAthletesForSchool = async (
    schoolId: string,
    sportIdOverride?: string,
    ageGroupOverride?: string,
    athEventOverride?: string
  ) => {
    if (!schoolId) return;
    const targetSportId = sportIdOverride || resSportId;
    const targetAgeGroup = ageGroupOverride !== undefined ? ageGroupOverride : resAgeGroup;
    const targetAthEvent = athEventOverride !== undefined ? athEventOverride : resAthEvent;
    if (!targetSportId || !targetAgeGroup) return;

    setLoadingAthletesForSchool(prev => ({ ...prev, [schoolId]: true }));
    try {
      let url = `${SCRIPT_URL}?action=getAthletes&schoolId=${schoolId}&sportId=${targetSportId}&ageGroup=${encodeURIComponent(targetAgeGroup)}`;
      if (targetAthEvent) url += `&athleticsEvent=${encodeURIComponent(targetAthEvent)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSchoolAthletesMap(prev => ({ ...prev, [schoolId]: data }));
      }
    } catch (e) {
      console.error('Error fetching athletes for school:', e);
    } finally {
      setLoadingAthletesForSchool(prev => ({ ...prev, [schoolId]: false }));
    }
  };

  // ฟังก์ชันตรวจสอบผลการแข่งขันซ้ำซ้อน
  const checkDuplicateResult = (sportId: string, ageGroup: string, athEvent: string = '', excludeId?: string): CompetitionResult | null => {
    if (!sportId || !ageGroup) return null;
    const sport = sportTypes.find(s => s.id === sportId);
    const isAth = sport?.name.includes('กรีฑา');

    // สำหรับกรีฑา ต้องเลือกรายการกรีฑาด้วยจึงจะตรวจสอบได้ครบถ้วน
    if (isAth && !athEvent) {
      return null;
    }

    const normAge = ageGroup.trim().toLowerCase();
    const normAth = athEvent.trim().toLowerCase();

    const found = resultsList.find(r => {
      if (excludeId && String(r.id).trim() === String(excludeId).trim()) return false;

      const matchSport = r.sportId === sportId || (sport && r.sportName && r.sportName.trim() === sport.name.trim());
      const matchAge = (r.ageGroup || '').trim().toLowerCase() === normAge;

      if (isAth) {
        const matchAth = (r.athleticsEvent || '').trim().toLowerCase() === normAth;
        return matchSport && matchAge && matchAth;
      }
      return matchSport && matchAge;
    });

    return found || null;
  };

  // ฟังก์ชันเปิด Modal เพื่อแก้ไขผลการแข่งขัน โหลดข้อมูลเดิมพร้อมดึงรายชื่อนักกีฬาสำหรับเลือกรับรางวัล
  const handleOpenEditResult = (r: CompetitionResult) => {
    const matchedSport = sportTypes.find(s => s.id === r.sportId || s.name === r.sportName);
    const validSportId = matchedSport ? matchedSport.id : r.sportId;
    const sAge = r.ageGroup || '';
    const sAth = r.athleticsEvent || '';

    setSchoolAthletesMap({});
    setEditingResult({ ...r, sportId: validSportId });
    setIsAddingNew(false);
    setResSportId(validSportId);
    setResAgeGroup(sAge);
    setResAthEvent(sAth);

    // ดึงรายชื่อนักกีฬาของโรงเรียนที่ได้รับเหรียญรางวัลทันที เพื่อให้แสดงใน dropdown
    const ids = [r.rank1SchoolId, r.rank2SchoolId, r.rank3SchoolId, r.rank3SchoolId2].filter(Boolean) as string[];
    ids.forEach(id => {
      fetchAthletesForSchool(id, validSportId, sAge, sAth);
    });
  };

  // แจ้งเตือนเมื่อเลือกรายการแข่งขันที่มีผลแล้ว พร้อมปุ่มให้โหลดขึ้นมาแก้ไขได้ทันที
  const promptEditExistingResult = (dup: CompetitionResult) => {
    Swal.fire({
      icon: 'info',
      title: 'พบข้อมูลผลการแข่งขันในระบบแล้ว',
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.6;">
          <p style="margin-bottom: 8px; color: #334155;">
            รายการแข่งขันนี้มีผลบันทึกอยู่ในระบบเรียบร้อยแล้ว:
          </p>
          <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 12px; margin-bottom: 12px;">
            <p style="margin: 0; font-weight: bold; color: #92400e;">🏆 ชนะเลิศ: ${dup.rank1SchoolName} ${dup.rank1AthleteName ? `(${dup.rank1AthleteName})` : ''}</p>
            <p style="margin: 4px 0 0 0; color: #475569;">🥈 อันดับ 2: ${dup.rank2SchoolName || '-'} ${dup.rank2AthleteName ? `(${dup.rank2AthleteName})` : ''}</p>
            <p style="margin: 4px 0 0 0; color: #475569;">🥉 อันดับ 3: ${dup.rank3SchoolName || '-'} ${dup.rank3AthleteName ? `(${dup.rank3AthleteName})` : ''}</p>
          </div>
          <p style="color: #047857; font-weight: bold; margin: 0;">
            ต้องการโหลดข้อมูลขึ้นมาเพื่อแก้ไขผลการแข่งขันหรือไม่?
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '✏️ โหลดเพื่อแก้ไขผล',
      confirmButtonColor: '#059669',
      cancelButtonText: 'เลือกรุ่นอื่น',
      cancelButtonColor: '#64748b',
    }).then((result: any) => {
      if (result.isConfirmed) {
        handleOpenEditResult(dup);
      } else {
        const sport = sportTypes.find(s => s.id === resSportId);
        if (sport?.name.includes('กรีฑา')) {
          setResAthEvent('');
        } else {
          setResAgeGroup('');
        }
      }
    });
  };

  const handleSportChange = (newSportId: string) => {
    setResSportId(newSportId);
    setSchoolAthletesMap({});
    const sport = sportTypes.find(s => s.id === newSportId);
    const isAth = sport?.name.includes('กรีฑา');
    if (!isAth) {
      setResAthEvent('');
    }

    if (newSportId && resAgeGroup) {
      const duplicate = checkDuplicateResult(
        newSportId,
        resAgeGroup,
        isAth ? resAthEvent : '',
        isAddingNew ? undefined : editingResult?.id
      );

      if (duplicate && (!editingResult || duplicate.id !== editingResult.id)) {
        promptEditExistingResult(duplicate);
      }
    }
  };

  const handleAgeGroupChange = (newAgeGroup: string) => {
    if (!newAgeGroup) {
      setResAgeGroup('');
      return;
    }
    setResAgeGroup(newAgeGroup);
    setSchoolAthletesMap({});

    const sport = sportTypes.find(s => s.id === resSportId);
    const isAth = sport?.name.includes('กรีฑา');

    if (resSportId && newAgeGroup) {
      const duplicate = checkDuplicateResult(
        resSportId,
        newAgeGroup,
        isAth ? resAthEvent : '',
        isAddingNew ? undefined : editingResult?.id
      );

      if (duplicate && (!editingResult || duplicate.id !== editingResult.id)) {
        promptEditExistingResult(duplicate);
      }
    }
  };

  const handleAthEventChange = (newAthEvent: string) => {
    if (!newAthEvent) {
      setResAthEvent('');
      return;
    }
    setResAthEvent(newAthEvent);
    setSchoolAthletesMap({});

    if (resSportId && resAgeGroup && newAthEvent) {
      const duplicate = checkDuplicateResult(
        resSportId,
        resAgeGroup,
        newAthEvent,
        isAddingNew ? undefined : editingResult?.id
      );

      if (duplicate && (!editingResult || duplicate.id !== editingResult.id)) {
        promptEditExistingResult(duplicate);
      }
    }
  };

  const fetchData = async () => {
    if (!isRefreshing) setIsLoading(true);
    try {
      const [accRes, ageRes, sportRes, athleticsRes, resultsRes, feedbackRes, regRes, statsRes] = await Promise.all([
        fetch(`${SCRIPT_URL}?action=getAccounts`),
        fetch(`${SCRIPT_URL}?action=getAgeGroups`),
        fetch(`${SCRIPT_URL}?action=getSports`),
        fetch(`${SCRIPT_URL}?action=getAthleticsList`),
        fetch(`${SCRIPT_URL}?action=getResults`),
        fetch(`${SCRIPT_URL}?action=getFeedbacks`),
        fetch(`${SCRIPT_URL}?action=getAllRegistrations`),
        fetch(`${SCRIPT_URL}?action=getAnnouncementStats`)
      ]);
      
      const accData = await accRes.json();
      const ageData = await ageRes.json();
      const sportData = await sportRes.json();
      const athleticsData = await athleticsRes.json();
      const resultsData = await resultsRes.json();
      const feedbackData = await feedbackRes.json();
      const regData = await regRes.json();
      const statsData = await statsRes.json();
      
      const mappedSchools = Object.keys(accData).map(id => ({ 
        id: String(id).trim(), 
        name: accData[id].name || '',
        username: accData[id].username || '',
        password: accData[id].password || '',
        responsibleSport: accData[id].responsibleSport || ''
      }));
      
      setSchools(mappedSchools);
      setAgeGroups(Array.isArray(ageData) ? ageData : []);
      setSportTypes(Array.isArray(sportData) ? sportData : []);
      setResultsList(Array.isArray(resultsData) ? resultsData : []);
      setFeedbackList(Array.isArray(feedbackData) ? feedbackData : []);
      setAllRegistrations(Array.isArray(regData) ? regData : []);
      setAnnouncementStats(statsData || {});
      
      const sortedAthletics = Array.isArray(athleticsData) ? [...athleticsData].sort((a, b) => a.eventNo.localeCompare(b.eventNo)) : [];
      setAthleticsList(sortedAthletics);
    } catch (e) {
      console.error('Fetch error:', e);
      Swal.fire({
        icon: 'error',
        title: 'การเชื่อมต่อล้มเหลว',
        text: 'ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่ภายหลัง'
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const fetchSchoolsForResults = async () => {
      if (!resSportId) {
        setResRegisteredSchools([]);
        return;
      }

      const sport = sportTypes.find(s => s.id === resSportId);
      const isAth = sport?.name.includes('กรีฑา');

      setIsResLoadingSchools(true);
      try {
        let url = `${SCRIPT_URL}?action=getRegisteredSchoolsForEvent&sportId=${resSportId}`;
        url += `&ageGroup=${encodeURIComponent(resAgeGroup)}`;
        if (isAth) {
          url += `&athleticsEvent=${encodeURIComponent(resAthEvent)}`;
        }
        
        const res = await fetch(url);
        const data = await res.json();
        setResRegisteredSchools(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Fetch registered schools error:', e);
        setResRegisteredSchools([]);
      } finally {
        setIsResLoadingSchools(false);
      }
    };

    if (activeTab === 'results' && editingResult) {
      fetchSchoolsForResults();
    }
  }, [resSportId, resAgeGroup, resAthEvent, activeTab, sportTypes, Boolean(editingResult)]);

  useEffect(() => {
    if (!editingResult || activeTab !== 'results') return;
    const ids = [
      editingResult.rank1SchoolId, 
      editingResult.rank2SchoolId, 
      editingResult.rank3SchoolId, 
      editingResult.rank3SchoolId2
    ].filter(Boolean) as string[];

    ids.forEach(id => {
      if (!schoolAthletesMap[id]) {
        fetchAthletesForSchool(id, resSportId, resAgeGroup, resAthEvent);
      }
    });
  }, [
    editingResult?.rank1SchoolId, 
    editingResult?.rank2SchoolId, 
    editingResult?.rank3SchoolId, 
    editingResult?.rank3SchoolId2, 
    resSportId, 
    resAgeGroup, 
    resAthEvent,
    activeTab
  ]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handlePostRequest = async (payload: any) => {
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchData();
        Swal.fire({ icon: 'success', title: 'ดำเนินการสำเร็จ', timer: 1500, showConfirmButton: false });
        return true;
      } else {
        throw new Error(result.message);
      }
    } catch (e: any) {
      console.error('POST Error:', e);
      Swal.fire('เกิดข้อผิดพลาด', e.toString() || 'ไม่สามารถดำเนินการได้', 'error');
      return false;
    }
  };

  const handleSaveSchoolSports = async (schoolId: string, updatedSports: string[], actionMsg?: string) => {
    const formatted = formatResponsibleSports(updatedSports);
    // อัปเดตสถานะใน UI ทันที
    setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, responsibleSport: formatted } : s));
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateSchoolResponsibleSport',
          data: { schoolId, responsibleSport: formatted }
        })
      });
      const res = await response.json();
      if (res.status === 'success') {
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true
        });
        Toast.fire({
          icon: 'success',
          title: actionMsg || (formatted ? `อัปเดตสนามกีฬา: ${formatted}` : 'ยกเลิกสนามกีฬาที่รับผิดชอบแล้ว')
        });
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      console.error('Update responsible sport error:', err);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกสนามกีฬาที่รับผิดชอบได้', 'error');
      fetchData();
    }
  };

  const handleAddSchoolSport = (schoolId: string, sportToAdd: string) => {
    if (!sportToAdd) return;
    const targetSchool = schools.find(s => s.id === schoolId);
    const current = parseResponsibleSports(targetSchool?.responsibleSport);
    if (current.includes(sportToAdd)) return;
    const updated = [...current, sportToAdd];
    handleSaveSchoolSports(schoolId, updated, `เพิ่มสนามกีฬา: ${sportToAdd}`);
  };

  const handleRemoveSchoolSport = (schoolId: string, sportToRemove: string) => {
    const targetSchool = schools.find(s => s.id === schoolId);
    const current = parseResponsibleSports(targetSchool?.responsibleSport);
    const updated = current.filter(s => s !== sportToRemove);
    handleSaveSchoolSports(schoolId, updated, `ลบ ${sportToRemove} ออกแล้ว`);
  };

  const handleClearAllSchoolSports = (schoolId: string) => {
    handleSaveSchoolSports(schoolId, [], 'ยกเลิกสนามกีฬาที่รับผิดชอบทั้งหมดแล้ว');
  };

  const handleTogglePublish = async (result: CompetitionResult) => {
    const newStatus = !result.isPublished;
    Swal.fire({ 
      title: newStatus ? 'กำลังเปิดการแสดงผล...' : 'กำลังปิดการแสดงผล...', 
      allowOutsideClick: false, 
      didOpen: () => Swal.showLoading() 
    });
    
    await handlePostRequest({ 
      action: 'updateResult', 
      data: { ...result, isPublished: newStatus } 
    });
  };

  const handleUpdateCertFieldLocally = (result: CompetitionResult, field: 'certStartNo' | 'certEndNo', value: string) => {
    const updated = { ...result, [field]: value };
    setResultsList(prev => prev.map(r => r.id === result.id ? updated : r));
  };

  const formatCertNo = (startNo: string, index: number) => {
    if (!startNo) return '';
    if (startNo.includes('/')) {
      const parts = startNo.split('/');
      const numerator = parts[0].trim();
      const denominator = parts[1].trim();
      const match = numerator.match(/^(\D*)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const numStr = match[2];
        const currentNum = parseInt(numStr) + index;
        const paddedNum = currentNum.toString().padStart(numStr.length, '0');
        return `${prefix}${paddedNum} / ${denominator}`;
      }
      return `${numerator}${index > 0 ? `-${index}` : ''} / ${denominator}`;
    } 
    const match = startNo.match(/^(\D*)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const currentNum = parseInt(numStr) + index;
      const paddedNum = currentNum.toString().padStart(numStr.length, '0');
      return `${prefix}${paddedNum}`;
    }
    return `${startNo}${index > 0 ? `-${index}` : ''}`;
  };

  const handleSaveCertConfig = async (result: CompetitionResult) => {
    setIsSavingCert(result.id);
    Swal.fire({ 
      title: 'กำลังตรวจสอบรายชื่อและคำนวณเลขที่...', 
      html: '<p class="text-xs text-slate-500 mt-1">กำลังประมวลผลรายชื่อนักกีฬาและครูผู้ฝึกสอน...</p>',
      allowOutsideClick: false, 
      didOpen: () => Swal.showLoading() 
    });

    try {
      const getAthletesList = async (schoolId: string) => {
        if (!schoolId) return [];
        let url = `${SCRIPT_URL}?action=getAthletes&schoolId=${schoolId}&sportId=${result.sportId}&ageGroup=${encodeURIComponent(result.ageGroup)}`;
        if (result.athleticsEvent) url += `&athleticsEvent=${encodeURIComponent(result.athleticsEvent)}`;
        const res = await fetch(url);
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      };

      const [athletesR1, athletesR2, athletesR3, athletesR3_2] = await Promise.all([
        getAthletesList(result.rank1SchoolId),
        getAthletesList(result.rank2SchoolId),
        getAthletesList(result.rank3SchoolId),
        getAthletesList(result.rank3SchoolId2 || '')
      ]);

      const coachesR1 = extractCoachesFromAthletes(athletesR1);
      const coachesR2 = extractCoachesFromAthletes(athletesR2);
      const coachesR3 = extractCoachesFromAthletes(athletesR3);
      const coachesR3_2 = extractCoachesFromAthletes(athletesR3_2);

      // ตรวจสอบโรงเรียนที่ได้รับรางวัลหลายอันดับ (เช่น กรีฑา รุ่นอายุไม่เกิน 15 ปี)
      const rankSchoolIds = [
        result.rank1SchoolId, 
        result.rank2SchoolId, 
        result.rank3SchoolId, 
        result.rank3SchoolId2 || ''
      ].filter(Boolean);

      const schoolRankCount: Record<string, number> = {};
      rankSchoolIds.forEach(id => {
        schoolRankCount[id] = (schoolRankCount[id] || 0) + 1;
      });

      const schoolAssignedIdx: Record<string, number> = {};
      const isRelay = (result.athleticsEvent || '').includes('ผลัด');

      const getAthletesForRank = (schoolId: string, allAthletes: Athlete[]): Athlete[] => {
        if (!schoolId || !allAthletes || allAthletes.length === 0) return [];
        const appearsMultipleTimes = (schoolRankCount[schoolId] || 0) > 1;
        if (!isRelay && appearsMultipleTimes && allAthletes.length > 1) {
          const currentIdx = schoolAssignedIdx[schoolId] || 0;
          schoolAssignedIdx[schoolId] = currentIdx + 1;
          const assignedAth = allAthletes[currentIdx] || allAthletes[allAthletes.length - 1];
          return [assignedAth];
        }
        return allAthletes;
      };

      const finalAthletesR1 = getAthletesForRank(result.rank1SchoolId, athletesR1);
      const finalAthletesR2 = getAthletesForRank(result.rank2SchoolId, athletesR2);
      const finalAthletesR3 = getAthletesForRank(result.rank3SchoolId, athletesR3);
      const finalAthletesR3_2 = getAthletesForRank(result.rank3SchoolId2 || '', athletesR3_2);

      const individualRecords: any[] = [];
      let globalCounter = 0;

      // อันดับ 1: ชนะเลิศ (นักกีฬา + ครูผู้ฝึกสอน)
      if (result.rank1AthleteName) {
        individualRecords.push({
          certNo: formatCertNo(result.certStartNo || '', globalCounter++),
          fullName: result.rank1AthleteName,
          schoolName: result.rank1SchoolName,
          rank: 'ชนะเลิศ',
          sportName: result.sportName,
          ageGroup: result.ageGroup,
          athleticsEvent: result.athleticsEvent || '-',
          isCoach: false
        });
      } else {
        finalAthletesR1.forEach((ath) => {
          individualRecords.push({
            certNo: formatCertNo(result.certStartNo || '', globalCounter++),
            fullName: `${ath.prefix}${ath.firstName} ${ath.lastName}`.trim(),
            schoolName: result.rank1SchoolName,
            rank: 'ชนะเลิศ',
            sportName: result.sportName,
            ageGroup: result.ageGroup,
            athleticsEvent: result.athleticsEvent || '-',
            isCoach: false
          });
        });
      }
      coachesR1.forEach((coach) => {
        individualRecords.push({
          certNo: formatCertNo(result.certStartNo || '', globalCounter++),
          fullName: coach.fullName,
          schoolName: result.rank1SchoolName,
          rank: 'ครูผู้ฝึกสอน ได้รับรางวัลชนะเลิศ',
          sportName: result.sportName,
          ageGroup: result.ageGroup,
          athleticsEvent: result.athleticsEvent || '-',
          isCoach: true
        });
      });

      // อันดับ 2: รองชนะเลิศอันดับ 1 (นักกีฬา + ครูผู้ฝึกสอน)
      if (result.rank2AthleteName) {
        individualRecords.push({
          certNo: formatCertNo(result.certStartNo || '', globalCounter++),
          fullName: result.rank2AthleteName,
          schoolName: result.rank2SchoolName,
          rank: 'รองชนะเลิศอันดับ 1',
          sportName: result.sportName,
          ageGroup: result.ageGroup,
          athleticsEvent: result.athleticsEvent || '-',
          isCoach: false
        });
      } else {
        finalAthletesR2.forEach((ath) => {
          individualRecords.push({
            certNo: formatCertNo(result.certStartNo || '', globalCounter++),
            fullName: `${ath.prefix}${ath.firstName} ${ath.lastName}`.trim(),
            schoolName: result.rank2SchoolName,
            rank: 'รองชนะเลิศอันดับ 1',
            sportName: result.sportName,
            ageGroup: result.ageGroup,
            athleticsEvent: result.athleticsEvent || '-',
            isCoach: false
          });
        });
      }
      coachesR2.forEach((coach) => {
        individualRecords.push({
          certNo: formatCertNo(result.certStartNo || '', globalCounter++),
          fullName: coach.fullName,
          schoolName: result.rank2SchoolName,
          rank: 'ครูผู้ฝึกสอน ได้รับรางวัลรองชนะเลิศอันดับ 1',
          sportName: result.sportName,
          ageGroup: result.ageGroup,
          athleticsEvent: result.athleticsEvent || '-',
          isCoach: true
        });
      });

      // อันดับ 3: รองชนะเลิศอันดับ 2 (นักกีฬา + ครูผู้ฝึกสอน)
      if (result.rank3AthleteName) {
        individualRecords.push({
          certNo: formatCertNo(result.certStartNo || '', globalCounter++),
          fullName: result.rank3AthleteName,
          schoolName: result.rank3SchoolName,
          rank: 'รองชนะเลิศอันดับ 2',
          sportName: result.sportName,
          ageGroup: result.ageGroup,
          athleticsEvent: result.athleticsEvent || '-',
          isCoach: false
        });
      } else {
        finalAthletesR3.forEach((ath) => {
          individualRecords.push({
            certNo: formatCertNo(result.certStartNo || '', globalCounter++),
            fullName: `${ath.prefix}${ath.firstName} ${ath.lastName}`.trim(),
            schoolName: result.rank3SchoolName,
            rank: 'รองชนะเลิศอันดับ 2',
            sportName: result.sportName,
            ageGroup: result.ageGroup,
            athleticsEvent: result.athleticsEvent || '-',
            isCoach: false
          });
        });
      }
      coachesR3.forEach((coach) => {
        individualRecords.push({
          certNo: formatCertNo(result.certStartNo || '', globalCounter++),
          fullName: coach.fullName,
          schoolName: result.rank3SchoolName,
          rank: 'ครูผู้ฝึกสอน ได้รับรางวัลรองชนะเลิศอันดับ 2',
          sportName: result.sportName,
          ageGroup: result.ageGroup,
          athleticsEvent: result.athleticsEvent || '-',
          isCoach: true
        });
      });

      // อันดับ 3 ร่วม: รองชนะเลิศอันดับ 2 (ร่วม) (นักกีฬา + ครูผู้ฝึกสอน)
      if (result.rank3SchoolId2 && result.rank3SchoolName2) {
        if (result.rank3AthleteName2) {
          individualRecords.push({
            certNo: formatCertNo(result.certStartNo || '', globalCounter++),
            fullName: result.rank3AthleteName2,
            schoolName: result.rank3SchoolName2!,
            rank: 'รองชนะเลิศอันดับ 2 (ร่วม)',
            sportName: result.sportName,
            ageGroup: result.ageGroup,
            athleticsEvent: result.athleticsEvent || '-',
            isCoach: false
          });
        } else {
          finalAthletesR3_2.forEach((ath) => {
            individualRecords.push({
              certNo: formatCertNo(result.certStartNo || '', globalCounter++),
              fullName: `${ath.prefix}${ath.firstName} ${ath.lastName}`.trim(),
              schoolName: result.rank3SchoolName2!,
              rank: 'รองชนะเลิศอันดับ 2 (ร่วม)',
              sportName: result.sportName,
              ageGroup: result.ageGroup,
              athleticsEvent: result.athleticsEvent || '-',
              isCoach: false
            });
          });
        }
        coachesR3_2.forEach((coach) => {
          individualRecords.push({
            certNo: formatCertNo(result.certStartNo || '', globalCounter++),
            fullName: coach.fullName,
            schoolName: result.rank3SchoolName2!,
            rank: 'ครูผู้ฝึกสอน ได้รับรางวัลรองชนะเลิศอันดับ 2 (ร่วม)',
            sportName: result.sportName,
            ageGroup: result.ageGroup,
            athleticsEvent: result.athleticsEvent || '-',
            isCoach: true
          });
        });
      }

      const totalAthletes = athletesR1.length + athletesR2.length + athletesR3.length + athletesR3_2.length;
      const totalCoaches = coachesR1.length + coachesR2.length + coachesR3.length + coachesR3_2.length;
      const lastIdx = individualRecords.length > 0 ? individualRecords.length - 1 : 0;
      const certEndNo = formatCertNo(result.certStartNo || '', lastIdx);

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'updateCertConfig', 
          data: {
            id: result.id,
            certStartNo: result.certStartNo,
            certEndNo: certEndNo,
            records: individualRecords
          }
        })
      });
      const resData = await response.json();
      if (resData.status === 'success') {
        setResultsList(prev => prev.map(r => r.id === result.id ? { ...r, certEndNo: certEndNo } : r));
        Swal.fire({ 
          icon: 'success', 
          title: 'บันทึกสำเร็จ', 
          html: `
            <div class="text-left text-xs space-y-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
              <p><b>เลขที่เริ่มต้น:</b> <span class="text-rose-600 font-bold">${result.certStartNo}</span></p>
              <p><b>เลขที่สิ้นสุด:</b> <span class="text-rose-600 font-bold">${certEndNo}</span></p>
              <div class="pt-1.5 border-t border-slate-200 flex justify-between text-slate-600 font-semibold">
                <span>นักกีฬา: <b class="text-slate-800">${totalAthletes}</b> คน</span>
                <span>ครูผู้ฝึกสอน: <b class="text-slate-800">${totalCoaches}</b> คน</span>
              </div>
              <p class="text-emerald-600 font-black text-xs pt-1">
                ✓ รวมออกเกียรติบัตรทั้งหมด ${individualRecords.length} ฉบับ (รวมครูผู้ฝึกสอนจากคอลัมน์ผู้ฝึกสอนเรียบร้อยแล้ว)
              </p>
            </div>
          `,
          timer: 4000, 
          showConfirmButton: true 
        });
      } else {
        throw new Error(resData.message);
      }
    } catch (e) {
      console.error('Save cert config error:', e);
      Swal.fire('บันทึกล้มเหลว', 'เกิดข้อผิดพลาดในการบันทึกข้อมูลเกียรติบัตรลงฐานข้อมูล', 'error');
    } finally {
      setIsSavingCert(null);
    }
  };

  const handleSportTemplateUpload = (sportId: string) => {
    setCurrentSportForTemplate(sportId);
    if (templateInputRef.current) {
        templateInputRef.current.value = '';
        templateInputRef.current.click();
    }
  };

  const handleSportPdfUpload = (sportId: string) => {
    setCurrentSportForPdf(sportId);
    if (pdfInputRef.current) {
        pdfInputRef.current.value = '';
        pdfInputRef.current.click();
    }
  };

  const onTemplateFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentSportForTemplate) {
      if (file.size > 1.8 * 1024 * 1024) {
        Swal.fire('ไฟล์มีขนาดใหญ่เกินไป', 'กรุณาใช้รูปภาพขนาดไม่เกิน 1.8MB เพื่อให้ระบบสามารถบันทึกข้อมูลได้ครบถ้วน', 'warning');
        return;
      }

      Swal.fire({ title: 'กำลังประมวลผลรูปภาพ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const sport = sportTypes.find(s => s.id === currentSportForTemplate);
        if (sport) {
          const success = await handlePostRequest({ 
            action: 'updateSport', 
            data: { ...sport, certTemplate: base64 } 
          });
          if (success) setCurrentSportForTemplate(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const onPdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentSportForPdf) {
      if (file.type !== 'application/pdf') {
        Swal.fire('รูปแบบไฟล์ไม่ถูกต้อง', 'กรุณาอัปโหลดไฟล์ในรูปแบบ PDF เท่านั้น', 'warning');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire('ไฟล์ใหญ่เกินไป', 'กรุณาอัปโหลดไฟล์ PDF ขนาดไม่เกิน 2MB', 'warning');
        return;
      }

      Swal.fire({ title: 'กำลังอัปโหลดระเบียบการ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const sport = sportTypes.find(s => s.id === currentSportForPdf);
        if (sport) {
          const success = await handlePostRequest({ 
            action: 'updateSport', 
            data: { ...sport, rulesPdf: base64 } 
          });
          if (success) setCurrentSportForPdf(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSportType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSportType) return;
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const success = await handlePostRequest({ action: 'updateSport', data: editingSportType });
    if (success) setEditingSportType(null);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const success = await handlePostRequest({ action: 'updateAccount', data: editingSchool });
    if (success) setEditingSchool(null);
  };

  const handleSaveAgeGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgeGroup) return;
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const success = await handlePostRequest({ action: 'updateAgeGroup', data: editingAgeGroup });
    if (success) setEditingAgeGroup(null);
  };

  const handleSaveAthletics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAthletics) return;
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const success = await handlePostRequest({ action: 'updateAthletics', data: editingAthletics });
    if (success) setEditingAthletics(null);
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResult) return;
    const sport = sportTypes.find(s => s.id === resSportId);
    const isAth = sport?.name.includes('กรีฑา');

    // ตรวจสอบความซ้ำซ้อนก่อนบันทึก (เฉพาะเมื่อเพิ่มใหม่ หรือเปลี่ยนรายการไปตรงกับรายการอื่น)
    const duplicate = checkDuplicateResult(
      resSportId,
      resAgeGroup,
      isAth ? resAthEvent : '',
      isAddingNew ? undefined : editingResult.id
    );

    if (duplicate && (!editingResult.id || duplicate.id !== editingResult.id)) {
      promptEditExistingResult(duplicate);
      return;
    }

    const r1Id = editingResult.rank1SchoolId || '';
    const r2Id = editingResult.rank2SchoolId || '';
    const r3Id = editingResult.rank3SchoolId || '';
    const r3_2Id = editingResult.rank3SchoolId2 || '';

    const r1School = resRegisteredSchools.find(s => s.id === r1Id) || schools.find(s => s.id === r1Id);
    const r2School = resRegisteredSchools.find(s => s.id === r2Id) || schools.find(s => s.id === r2Id);
    const r3School = resRegisteredSchools.find(s => s.id === r3Id) || schools.find(s => s.id === r3Id);
    const r3_2School = resRegisteredSchools.find(s => s.id === r3_2Id) || schools.find(s => s.id === r3_2Id);

    const payload = {
      ...editingResult,
      sportId: resSportId,
      sportName: sport ? sport.name : (editingResult.sportName || ''),
      ageGroup: resAgeGroup,
      athleticsEvent: resAthEvent,
      rank1SchoolId: r1Id,
      rank1SchoolName: r1Id ? (r1School?.name || editingResult.rank1SchoolName || '') : '',
      rank1AthleteName: editingResult.rank1AthleteName || '',
      rank2SchoolId: r2Id,
      rank2SchoolName: r2Id ? (r2School?.name || editingResult.rank2SchoolName || '') : '',
      rank2AthleteName: editingResult.rank2AthleteName || '',
      rank3SchoolId: r3Id,
      rank3SchoolName: r3Id ? (r3School?.name || editingResult.rank3SchoolName || '') : '',
      rank3AthleteName: editingResult.rank3AthleteName || '',
      rank3SchoolId2: r3_2Id,
      rank3SchoolName2: r3_2Id ? (r3_2School?.name || editingResult.rank3SchoolName2 || '') : '',
      rank3AthleteName2: editingResult.rank3AthleteName2 || '',
    };
    Swal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    // อัปเดต state ทันทีเพื่อความลื่นไหลและตอบสนองฉับไว
    setResultsList(prev => {
      const idx = prev.findIndex(item => item.id === payload.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = payload as CompetitionResult;
        return copy;
      }
      return [payload as CompetitionResult, ...prev];
    });

    if (await handlePostRequest({ action: 'updateResult', data: payload })) {
      setEditingResult(null);
      setResSportId('');
      setResAgeGroup('');
      setResAthEvent('');
      setResRegisteredSchools([]);
      setSchoolAthletesMap({});
    }
  };

  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingFeedback) return;
    Swal.fire({ title: 'กำลังบันทึกคำตอบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const success = await handlePostRequest({ 
      action: 'updateFeedback', 
      data: { id: replyingFeedback.id, status: replyStatus, reply: replyText } 
    });
    if (success) {
      setReplyingFeedback(null);
      setReplyText('');
      setReplyStatus('');
    }
  };

  const handleDeleteItem = async (action: string, id: string, name: string) => {
    let confirmText = `ต้องการลบข้อมูล "${name}" ใช่หรือไม่?`;
    if (action === 'deleteAccount') {
      confirmText = `คำเตือน: หากลบโรงเรียน "${name}" ข้อมูลการลงทะเบียน ข้อมูลนักกีฬา และข้อมูลที่เกี่ยวข้องทั้งหมดจะถูกลบออกถาวร!`;
    }

    const confirm = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: confirmText,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'ใช่, ลบทั้งหมดเลย',
      cancelButtonText: 'ยกเลิก'
    });
    if (confirm.isConfirmed) {
      Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await handlePostRequest({ action, data: { id, name } });
    }
  };

  const calculateMedalStandings = (): MedalStanding[] => {
    const standingsMap: Record<string, MedalStanding> = {};
    
    // เริ่มต้นใส่ทุกโรงเรียนที่มีในระบบเข้าไปใน Map เพื่อให้แสดงผลแม้ไม่มีเหรียญ
    schools.forEach(school => {
      standingsMap[school.id] = { 
        schoolId: school.id, 
        schoolName: school.name, 
        gold: 0, 
        silver: 0, 
        bronze: 0, 
        total: 0 
      };
    });

    resultsList.filter(r => r.isPublished).forEach(res => {
      const addMedal = (id: string, name: string, type: 'gold' | 'silver' | 'bronze') => {
        if (!id || !name) return;
        if (!standingsMap[id]) {
          standingsMap[id] = { schoolId: id, schoolName: name, gold: 0, silver: 0, bronze: 0, total: 0 };
        }
        standingsMap[id][type] += 1;
        standingsMap[id].total += 1;
      };

      addMedal(res.rank1SchoolId, res.rank1SchoolName, 'gold');
      addMedal(res.rank2SchoolId, res.rank2SchoolName, 'silver');
      addMedal(res.rank3SchoolId, res.rank3SchoolName, 'bronze');
      if (res.rank3SchoolId2 && res.rank3SchoolName2) {
        addMedal(res.rank3SchoolId2, res.rank3SchoolName2, 'bronze');
      }
    });

    return Object.values(standingsMap).sort((a, b) => {
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      if (b.bronze !== a.bronze) return b.bronze - a.bronze;
      return b.total - a.total;
    });
  };

  const handleExportAllStandingsToExcel = () => {
    const standings = calculateMedalStandings();
    if (standings.length === 0) return;

    let csvContent = "\uFEFF"; 
    csvContent += "ตารางสรุปเหรียญรางวัลรวม (Admin),กลุ่มโรงเรียนตะเคียน-ลมศักดิ์\n";
    csvContent += `รายงานวันที่,${new Date().toLocaleDateString('th-TH')}\n\n`;
    csvContent += "อันดับ,โรงเรียน,เหรียญทอง,เหรียญเงิน,เหรียญทองแดง,เหรียญรวมทั้งหมด\n";

    standings.forEach((school, idx) => {
      csvContent += `${idx + 1},${school.schoolName},${school.gold},${school.silver},${school.bronze},${school.total}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Admin_สรุปเหรียญรางวัลรวม_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMedalsToExcel = () => {
    if (!selectedSchoolForMedals) return;

    const schoolMedals = resultsList.filter(r => r.isPublished && (
      r.rank1SchoolId === selectedSchoolForMedals.schoolId || 
      r.rank2SchoolId === selectedSchoolForMedals.schoolId || 
      r.rank3SchoolId === selectedSchoolForMedals.schoolId ||
      r.rank3SchoolId2 === selectedSchoolForMedals.schoolId
    )).map(r => ({
      sportName: r.sportName,
      ageGroup: r.ageGroup,
      athleticsEvent: r.athleticsEvent || '-',
      rank: r.rank1SchoolId === selectedSchoolForMedals.schoolId ? 'ชนะเลิศ' : 
            r.rank2SchoolId === selectedSchoolForMedals.schoolId ? 'รองชนะเลิศอันดับ 1' : 
            (r.rank3SchoolId2 === selectedSchoolForMedals.schoolId ? 'รองชนะเลิศอันดับ 2 (ร่วม)' : 'รองชนะเลิศอันดับ 2'),
      medalType: r.rank1SchoolId === selectedSchoolForMedals.schoolId ? 'ทอง' : 
                r.rank2SchoolId === selectedSchoolForMedals.schoolId ? 'เงิน' : 'ทองแดง'
    }));

    let csvContent = "\uFEFF";
    csvContent += "รายงานความสำเร็จรายโรงเรียน (Admin)\n";
    csvContent += `โรงเรียน,${selectedSchoolForMedals.schoolName}\n`;
    csvContent += `ทอง,${selectedSchoolForMedals.gold},เงิน,${selectedSchoolForMedals.silver},ทองแดง,${selectedSchoolForMedals.bronze},รวม,${selectedSchoolForMedals.total}\n\n`;
    csvContent += "ลำดับ,กีฬา,รุ่นอายุ,รายการ,อันดับ,เหรียญรางวัล\n";

    schoolMedals.forEach((m, idx) => {
      csvContent += `${idx + 1},${m.sportName},${m.ageGroup},${m.athleticsEvent},${m.rank},${m.medalType}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Admin_สรุปเหรียญ_${selectedSchoolForMedals.schoolName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSportMedalsToExcel = (sportId: string, sportName: string) => {
    const sportResults = resultsList.filter(r => r.sportId === sportId && r.isPublished);
    
    if (sportResults.length === 0) {
      Swal.fire('ไม่มีข้อมูล', 'ยังไม่มีการประกาศผลที่เผยแพร่สำหรับกีฬานี้', 'info');
      return;
    }

    let csvContent = "\uFEFF";
    csvContent += `รายงานสรุปผลการแข่งขันและเหรียญรางวัล - ${sportName},กลุ่มโรงเรียนตะเคียน-ลมศักดิ์\n`;
    csvContent += `ข้อมูล ณ วันที่,${new Date().toLocaleDateString('th-TH')}\n\n`;
    csvContent += "รุ่นอายุ/รายการแข่งขัน,ชนะเลิศ (ทอง),รองชนะเลิศอันดับ 1 (เงิน),รองชนะเลิศอันดับ 2 (ทองแดง)\n";

    sportResults.forEach(res => {
      const category = res.athleticsEvent ? `${res.ageGroup} (${res.athleticsEvent})` : res.ageGroup;
      const bronzeDisplay = res.rank3SchoolName2
        ? `"${(res.rank3SchoolName || '-') + ' และ ' + res.rank3SchoolName2 + ' (อันดับ 3 ร่วม)'}"`
        : `"${res.rank3SchoolName || '-'}"`;
      csvContent += `"${category}","${res.rank1SchoolName || '-'}","${res.rank2SchoolName || '-'}",${bronzeDisplay}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Admin_สรุปผล_${sportName}_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintCertificates = async (result: CompetitionResult, rank: 1 | 2 | 3 | 'all' = 'all', roleFilter: 'all' | 'athletes' | 'coaches' = 'all') => {
    setIsGenerating(true);
    Swal.fire({ 
      title: 'กำลังคำนวณลำดับเลขที่เกียรติบัตร...', 
      html: '<p class="text-xs text-slate-500 mt-1">กำลังเตรียมข้อมูลนักกีฬาและครูผู้ฝึกสอน...</p>',
      allowOutsideClick: false, 
      didOpen: () => Swal.showLoading() 
    });
    try {
      const getAthletesList = async (schoolId: string) => {
        if (!schoolId) return [];
        let url = `${SCRIPT_URL}?action=getAthletes&schoolId=${schoolId}&sportId=${result.sportId}&ageGroup=${encodeURIComponent(result.ageGroup)}`;
        if (result.athleticsEvent) url += `&athleticsEvent=${encodeURIComponent(result.athleticsEvent)}`;
        const res = await fetch(url);
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      };

      const [athletesR1, athletesR2, athletesR3, athletesR3_2] = await Promise.all([
        getAthletesList(result.rank1SchoolId),
        getAthletesList(result.rank2SchoolId),
        getAthletesList(result.rank3SchoolId),
        getAthletesList(result.rank3SchoolId2 || '')
      ]);

      const coachesR1 = extractCoachesFromAthletes(athletesR1);
      const coachesR2 = extractCoachesFromAthletes(athletesR2);
      const coachesR3 = extractCoachesFromAthletes(athletesR3);
      const coachesR3_2 = extractCoachesFromAthletes(athletesR3_2);

      // ตรวจสอบโรงเรียนที่ได้รับรางวัลหลายอันดับ (เช่น กรีฑา รุ่นอายุไม่เกิน 15 ปี)
      const rankSchoolIds = [
        result.rank1SchoolId, 
        result.rank2SchoolId, 
        result.rank3SchoolId, 
        result.rank3SchoolId2 || ''
      ].filter(Boolean);

      const schoolRankCount: Record<string, number> = {};
      rankSchoolIds.forEach(id => {
        schoolRankCount[id] = (schoolRankCount[id] || 0) + 1;
      });

      const schoolAssignedIdx: Record<string, number> = {};
      const isRelay = (result.athleticsEvent || '').includes('ผลัด');

      const getAthletesForRank = (schoolId: string, allAthletes: Athlete[]): Athlete[] => {
        if (!schoolId || !allAthletes || allAthletes.length === 0) return [];
        const appearsMultipleTimes = (schoolRankCount[schoolId] || 0) > 1;
        if (!isRelay && appearsMultipleTimes && allAthletes.length > 1) {
          const currentIdx = schoolAssignedIdx[schoolId] || 0;
          schoolAssignedIdx[schoolId] = currentIdx + 1;
          const assignedAth = allAthletes[currentIdx] || allAthletes[allAthletes.length - 1];
          return [assignedAth];
        }
        return allAthletes;
      };

      const finalAthletesR1 = getAthletesForRank(result.rank1SchoolId, athletesR1);
      const finalAthletesR2 = getAthletesForRank(result.rank2SchoolId, athletesR2);
      const finalAthletesR3 = getAthletesForRank(result.rank3SchoolId, athletesR3);
      const finalAthletesR3_2 = getAthletesForRank(result.rank3SchoolId2 || '', athletesR3_2);

      const cleanAthleticsEvent = result.athleticsEvent ? result.athleticsEvent.replace(/^\d+\s+/, '') : '';
      const eventName = cleanAthleticsEvent ? `${result.sportName} (${cleanAthleticsEvent})` : result.sportName;

      interface PrintItem {
        certNo: string;
        recipientName: string;
        schoolName: string;
        rankTitle: string;
        achievementText: string;
        eventName: string;
        ageGroup: string;
        isCoach: boolean;
        rank: 1 | 2 | 3;
      }

      const allItems: PrintItem[] = [];
      let globalCounter = 0;

      // 1. ชนะเลิศ
      if (result.rank1AthleteName) {
        allItems.push({
          certNo: formatCertNo(result.certStartNo || '', globalCounter++),
          recipientName: result.rank1AthleteName,
          schoolName: result.rank1SchoolName,
          rankTitle: 'ชนะเลิศ',
          achievementText: 'ได้รับรางวัล ชนะเลิศ',
          eventName: eventName,
          ageGroup: result.ageGroup,
          isCoach: false,
          rank: 1
        });
      } else {
        finalAthletesR1.forEach(ath => {
          allItems.push({
            certNo: formatCertNo(result.certStartNo || '', globalCounter++),
            recipientName: `${ath.prefix}${ath.firstName} ${ath.lastName}`.trim(),
            schoolName: result.rank1SchoolName,
            rankTitle: 'ชนะเลิศ',
            achievementText: 'ได้รับรางวัล ชนะเลิศ',
            eventName: eventName,
            ageGroup: result.ageGroup,
            isCoach: false,
            rank: 1
          });
        });
      }
      coachesR1.forEach(coach => {
        allItems.push({
          certNo: formatCertNo(result.certStartNo || '', globalCounter++),
          recipientName: coach.fullName,
          schoolName: result.rank1SchoolName,
          rankTitle: 'ชนะเลิศ',
          achievementText: 'ครูผู้ฝึกสอน ได้รับรางวัล ชนะเลิศ',
          eventName: eventName,
          ageGroup: result.ageGroup,
          isCoach: true,
          rank: 1
        });
      });

      // 2. รองชนะเลิศอันดับ 1
      if (result.rank2AthleteName) {
        allItems.push({
          certNo: formatCertNo(result.certStartNo || '', globalCounter++),
          recipientName: result.rank2AthleteName,
          schoolName: result.rank2SchoolName,
          rankTitle: 'รองชนะเลิศอันดับ 1',
          achievementText: 'ได้รับรางวัล รองชนะเลิศอันดับ 1',
          eventName: eventName,
          ageGroup: result.ageGroup,
          isCoach: false,
          rank: 2
        });
      } else {
        finalAthletesR2.forEach(ath => {
          allItems.push({
            certNo: formatCertNo(result.certStartNo || '', globalCounter++),
            recipientName: `${ath.prefix}${ath.firstName} ${ath.lastName}`.trim(),
            schoolName: result.rank2SchoolName,
            rankTitle: 'รองชนะเลิศอันดับ 1',
            achievementText: 'ได้รับรางวัล รองชนะเลิศอันดับ 1',
            eventName: eventName,
            ageGroup: result.ageGroup,
            isCoach: false,
            rank: 2
          });
        });
      }
      coachesR2.forEach(coach => {
        allItems.push({
          certNo: formatCertNo(result.certStartNo || '', globalCounter++),
          recipientName: coach.fullName,
          schoolName: result.rank2SchoolName,
          rankTitle: 'รองชนะเลิศอันดับ 1',
          achievementText: 'ครูผู้ฝึกสอน ได้รับรางวัล รองชนะเลิศอันดับ 1',
          eventName: eventName,
          ageGroup: result.ageGroup,
          isCoach: true,
          rank: 2
        });
      });

      // 3. รองชนะเลิศอันดับ 2
      if (result.rank3AthleteName) {
        allItems.push({
          certNo: formatCertNo(result.certStartNo || '', globalCounter++),
          recipientName: result.rank3AthleteName,
          schoolName: result.rank3SchoolName,
          rankTitle: 'รองชนะเลิศอันดับ 2',
          achievementText: 'ได้รับรางวัล รองชนะเลิศอันดับ 2',
          eventName: eventName,
          ageGroup: result.ageGroup,
          isCoach: false,
          rank: 3
        });
      } else {
        finalAthletesR3.forEach(ath => {
          allItems.push({
            certNo: formatCertNo(result.certStartNo || '', globalCounter++),
            recipientName: `${ath.prefix}${ath.firstName} ${ath.lastName}`.trim(),
            schoolName: result.rank3SchoolName,
            rankTitle: 'รองชนะเลิศอันดับ 2',
            achievementText: 'ได้รับรางวัล รองชนะเลิศอันดับ 2',
            eventName: eventName,
            ageGroup: result.ageGroup,
            isCoach: false,
            rank: 3
          });
        });
      }
      coachesR3.forEach(coach => {
        allItems.push({
          certNo: formatCertNo(result.certStartNo || '', globalCounter++),
          recipientName: coach.fullName,
          schoolName: result.rank3SchoolName,
          rankTitle: 'รองชนะเลิศอันดับ 2',
          achievementText: 'ครูผู้ฝึกสอน ได้รับรางวัล รองชนะเลิศอันดับ 2',
          eventName: eventName,
          ageGroup: result.ageGroup,
          isCoach: true,
          rank: 3
        });
      });

      // 4. รองชนะเลิศอันดับ 2 (ร่วม)
      if (result.rank3SchoolId2 && result.rank3SchoolName2) {
        if (result.rank3AthleteName2) {
          allItems.push({
            certNo: formatCertNo(result.certStartNo || '', globalCounter++),
            recipientName: result.rank3AthleteName2,
            schoolName: result.rank3SchoolName2!,
            rankTitle: 'รองชนะเลิศอันดับ 2 (ร่วม)',
            achievementText: 'ได้รับรางวัล รองชนะเลิศอันดับ 2 (ร่วม)',
            eventName: eventName,
            ageGroup: result.ageGroup,
            isCoach: false,
            rank: 3
          });
        } else {
          finalAthletesR3_2.forEach(ath => {
            allItems.push({
              certNo: formatCertNo(result.certStartNo || '', globalCounter++),
              recipientName: `${ath.prefix}${ath.firstName} ${ath.lastName}`.trim(),
              schoolName: result.rank3SchoolName2!,
              rankTitle: 'รองชนะเลิศอันดับ 2 (ร่วม)',
              achievementText: 'ได้รับรางวัล รองชนะเลิศอันดับ 2 (ร่วม)',
              eventName: eventName,
              ageGroup: result.ageGroup,
              isCoach: false,
              rank: 3
            });
          });
        }
        coachesR3_2.forEach(coach => {
          allItems.push({
            certNo: formatCertNo(result.certStartNo || '', globalCounter++),
            recipientName: coach.fullName,
            schoolName: result.rank3SchoolName2!,
            rankTitle: 'รองชนะเลิศอันดับ 2 (ร่วม)',
            achievementText: 'ครูผู้ฝึกสอน ได้รับรางวัล รองชนะเลิศอันดับ 2 (ร่วม)',
            eventName: eventName,
            ageGroup: result.ageGroup,
            isCoach: true,
            rank: 3
          });
        });
      }

      let printItems = allItems;
      if (rank !== 'all') {
        printItems = printItems.filter(item => item.rank === rank);
      }
      if (roleFilter === 'athletes') {
        printItems = printItems.filter(item => !item.isCoach);
      } else if (roleFilter === 'coaches') {
        printItems = printItems.filter(item => item.isCoach);
      }

      if (printItems.length === 0) { 
        Swal.fire('ไม่พบข้อมูล', 'ไม่มีรายชื่อตามเงื่อนไขที่เลือก (นักกีฬา/ครูผู้ฝึกสอน)', 'info'); 
        return; 
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const sportDef = sportTypes.find(s => s.id === result.sportId);
      const bgTemplate = sportDef?.certTemplate || '';

      const certsHtml = printItems.map((item) => `
        <div class="certificate-page">
          ${bgTemplate ? `<img src="${bgTemplate}" class="bg-template" />` : ''}
          <div class="content-container">
            <div class="header-section"><div class="cert-no">เลขที่ ${item.certNo}</div></div>
            <div class="body-section">              
              <div class="recipient-name">${item.recipientName}</div>
              <div class="school-name">${item.schoolName}</div>              
              <div class="achievement-details">
                <div class="achievement-text">${item.achievementText}</div>
                <div class="event-text">ประเภทกีฬา ${item.eventName} รุ่น${item.ageGroup}</div>
              </div>
            </div>
          </div>
        </div>
      `).join('');

      printWindow.document.write(`
        <html>
          <head>
            <title>เกียรติบัตร - ${result.sportName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
            <style>
              @page { size: A4 landscape; margin: 0; }
              body { margin: 0; padding: 0; font-family: 'Sarabun', sans-serif; background: #f0f0f0; }
              .certificate-page { width: 297mm; height: 210mm; background: white; display: flex; align-items: center; justify-content: center; page-break-after: always; position: relative; overflow: hidden; }
              .bg-template { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: fill; z-index: 1; }
              .content-container { position: relative; z-index: 5; width: 100%; height: 100%; text-align: center; display: flex; flex-direction: column; justify-content: center; padding: 40px 60px; box-sizing: border-box; }
              .cert-no { position: absolute; top: 55px; right: 70px; font-size: 16pt; font-weight: bold; color: #1e293b; }
              .body-section { flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2px; margin-top: -65px; }
              .recipient-name { font-size: 20pt; font-weight: bold; color: #1e40af; margin-bottom: 5px; line-height: 1.1; letter-spacing: -1px; }
              .school-name { font-size: 18pt; font-weight: bold; color: #334155; margin-bottom: 20px; }
              .achievement-text { font-size: 18pt; color: #334155; font-weight: bold; }
              .event-text { font-size: 18pt; color: #334155; font-weight: bold; }
            </style>
          </head>
          <body>
            ${certsHtml}
            <script>window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 800); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
      Swal.close();
    } catch (error) {
      console.error('Cert error:', error);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างเกียรติบัตรได้', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderMedalDetailsModal = () => {
    if (!selectedSchoolForMedals) return null;

    const schoolMedals = resultsList.filter(r => r.isPublished && (
      r.rank1SchoolId === selectedSchoolForMedals.schoolId || 
      r.rank2SchoolId === selectedSchoolForMedals.schoolId || 
      r.rank3SchoolId === selectedSchoolForMedals.schoolId ||
      r.rank3SchoolId2 === selectedSchoolForMedals.schoolId
    )).map(r => ({
      ...r,
      type: r.rank1SchoolId === selectedSchoolForMedals.schoolId ? 'gold' : 
            r.rank2SchoolId === selectedSchoolForMedals.schoolId ? 'silver' : 'bronze'
    }));

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-8 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-2xl font-black">{selectedSchoolForMedals.schoolName}</h3>
              <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-1">รายละเอียดความสำเร็จรายโรงเรียน</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleExportMedalsToExcel}
                className="relative z-20 p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all active:scale-95"
                title="ส่งออกเป็นไฟล์ Excel"
              >
                <FileDown size={20} />
              </button>
              <button onClick={() => setSelectedSchoolForMedals(null)} className="relative z-20 p-2 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <Medal className="absolute right-[-20px] bottom-[-20px] w-48 h-48 text-white/5 rotate-12" />
          </div>
          
          <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-yellow-50 p-4 rounded-3xl border border-yellow-100 text-center">
                <Medal size={24} className="text-yellow-500 mx-auto mb-2" />
                <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">เหรียญทอง</p>
                <p className="text-2xl font-black text-yellow-700">{selectedSchoolForMedals.gold}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center">
                <Medal size={24} className="text-slate-400 mx-auto mb-2" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">เหรียญเงิน</p>
                <p className="text-2xl font-black text-slate-700">{selectedSchoolForMedals.silver}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100 text-center">
                <Medal size={24} className="text-orange-600 mx-auto mb-2" />
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">เหรียญทองแดง</p>
                <p className="text-2xl font-black text-orange-700">{selectedSchoolForMedals.bronze}</p>
              </div>
            </div>

            <div className="space-y-3">
              {schoolMedals.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                  <p className="text-slate-400 font-bold">ยังไม่มีข้อมูลเหรียญรางวัล</p>
                </div>
              ) : (
                schoolMedals.map((medal, idx) => (
                  <div key={idx} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:border-blue-200 transition-all shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        medal.type === 'gold' ? 'bg-yellow-100 text-yellow-600' : 
                        medal.type === 'silver' ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-orange-600'
                      }`}>
                        <Medal size={24} />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{medal.sportName}</p>
                        <p className="text-[10px] font-bold text-slate-400">{medal.ageGroup} {medal.athleticsEvent ? `• ${medal.athleticsEvent}` : ''}</p>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${
                      medal.type === 'gold' ? 'bg-yellow-500 text-white' : 
                      medal.type === 'silver' ? 'bg-slate-400 text-white' : 'bg-orange-600 text-white'
                    }`}>
                      {medal.type === 'gold' ? 'ทอง' : medal.type === 'silver' ? 'เงิน' : 'ทองแดง'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="p-6 bg-slate-50 text-center flex items-center justify-center gap-4">
             <button 
              onClick={handleExportMedalsToExcel} 
              className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95"
             >
                <FileDown size={18} />
                ส่งออก Excel
             </button>
             <button onClick={() => setSelectedSchoolForMedals(null)} className="px-8 py-3 bg-white border border-slate-200 rounded-2xl font-black text-sm text-slate-600 hover:bg-slate-100 transition-all active:scale-95 shadow-sm">
                ปิดหน้าต่าง
             </button>
          </div>
        </div>
      </div>
    );
  };

  const filteredSchools = schools.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredAgeGroups = ageGroups.filter(a => a.age.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSportTypes = sportTypes.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredAthletics = athleticsList.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.eventNo.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredResults = resultsList.filter(r => 
    r.sportName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (r.athleticsEvent && r.athleticsEvent.toLowerCase().includes(searchTerm.toLowerCase())) ||
    r.ageGroup.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredFeedback = feedbackList.filter(f => 
    f.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLatestGlobalCertNo = () => {
    const issuedResults = resultsList.filter(r => r.certEndNo);
    if (issuedResults.length === 0) return 'ยังไม่มีการออกเลข';
    const sorted = [...issuedResults].sort((a, b) => (b.certEndNo || '').localeCompare(a.certEndNo || ''));
    return sorted[0].certEndNo || 'ไม่มีข้อมูล';
  };

  const isAthletics = sportTypes.find(s => s.id === resSportId)?.name.includes('กรีฑา');

  // Calculate announcement progress based on announcementStats
  const sportProgressData = sportTypes.map(sport => {
    const sportId = sport.id;
    const sportResults = resultsList.filter(r => r.sportId === sportId);
    const isAth = sport.name.includes('กรีฑา');

    const stat = announcementStats[sportId] || { count: 0, items: [] };
    const totalExpected = stat.count;
    const expectedItems = stat.items;
    
    // Find results for this sport in resultsList
    const sportRecords = resultsList.filter(r => r.sportId === sportId);

    let publishedCount = 0;
    let publishedLabels: string[] = [];

    if (isAth) {
      const publishedEventsSet = new Set<string>(sportRecords.filter(r => r.isPublished).map(r => r.athleticsEvent));
      publishedLabels = Array.from(publishedEventsSet);
      publishedCount = publishedLabels.length;
    } else {
      const publishedAgesSet = new Set<string>(sportRecords.filter(r => r.isPublished).map(r => r.ageGroup));
      publishedLabels = Array.from(publishedAgesSet);
      publishedCount = publishedLabels.length;
    }

    const percentage = totalExpected > 0 ? (publishedCount / totalExpected) * 100 : 0;
    
    return {
      ...sport,
      totalExpected,
      publishedCount,
      percentage,
      sportRecords // สรุปรายการทั้งหมดที่มีในฐานข้อมูล
    };
  });

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-32">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
      <p className="text-slate-500 font-bold">กำลังเชื่อมต่อฐานข้อมูล...</p>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-screen max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      <input type="file" ref={templateInputRef} onChange={onTemplateFileChange} accept="image/*" className="hidden" />
      <input type="file" ref={pdfInputRef} onChange={onPdfFileChange} accept="application/pdf" className="hidden" />

      <aside className="lg:w-72 flex-shrink-0">
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden sticky top-24">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-black text-slate-800 flex items-center gap-3 text-sm uppercase tracking-wider">
              <div className="p-2 bg-blue-600 rounded-xl text-white"><Menu size={16} /></div>
              ระบบจัดการ (Admin)
            </h3>
          </div>
          <nav className="p-4 space-y-2">
            {[
              { id: 'overview', label: 'ภาพรวมระบบ', icon: <LayoutDashboard size={20} />, color: 'blue' },
              { id: 'accounts', label: 'จัดการบัญชีโรงเรียน', icon: <Users size={20} />, color: 'blue' },
              { id: 'ageGroups', label: 'จัดการรุ่นอายุ/เพศ', icon: <Trophy size={20} />, color: 'indigo' },
              { id: 'sportTypes', label: 'จัดการประเภทกีฬา', icon: <Dribbble size={20} />, color: 'emerald' },
              { id: 'athletics', label: 'จัดการรายการกรีฑา', icon: <PersonStanding size={20} />, color: 'orange' },
              { id: 'results', label: 'จัดการผลการแข่งขัน', icon: <Award size={20} />, color: 'amber' },
              { id: 'certificates', label: 'จัดการเกียรติบัตร', icon: <ScrollText size={20} />, color: 'rose' },
              { id: 'feedback-view', label: 'ดูข้อเสนอแนะ', icon: <MessageSquare size={20} />, color: 'violet' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setSearchTerm(''); }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${
                  (activeTab as string) === item.id 
                    ? `bg-${item.color}-600 text-white shadow-lg scale-[1.02]` 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="font-bold text-sm">{item.label}</span>
                </div>
                <ChevronRight size={16} className={activeTab === item.id ? 'translate-x-1' : 'opacity-0'} />
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex-grow space-y-6">
        {renderMedalDetailsModal()}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 p-4 rounded-3xl backdrop-blur-sm border border-white">
          <h2 className="text-2xl font-black text-slate-800 px-2">
            {activeTab === 'overview' ? 'ภาพรวมการแข่งขัน' :
             activeTab === 'accounts' ? 'บัญชีผู้ใช้งาน' : 
             activeTab === 'ageGroups' ? 'รุ่นอายุและเพศ' : 
             activeTab === 'sportTypes' ? 'รายการชนิดกีฬา' : 
             activeTab === 'athletics' ? 'รายการกรีฑา' : 
             activeTab === 'results' ? 'จัดการผลการแข่งขัน' : 
             activeTab === 'certificates' ? 'จัดการออกเกียรติบัตร' : 'รายการข้อเสนอแนะ'}
          </h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab !== 'overview' && (
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-full outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm" />
              </div>
            )}
            <button onClick={handleRefresh} className={`p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-all ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-400'}`}><RefreshCw size={20} /></button>
            {activeTab !== 'certificates' && activeTab !== 'feedback-view' && activeTab !== 'overview' && (
              <button 
                onClick={() => {
                  setIsAddingNew(true);
                  if (activeTab === 'accounts') setEditingSchool({ id: Date.now().toString(), name: '', username: '', password: '' });
                  if (activeTab === 'ageGroups') setEditingAgeGroup({ id: `AG-${Date.now()}`, age: '', gender: 'ชาย' });
                  if (activeTab === 'sportTypes') setEditingSportType({ id: `S-${Date.now()}`, name: '', description: '', certTemplate: '', rulesPdf: '' });
                  if (activeTab === 'athletics') setEditingAthletics({ id: `AT-${Date.now()}`, eventNo: '', name: '', description: '' });
                  if (activeTab === 'results') {
                      setEditingResult({ id: `RES-${Date.now()}`, rank1SchoolId: '', rank2SchoolId: '', rank3SchoolId: '', rank3SchoolId2: '' });
                      setResSportId(''); setResAgeGroup(''); setResAthEvent('');
                  }
                }}
                className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 text-sm text-white ${
                  activeTab === 'accounts' ? 'bg-blue-600' : activeTab === 'ageGroups' ? 'bg-indigo-600' : activeTab === 'sportTypes' ? 'bg-emerald-600' : activeTab === 'athletics' ? 'bg-orange-600' : 'bg-amber-600'
                }`}
              >
                <Plus size={18} /> เพิ่มใหม่
              </button>
            )}
          </div>
        </div>

        {activeTab === 'overview' && (
           <div className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">โรงเรียนทั้งหมด</p>
                    <p className="text-2xl font-black text-slate-800">{schools.length} แห่ง</p>
                 </div>
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">รายการกีฬา</p>
                    <p className="text-2xl font-black text-slate-800">{sportTypes.length} ชนิด</p>
                 </div>
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ผลการแข่งขัน</p>
                    <p className="text-2xl font-black text-slate-800">{resultsList.filter(r => r.isPublished).length} รายการ</p>
                 </div>
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ข้อเสนอแนะ</p>
                    <p className="text-2xl font-black text-slate-800">{feedbackList.length} เรื่อง</p>
                 </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl border border-slate-100 overflow-hidden">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200"><BarChart3 size={24} /></div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-800">ตารางสรุปเหรียญรางวัลรวม</h3>
                        <p className="text-slate-400 text-sm font-bold mt-0.5 uppercase tracking-widest">Global Medal Standings</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleExportAllStandingsToExcel}
                      className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                    >
                      <FileDown size={18} />
                      ส่งออก Excel
                    </button>
                 </div>

                 {calculateMedalStandings().length === 0 ? (
                   <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                      <Trophy className="mx-auto text-slate-200 mb-4" size={56} />
                      <p className="text-slate-400 font-bold max-w-xs mx-auto">ยังไม่มีข้อมูลเหรียญรางวัลที่ถูกเผยแพร่</p>
                   </div>
                 ) : (
                   <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-inner">
                      <table className="w-full text-left">
                        <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                          <tr>
                            <th className="px-8 py-5 w-20 text-center">อันดับ</th>
                            <th className="px-8 py-5">โรงเรียน</th>
                            <th className="px-8 py-5 text-center bg-yellow-500/10">
                              <div className="flex flex-col items-center gap-1">
                                 <Medal size={16} className="text-yellow-500" />
                                 <span>ทอง</span>
                              </div>
                            </th>
                            <th className="px-8 py-5 text-center bg-slate-400/10">
                              <div className="flex flex-col items-center gap-1">
                                 <Medal size={16} className="text-slate-400" />
                                 <span>เงิน</span>
                              </div>
                            </th>
                            <th className="px-8 py-5 text-center bg-amber-600/10">
                              <div className="flex flex-col items-center gap-1">
                                 <Medal size={16} className="text-amber-600" />
                                 <span>ทองแดง</span>
                              </div>
                            </th>
                            <th className="px-8 py-5 text-center bg-blue-600/10">
                              <div className="flex flex-col items-center gap-1">
                                 <CheckCircle2 size={16} className="text-blue-600" />
                                 <span>รวม</span>
                              </div>
                            </th>
                            <th className="px-8 py-5 text-center">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {calculateMedalStandings().map((school, idx) => (
                            <tr 
                              key={school.schoolId} 
                              onClick={() => setSelectedSchoolForMedals(school)}
                              className="hover:bg-amber-50/40 transition-all cursor-pointer group"
                            >
                              <td className="px-8 py-5 text-center font-black text-slate-400">{idx + 1}</td>
                              <td className="px-8 py-5 font-black text-slate-800 text-sm">{school.schoolName}</td>
                              <td className="px-8 py-5 text-center font-black text-slate-700 text-lg">{school.gold}</td>
                              <td className="px-8 py-5 text-center font-black text-slate-700 text-lg">{school.silver}</td>
                              <td className="px-8 py-5 text-center font-black text-slate-700 text-lg">{school.bronze}</td>
                              <td className="px-8 py-5 text-center font-black text-blue-600 text-xl">{school.total}</td>
                              <td className="px-8 py-5 text-center">
                                 <div className="p-2 bg-slate-100 text-slate-400 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                                    <Eye size={18} />
                                 </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                 )}
              </div>
           </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-600 text-white rounded-xl shadow-md"><Target size={20} /></div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800">ความก้าวหน้าการประกาศผลรายชนิดกีฬา</h3>
                        <p className="text-slate-400 text-xs font-bold mt-0.5">บริหารจัดการการแสดงผลให้โรงเรียนเห็นได้จากส่วนนี้</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 flex items-center gap-2">
                     <TrophyIcon size={16} className="text-blue-600" />
                     <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">การประกาศผลและเหรียญรางวัล</span>
                  </div>
                </div>

                {sportProgressData.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                    <AlertCircle className="mx-auto text-slate-200 mb-4" size={56} />
                    <p className="text-slate-400 font-bold max-w-xs mx-auto">กำลังเตรียมข้อมูลรายการแข่งขัน...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sportProgressData.map((s) => (
                        <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-6 hover:border-blue-400 transition-all group relative overflow-hidden">
                          <div className="flex justify-between items-start mb-4 relative z-10">
                              <div className="max-w-[180px]">
                                <h4 className="font-black text-slate-800 text-base leading-tight truncate">{s.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">
                                  เผยแพร่แล้ว {s.publishedCount} / {s.totalExpected} รายการ
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${s.percentage >= 100 && s.totalExpected > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {s.totalExpected > 0 ? s.percentage.toFixed(0) : 0}%
                                </span>
                                <button 
                                  onClick={() => handleExportSportMedalsToExcel(s.id, s.name)}
                                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm"
                                  title="ส่งออกรายงานสรุปเหรียญ"
                                >
                                  <FileDown size={14} />
                                </button>
                              </div>
                          </div>
                          
                          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden mb-6 shadow-inner relative z-10">
                              <div 
                                className={`h-full transition-all duration-1000 ${s.percentage >= 100 && s.totalExpected > 0 ? 'bg-emerald-50 shadow-lg shadow-emerald-100' : 'bg-blue-500 shadow-lg shadow-blue-100'}`} 
                                style={{ width: `${s.totalExpected > 0 ? Math.min(s.percentage, 100) : 0}%` }}
                              />
                          </div>

                          <button 
                              onClick={() => setShowProgressDetails(showProgressDetails === s.id ? null : s.id)}
                              className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 hover:text-blue-600 flex items-center justify-center gap-2 group-hover:bg-blue-50 transition-all relative z-10"
                          >
                              {showProgressDetails === s.id ? <><ChevronUp size={14} /> ซ่อนรายละเอียด</> : <><Info size={14} /> ดูและจัดการการเผยแพร่</>}
                          </button>

                          {showProgressDetails === s.id && (
                              <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2 relative z-10">
                                {s.sportRecords && s.sportRecords.length > 0 ? (
                                   <div className="space-y-3">
                                      {s.sportRecords.map((rec: CompetitionResult) => (
                                        <div key={rec.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group/rec hover:border-amber-200 transition-colors">
                                           <div className="flex-grow min-w-0">
                                              <p className="text-[11px] font-black text-slate-800 leading-tight truncate">{rec.ageGroup}</p>
                                              {rec.athleticsEvent && (
                                                <p className="text-[9px] font-bold text-slate-400 mt-0.5 truncate">{rec.athleticsEvent}</p>
                                              )}
                                           </div>
                                           <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => handleOpenEditResult(rec)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
                                                title="คลิกเพื่อแก้ไขข้อมูลผลการแข่งขันและนักเรียน"
                                              >
                                                <Edit2 size={12} />
                                                <span>แก้ไขผล</span>
                                              </button>
                                              <label className="flex items-center gap-2 cursor-pointer group/toggle">
                                                <div 
                                                  onClick={() => handleTogglePublish(rec)}
                                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                                                    rec.isPublished 
                                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-500'
                                                  }`}
                                                >
                                                  {rec.isPublished ? <CheckSquare size={14} /> : <Square size={14} />}
                                                  <span className="text-[9px] font-black uppercase tracking-widest">แสดงให้โรงเรียนเห็น</span>
                                                </div>
                                              </label>
                                           </div>
                                        </div>
                                      ))}
                                   </div>
                                ) : (
                                   <div className="bg-slate-100 p-4 rounded-xl text-center">
                                      <AlertCircle size={20} className="mx-auto text-slate-300 mb-1" />
                                      <p className="text-[10px] font-black text-slate-400 uppercase">ไม่พบผลการแข่งขันที่บันทึกไว้</p>
                                   </div>
                                )}
                              </div>
                          )}
                          <Dribbble className="absolute right-[-20px] bottom-[-20px] w-32 h-32 text-slate-100/30 -rotate-12 group-hover:text-blue-50 transition-colors" />
                        </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'feedback-view' && (
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <th className="px-8 py-5">วันเวลา</th>
                    <th className="px-8 py-5">โรงเรียน</th>
                    <th className="px-8 py-5">สถานะ</th>
                    <th className="px-8 py-5">หัวข้อ / รายละเอียด</th>
                    <th className="px-8 py-5 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFeedback.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <MessageSquare className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-slate-400 font-bold">ไม่พบรายการข้อเสนอแนะ</p>
                      </td>
                    </tr>
                  ) : (
                    filteredFeedback.map(fb => (
                      <tr key={fb.id} className="hover:bg-violet-50/30 transition-all">
                        <td className="px-8 py-5 text-xs text-slate-400 font-medium">
                          {new Date(fb.timestamp).toLocaleString('th-TH')}
                        </td>
                        <td className="px-8 py-5 font-black text-slate-800 text-sm">
                          {fb.schoolName}
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                            fb.status === 'เสร็จสิ้น' || fb.status === 'แก้ไขแล้ว' ? 'bg-emerald-100 text-emerald-600' : 
                            fb.status === 'รอดำเนินการ' ? 'bg-amber-100 text-amber-600' : 
                            fb.status === 'ไม่สามารถดำเนินการได้' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {fb.status}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-bold text-slate-900 text-sm mb-1">{fb.subject}</div>
                          <div className="text-xs text-slate-500 leading-relaxed max-w-md line-clamp-2">{fb.details}</div>
                          {fb.reply && (
                            <div className="mt-2 p-2 bg-slate-50 rounded-lg border-l-2 border-violet-400 flex items-start gap-2">
                              <Reply size={12} className="text-violet-500 mt-1" />
                              <div className="text-[10px] text-slate-600 italic">ตอบกลับ: {fb.reply}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-5 text-center">
                          <button 
                            onClick={() => {
                              setReplyingFeedback(fb);
                              setReplyText(fb.reply || '');
                              setReplyStatus(fb.status);
                            }}
                            className="p-2 bg-violet-100 text-violet-600 hover:bg-violet-600 hover:text-white rounded-xl transition-all shadow-sm"
                            title="จัดการและตอบกลับ"
                          >
                            <MessageSquare size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'certificates' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-in slide-in-from-top-4">
            <div className="md:col-span-2 bg-gradient-to-br from-rose-500 to-rose-700 p-6 rounded-[2rem] text-white shadow-xl shadow-rose-200 flex flex-col justify-between relative overflow-hidden">
               <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2 opacity-80">
                    <Zap size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">System Update</span>
                  </div>
                  <h3 className="text-xl font-black mb-1">เลขที่เกียรติบัตรล่าสุดที่ออกในระบบ</h3>
                  <p className="text-4xl font-black tracking-tight">{getLatestGlobalCertNo()}</p>
               </div>
               <ScrollText className="absolute right-[-20px] bottom-[-20px] w-48 h-48 opacity-10 rotate-12" />
               <div className="relative z-10 mt-4">
                  <button 
                    onClick={() => {
                      const last = getLatestGlobalCertNo();
                      if (last !== 'ยังไม่มีการออกเลข' && last !== 'ไม่มีข้อมูล') {
                        navigator.clipboard.writeText(last);
                        Swal.fire({ icon: 'success', title: 'คัดลอกแล้ว', text: `เลขที่ ${last} ถูกคัดลอกลงคลิปบอร์ด`, timer: 1000, showConfirmButton: false });
                      }
                    }}
                    className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-white/30 transition-all active:scale-95"
                  >
                    <ClipboardCopy size={14} /> คัดลอกเลขลำดับสุดท้าย
                  </button>
               </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
                  <Printer size={32} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">สถานะระบบ</p>
               <p className="text-lg font-black text-slate-800">พร้อมออกเกียรติบัตร</p>
            </div>
          </div>
        )}

        {activeTab !== 'feedback-view' && activeTab !== 'overview' && (
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 text-[10px] uppercase font-black border-b bg-slate-50/50">
                    <th className="px-8 py-5 w-24 text-center">{activeTab === 'results' || activeTab === 'certificates' ? 'กีฬา' : 'ที่'}</th>
                    <th className="px-8 py-5">{activeTab === 'results' || activeTab === 'certificates' ? 'รุ่น / รายการ' : (activeTab === 'accounts' ? 'ชื่อโรงเรียน' : 'ชื่อรายการ')}</th>
                    <th className="px-8 py-5">
                      {activeTab === 'sportTypes' ? 'เอกสาร/เทมเพลต' : (activeTab === 'certificates' ? 'กำหนดเลขที่เกียรติบัตร' : (activeTab === 'results' ? 'สรุปผู้ชนะ' : (activeTab === 'accounts' ? 'ชื่อผู้ใช้ / รหัสผ่าน' : 'รายละเอียด')))}
                    </th>
                    {activeTab === 'accounts' && (
                      <th className="px-6 py-5 min-w-[280px]">
                        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
                          <TrophyIcon size={14} className="text-amber-500" />
                          <span>สนามกีฬาที่รับผิดชอบ (Live Score)</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          เพิ่ม / ลบ / แก้ไข ได้หลายชนิดกีฬา
                        </div>
                      </th>
                    )}
                    <th className="px-8 py-5 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeTab === 'accounts' && filteredSchools.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-blue-50/20 transition-all">
                      <td className="px-8 py-5 font-black text-slate-300 text-center">{idx + 1}</td>
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-800 text-sm">{s.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {s.id}</div>
                      </td>
                      <td className="px-8 py-5 font-mono text-xs text-slate-500">
                        <div className="inline-flex flex-col sm:flex-row sm:items-center gap-1.5">
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 font-bold">User: {s.username}</span>
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-500">Pass: {s.password}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 min-w-[280px]">
                        {(() => {
                          const schoolSports = parseResponsibleSports(s.responsibleSport);
                          const availableSports = sportTypes.filter(st => !schoolSports.includes(st.name));
                          return (
                            <div className="space-y-2">
                              {schoolSports.length > 0 ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {schoolSports.map((sp) => (
                                    <span
                                      key={sp}
                                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 rounded-lg text-xs font-black text-emerald-800 shadow-xs hover:border-emerald-300 transition-all group"
                                    >
                                      <span>🏟️ {sp}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveSchoolSport(s.id, sp)}
                                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-0.5 rounded transition-colors"
                                        title={`ลบ ${sp} ออกจากสนามที่รับผิดชอบ`}
                                      >
                                        <X size={13} />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-slate-400 italic flex items-center gap-1">
                                  <span>ยังไม่ได้ระบุสนามกีฬา</span>
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleAddSchoolSport(s.id, e.target.value);
                                      }
                                    }}
                                    className="px-2.5 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-slate-700 outline-none cursor-pointer transition-all shadow-xs"
                                    title="เลือกเพื่อเพิ่มสนามกีฬาที่รับผิดชอบ"
                                  >
                                    <option value="">+ เพิ่มชนิดกีฬา/สนาม...</option>
                                    {availableSports.map((st) => (
                                      <option key={st.id} value={st.name}>
                                        + 🏟️ {st.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {schoolSports.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearAllSchoolSports(s.id)}
                                    className="text-[10px] font-bold text-slate-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                    title="ยกเลิกสนามกีฬาที่รับผิดชอบทั้งหมดของโรงเรียนนี้"
                                  >
                                    ลบทั้งหมด
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-8 py-5 text-center flex justify-center gap-2">
                        <button onClick={() => { setEditingSchool(s); setIsAddingNew(false); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="แก้ไขข้อมูลบัญชี"><Edit2 size={18} /></button>
                        <button onClick={() => handleDeleteItem('deleteAccount', s.id, s.name)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="ลบบัญชี"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                {activeTab === 'sportTypes' && filteredSportTypes.map((s) => (
                  <tr key={s.id} className="hover:bg-emerald-50/20 transition-all">
                    <td className="px-8 py-5 font-bold text-slate-300 text-center">#</td>
                    <td className="px-8 py-5">
                      <div className="font-bold text-slate-800">{s.name}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{s.description || '-'}</div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => handleSportTemplateUpload(s.id)}
                            className={`w-10 h-10 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden relative group/tpl ${s.certTemplate ? 'border-emerald-300 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-emerald-400'}`}
                          >
                            {s.certTemplate ? (
                              <>
                                <img src={s.certTemplate} className="w-full h-full object-cover" alt="Template" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/tpl:opacity-100 flex items-center justify-center transition-opacity">
                                  <ImageIcon size={14} className="text-white" />
                                </div>
                              </>
                            ) : (
                              <ImageIcon size={18} className="text-slate-300 group-hover:scale-110 transition-transform" />
                            )}
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">เทมเพลตเกียรติบัตร</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => handleSportPdfUpload(s.id)}
                            className={`w-10 h-10 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden relative group/pdf ${s.rulesPdf ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-blue-400'}`}
                          >
                            {s.rulesPdf ? (
                              <FileDown size={20} className="text-blue-600" />
                            ) : (
                              <FileUp size={20} className="text-slate-300 group-hover:scale-110 transition-transform" />
                            )}
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ระเบียบการ (PDF)</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center flex justify-center gap-2">
                      <button onClick={() => { setEditingSportType(s); setIsAddingNew(false); }} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg"><Edit2 size={18} /></button>
                      <button onClick={() => handleDeleteItem('deleteSport', s.id, s.name)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
                {activeTab === 'ageGroups' && filteredAgeGroups.map((a) => (
                  <tr key={a.id} className="hover:bg-indigo-50/20 transition-all">
                    <td className="px-8 py-5 font-bold text-slate-300 text-center">#</td>
                    <td className="px-8 py-5 font-bold text-slate-800">{a.age}</td>
                    <td className="px-8 py-5"><span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-black">{a.gender}</span></td>
                    <td className="px-8 py-5 text-center flex justify-center gap-2">
                      <button onClick={() => { setEditingAgeGroup(a); setIsAddingNew(false); }} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg"><Edit2 size={18} /></button>
                      <button onClick={() => handleDeleteItem('deleteAgeGroup', a.id, a.age)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
                {activeTab === 'athletics' && filteredAthletics.map((s) => (
                  <tr key={s.id} className="hover:bg-orange-50/20 transition-all">
                    <td className="px-8 py-5 font-black text-orange-600 bg-orange-50/50 text-center">{s.eventNo}</td>
                    <td className="px-8 py-5 font-bold text-slate-800">{s.name}</td>
                    <td className="px-8 py-5 text-xs text-slate-500 truncate max-w-xs">{s.description || '-'}</td>
                    <td className="px-8 py-5 text-center flex justify-center gap-2">
                      <button onClick={() => { setEditingAthletics(s); setIsAddingNew(false); }} className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg"><Edit2 size={18} /></button>
                      <button onClick={() => handleDeleteItem('deleteAthletics', s.id, s.name)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
                {activeTab === 'results' && filteredResults.map((r) => (
                  <tr key={r.id} className="hover:bg-amber-50/20 transition-all">
                    <td className="px-8 py-5 font-black text-amber-600 bg-amber-50/50 text-center">{r.sportName}</td>
                    <td className="px-8 py-5">
                      <div className="font-bold text-slate-800">{r.ageGroup || 'ทุกรุ่นอายุ'}</div>
                      {r.athleticsEvent && <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{r.athleticsEvent}</div>}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-wrap items-center gap-2 font-black text-amber-600">
                        <Medal size={16} className="text-yellow-500 shrink-0" /> 
                        <span>{r.rank1SchoolName || '-'}</span>
                        {r.rank1AthleteName && (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded-lg">
                            👤 {r.rank1AthleteName}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1.5 space-y-1">
                        {r.rank2SchoolName && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-500">🥈 2:</span> 
                            <span>{r.rank2SchoolName}</span>
                            {r.rank2AthleteName && (
                              <span className="text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                👤 {r.rank2AthleteName}
                              </span>
                            )}
                          </div>
                        )}
                        {r.rank3SchoolName && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-500">🥉 3:</span> 
                            <span>{r.rank3SchoolName}</span>
                            {r.rank3AthleteName && (
                              <span className="text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                👤 {r.rank3AthleteName}
                              </span>
                            )}
                            {r.rank3SchoolName2 && (
                              <span className="text-orange-600 font-bold ml-1">
                                , {r.rank3SchoolName2} (ร่วม)
                                {r.rank3AthleteName2 && <span className="font-normal text-slate-600"> ({r.rank3AthleteName2})</span>}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center flex justify-center items-center gap-2">
                      <button 
                        onClick={() => handleOpenEditResult(r)} 
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                        title="คลิกเพื่อแก้ไขข้อมูลผลการแข่งขันและนักเรียน"
                      >
                        <Edit2 size={13} />
                        แก้ไขผล
                      </button>
                      <button 
                        onClick={() => handleDeleteItem('deleteResult', r.id, `${r.sportName} ${r.ageGroup}`)} 
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-200"
                        title="ลบผลการแข่งขัน"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {activeTab === 'certificates' && filteredResults.map((r) => (
                  <tr key={r.id} className="hover:bg-rose-50/20 transition-all group">
                    <td className="px-8 py-5 font-black text-rose-600 bg-rose-50/50 text-center">{r.sportName}</td>
                    <td className="px-8 py-5">
                      <div className="font-bold text-slate-800 text-sm">{r.ageGroup}</div>
                      {r.athleticsEvent && <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{r.athleticsEvent}</div>}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-32">
                            <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">เลขที่เริ่มต้น</label>
                            <input type="text" placeholder="001/2568" value={r.certStartNo || ''} onChange={(e) => handleUpdateCertFieldLocally(r, 'certStartNo', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-rose-500/20 group-hover:bg-white transition-all" />
                          </div>
                          <div className="pt-4">
                            <button onClick={() => handleSaveCertConfig(r)} disabled={isSavingCert === r.id} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all active:scale-95 ${isSavingCert === r.id ? 'bg-slate-100 text-slate-400' : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white shadow-sm cursor-pointer'}`}>
                              {isSavingCert === r.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              บันทึกค่า
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                            <span>ออกเกียรติบัตรครูผู้ฝึกสอนอัตโนมัติ</span>
                          </div>
                          {r.certEndNo && (
                            <div className="bg-rose-50/70 border border-rose-200 rounded-lg px-3 py-1 flex items-center gap-2">
                               <span className="text-[9px] font-black text-rose-700 uppercase tracking-widest">เลขสุดท้าย:</span>
                               <span className="text-xs font-black text-rose-600">{r.certEndNo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex flex-col gap-1.5 min-w-[170px]">
                         <button 
                           onClick={() => handlePrintCertificates(r, 'all', 'all')} 
                           title="พิมพ์เกียรติบัตรทั้งหมด ทั้งนักกีฬาและครูผู้ฝึกสอน"
                           className="w-full py-2.5 bg-rose-600 text-white rounded-xl font-black text-[10px] flex items-center justify-center gap-2 shadow-md hover:bg-rose-700 active:scale-95 transition-all cursor-pointer"
                         >
                           <PrinterCheck size={14} /> พิมพ์ทั้งหมด (นร.+ครู)
                         </button>
                         <div className="grid grid-cols-2 gap-1.5">
                           <button 
                             onClick={() => handlePrintCertificates(r, 'all', 'athletes')} 
                             title="พิมพ์เฉพาะเกียรติบัตรนักกีฬา"
                             className="py-1.5 px-2 bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-300 rounded-lg font-bold text-[9px] transition-all cursor-pointer"
                           >
                             เฉพาะนักกีฬา
                           </button>
                           <button 
                             onClick={() => handlePrintCertificates(r, 'all', 'coaches')} 
                             title="พิมพ์เฉพาะเกียรติบัตรครูผู้ฝึกสอน"
                             className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 hover:border-amber-300 rounded-lg font-bold text-[9px] transition-all cursor-pointer flex items-center justify-center gap-1"
                           >
                             <span>🎓</span> ครูผู้ฝึกสอน
                           </button>
                         </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {replyingFeedback && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-md sm:max-w-lg max-h-[92vh] sm:max-h-[88vh] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 my-auto border border-slate-100">
            <div className="px-6 py-5 sm:px-8 sm:py-6 bg-violet-600 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl">
                  <MessageSquare size={24} className="text-white" />
                </div>
                <div>
                  <h4 className="font-black text-xl sm:text-2xl leading-tight">ตอบกลับข้อเสนอแนะ</h4>
                  <p className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-0.5">Feedback Management</p>
                </div>
              </div>
              <button onClick={() => setReplyingFeedback(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors" title="ปิดหน้าต่าง"><X size={22} /></button>
            </div>
            <form onSubmit={handleSaveReply} className="p-5 sm:p-7 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ข้อความต้นฉบับ จาก {replyingFeedback.schoolName}</p>
                <p className="text-sm font-bold text-slate-800 mb-1">{replyingFeedback.subject}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{replyingFeedback.details}</p>
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">อัปเดตสถานะ</label>
                <select required value={replyStatus} onChange={(e) => setReplyStatus(e.target.value)} className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm sm:text-base cursor-pointer">
                  <option value="รอดำเนินการ">รอดำเนินการ</option>
                  <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                  <option value="เสร็จสิ้น">แก้ไขแล้ว / เสร็จสิ้น</option>
                  <option value="ไม่สามารถดำเนินการได้">ไม่สามารถดำเนินการได้ (พร้อมเหตุผล)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">ข้อความตอบกลับไปยังโรงเรียน</label>
                <textarea required value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="ตอบกลับความคืบหน้า..." className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl h-24 sm:h-28 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm sm:text-base resize-none" />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full py-3.5 sm:py-4 bg-violet-600 text-white rounded-xl sm:rounded-2xl font-black shadow-xl shadow-violet-100 flex items-center justify-center gap-2 hover:bg-violet-700 active:scale-95 transition-all text-sm sm:text-base">
                  <Save size={18} /> บันทึกและส่งคำตอบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingSchool && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-md sm:max-w-lg max-h-[92vh] sm:max-h-[88vh] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 my-auto border border-slate-100">
            <div className={`px-6 py-5 sm:px-8 sm:py-6 text-white flex justify-between items-center shrink-0 ${isAddingNew ? 'bg-blue-600' : 'bg-blue-800'}`}>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl">
                  <SchoolIcon size={24} className="text-white" />
                </div>
                <div>
                  <h4 className="font-black text-xl sm:text-2xl leading-tight">จัดการบัญชีโรงเรียน</h4>
                  <p className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-0.5">
                    {isAddingNew ? 'เพิ่มโรงเรียนใหม่' : 'แก้ไขข้อมูลบัญชี'}
                  </p>
                </div>
              </div>
              <button onClick={() => setEditingSchool(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors" title="ปิดหน้าต่าง"><X size={22} /></button>
            </div>
            <form onSubmit={handleSaveAccount} className="p-5 sm:p-7 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">ชื่อโรงเรียน <span className="text-red-500">*</span></label>
                <div className="relative">
                  <SchoolIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" required value={editingSchool.name} onChange={(e) => setEditingSchool({...editingSchool, name: e.target.value})} className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm sm:text-base" placeholder="ระบุชื่อโรงเรียน" />
                </div>
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">Username <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" required value={editingSchool.username} onChange={(e) => setEditingSchool({...editingSchool, username: e.target.value})} className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm sm:text-base" placeholder="username สำหรับเข้าสู่ระบบ" />
                </div>
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <EyeOff className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" required value={editingSchool.password} onChange={(e) => setEditingSchool({...editingSchool, password: e.target.value})} className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm sm:text-base" placeholder="password สำหรับเข้าสู่ระบบ" />
                </div>
              </div>
              <div>
                {(() => {
                  const modalSports = parseResponsibleSports(editingSchool.responsibleSport);
                  const availableSports = sportTypes.filter(st => !modalSports.includes(st.name));

                  const handleAddModalSport = (sportName: string) => {
                    if (!sportName || modalSports.includes(sportName)) return;
                    const updated = [...modalSports, sportName];
                    setEditingSchool({
                      ...editingSchool,
                      responsibleSport: formatResponsibleSports(updated)
                    });
                  };

                  const handleRemoveModalSport = (sportName: string) => {
                    const updated = modalSports.filter(s => s !== sportName);
                    setEditingSchool({
                      ...editingSchool,
                      responsibleSport: formatResponsibleSports(updated)
                    });
                  };

                  const handleClearModalSports = () => {
                    setEditingSchool({
                      ...editingSchool,
                      responsibleSport: ''
                    });
                  };

                  return (
                    <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy size={18} className="text-amber-500" />
                          <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                            สนามกีฬาที่รับผิดชอบ (Live Score)
                          </label>
                        </div>
                        <span className="text-[11px] font-black px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                          {modalSports.length} ชนิดกีฬา
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        เลือกชนิดกีฬาที่โรงเรียนนี้เป็นเจ้าภาพ/รับผิดชอบ สามารถเพิ่มได้หลายชนิดกีฬาเพื่อเปิดสิทธิ์บันทึกรายงานผล Live score
                      </p>

                      {/* รายการกีฬาที่เลือกไว้ */}
                      <div className="min-h-[50px] p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center gap-2">
                        {modalSports.length > 0 ? (
                          modalSports.map((sp) => (
                            <span
                              key={sp}
                              className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-black shadow-xs hover:border-emerald-300 transition-all"
                            >
                              <span>🏟️ {sp}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveModalSport(sp)}
                                className="text-emerald-500 hover:text-red-500 hover:bg-emerald-100 p-0.5 rounded transition-colors"
                                title={`ลบ ${sp}`}
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic px-1">
                            ยังไม่มีชนิดกีฬาที่เลือก (เลือกจากเมนูด้านล่างเพื่อเพิ่ม)
                          </span>
                        )}
                      </div>

                      {/* Dropdown เพิ่มชนิดกีฬา */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                        <select
                          id="modalSportSelect"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddModalSport(e.target.value);
                            }
                          }}
                          className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                        >
                          <option value="">-- เลือกเพื่อเพิ่มสนามกีฬา / ชนิดกีฬา --</option>
                          {availableSports.map((st) => (
                            <option key={st.id} value={st.name}>
                              + 🏟️ {st.name}
                            </option>
                          ))}
                        </select>

                        {modalSports.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearModalSports}
                            className="px-3 py-2 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-xl transition-colors whitespace-nowrap"
                          >
                            ลบทั้งหมด
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full py-3.5 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black shadow-xl shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all text-sm sm:text-base">
                  <Save size={18} /> บันทึกข้อมูลบัญชี
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingAgeGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-md sm:max-w-lg max-h-[92vh] sm:max-h-[88vh] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 my-auto border border-slate-100">
            <div className={`px-6 py-5 sm:px-8 sm:py-6 text-white flex justify-between items-center shrink-0 ${isAddingNew ? 'bg-indigo-600' : 'bg-indigo-800'}`}>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl">
                  <Trophy size={24} className="text-white" />
                </div>
                <div>
                  <h4 className="font-black text-xl sm:text-2xl leading-tight">จัดการรุ่นอายุและเพศ</h4>
                  <p className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-0.5">
                    {isAddingNew ? 'เพิ่มรุ่นอายุใหม่' : 'แก้ไขรุ่นอายุและเพศ'}
                  </p>
                </div>
              </div>
              <button onClick={() => setEditingAgeGroup(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors" title="ปิดหน้าต่าง"><X size={22} /></button>
            </div>
            <form onSubmit={handleSaveAgeGroup} className="p-5 sm:p-7 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">ชื่อรุ่นอายุ <span className="text-red-500">*</span></label>
                <input type="text" required value={editingAgeGroup.age} onChange={(e) => setEditingAgeGroup({...editingAgeGroup, age: e.target.value})} className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm sm:text-base" placeholder="เช่น อนุบาล, ไม่เกิน 12 ปี" />
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">เพศ <span className="text-red-500">*</span></label>
                <select required value={editingAgeGroup.gender} onChange={(e) => setEditingAgeGroup({...editingAgeGroup, gender: e.target.value})} className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm sm:text-base appearance-none cursor-pointer">
                  <option value="ชาย">ชาย</option>
                  <option value="หญิง">หญิง</option>
                  <option value="ทั่วไป">ทั่วไป (คละชาย-หญิง)</option>
                </select>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full py-3.5 sm:py-4 bg-indigo-600 text-white rounded-xl sm:rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all text-sm sm:text-base">
                  <Save size={18} /> บันทึกรุ่นอายุ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingSportType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-[95vw] sm:max-w-md md:max-w-lg max-h-[90vh] rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className={`px-5 py-4 sm:px-7 sm:py-5 text-white flex justify-between items-center shrink-0 ${isAddingNew ? 'bg-gradient-to-r from-emerald-600 to-teal-700' : 'bg-gradient-to-r from-emerald-700 to-teal-800'}`}>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shadow-inner">
                  <Dribbble size={22} className="text-white" />
                </div>
                <div>
                  <h4 className="font-black text-lg sm:text-xl leading-tight">จัดการชนิดกีฬา</h4>
                  <p className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-0.5">
                    {isAddingNew ? 'เพิ่มชนิดกีฬาใหม่' : 'แก้ไขข้อมูลชนิดกีฬา'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditingSportType(null)} 
                className="p-2 hover:bg-white/20 rounded-xl transition-colors active:scale-95"
                title="ปิดหน้าต่าง"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSportType} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div>
                <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">
                  ชื่อชนิดกีฬา <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required 
                  value={editingSportType.name} 
                  onChange={(e) => setEditingSportType({...editingSportType, name: e.target.value})} 
                  className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm sm:text-base" 
                  placeholder="ระบุชื่อกีฬา เช่น ฟุตบอล, วอลเลย์บอล" 
                />
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">
                  คำอธิบาย
                </label>
                <textarea 
                  value={editingSportType.description} 
                  onChange={(e) => setEditingSportType({...editingSportType, description: e.target.value})} 
                  className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl h-20 sm:h-24 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm sm:text-base resize-none" 
                  placeholder="ระบุคำอธิบายย่อยหรือข้อกำหนดสังเขป (ถ้ามี)" 
                />
              </div>
              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full py-3.5 sm:py-4 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-black shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all text-sm sm:text-base"
                >
                  <Save size={18} /> บันทึกข้อมูลกีฬา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingAthletics && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-md sm:max-w-lg max-h-[92vh] sm:max-h-[88vh] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 my-auto border border-slate-100">
            <div className={`px-6 py-5 sm:px-8 sm:py-6 text-white flex justify-between items-center shrink-0 ${isAddingNew ? 'bg-orange-600' : 'bg-orange-800'}`}>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl">
                  <PersonStanding size={24} className="text-white" />
                </div>
                <div>
                  <h4 className="font-black text-xl sm:text-2xl leading-tight">จัดการรายการกรีฑา</h4>
                  <p className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-0.5">
                    {isAddingNew ? 'เพิ่มรายการกรีฑาใหม่' : 'แก้ไขรายการกรีฑา'}
                  </p>
                </div>
              </div>
              <button onClick={() => setEditingAthletics(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors" title="ปิดหน้าต่าง"><X size={22} /></button>
            </div>
            <form onSubmit={handleSaveAthletics} className="p-5 sm:p-7 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">เลขที่รายการ (Event No.) <span className="text-red-500">*</span></label>
                <input type="text" required value={editingAthletics.eventNo} onChange={(e) => setEditingAthletics({...editingAthletics, eventNo: e.target.value})} className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-sm sm:text-base" placeholder="เช่น 001, 102" />
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">ชื่อรายการแข่งขัน <span className="text-red-500">*</span></label>
                <input type="text" required value={editingAthletics.name} onChange={(e) => setEditingAthletics({...editingAthletics, name: e.target.value})} className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-sm sm:text-base" placeholder="เช่น วิ่ง 100 เมตร, กระโดดไกล" />
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">คำอธิบายเพิ่มเติม</label>
                <textarea value={editingAthletics.description} onChange={(e) => setEditingAthletics({...editingAthletics, description: e.target.value})} className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl h-24 sm:h-28 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-sm sm:text-base resize-none" placeholder="ระบุรายละเอียด (ถ้ามี)" />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full py-3.5 sm:py-4 bg-orange-600 text-white rounded-xl sm:rounded-2xl font-black shadow-xl shadow-orange-100 flex items-center justify-center gap-2 hover:bg-orange-700 active:scale-95 transition-all text-sm sm:text-base">
                  <Save size={18} /> บันทึกรายการกรีฑา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-md overflow-hidden">
          <div className="bg-white w-full max-w-lg md:max-w-4xl lg:max-w-5xl xl:max-w-6xl h-[94dvh] sm:h-auto sm:max-h-[90vh] md:max-h-[88vh] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 my-auto border border-slate-200/80">
            {/* Header (Fixed at top, responsive padding & text size) */}
            <div className={`px-4 py-3 sm:px-6 sm:py-4 text-white flex justify-between items-center shrink-0 ${isAddingNew ? 'bg-amber-600' : 'bg-amber-800'}`}>
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <div className="bg-white/20 p-2 sm:p-2.5 rounded-xl shrink-0">
                  <Award size={22} className="sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-base sm:text-xl lg:text-2xl leading-tight truncate">
                    จัดการผลการแข่งขัน {isAddingNew ? '(เพิ่มใหม่)' : '(แก้ไขข้อมูล)'}
                  </h4>
                  <p className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-0.5 truncate">
                    {isAddingNew ? 'Competition Result Entry' : 'Competition Result Edit & Management'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditingResult(null)} 
                className="p-1.5 sm:p-2 hover:bg-white/20 active:scale-95 rounded-xl transition-all shrink-0 ml-2 cursor-pointer" 
                title="ปิดหน้าต่าง"
              >
                <X size={22} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveResult} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-5">
                {!isAddingNew && (
                  <div className="p-3 sm:p-3.5 bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 sm:p-2 bg-amber-500 text-white rounded-lg sm:rounded-xl shadow-xs shrink-0">
                        <Edit2 size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-amber-900 truncate">
                          กำลังแก้ไขข้อมูลผลการแข่งขัน
                        </div>
                        <div className="text-[11px] text-amber-700 font-bold mt-0.5 truncate">
                          {editingResult.sportName || 'กีฬา'} • {editingResult.ageGroup || 'ทุกรุ่นอายุ'} {editingResult.athleticsEvent ? `• ${editingResult.athleticsEvent}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200/90 text-amber-900 px-2.5 py-1 rounded-lg shrink-0">
                      โหมดแก้ไขข้อมูล
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-start">
                  {/* ส่วนที่ 1: รายการแข่งขัน (Sticky บนจอใหญ่ สบายตา) */}
                  <div className="md:col-span-5 lg:col-span-4 space-y-3.5 md:sticky md:top-0">
                    <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs">
                      <h5 className="text-[11px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5 border-l-4 border-amber-600 pl-2.5">
                        ส่วนที่ 1: รายการแข่งขัน
                      </h5>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 block mb-1 px-1 uppercase tracking-widest">
                          ชนิดกีฬา <span className="text-red-500">*</span>
                        </label>
                        <select 
                          required 
                          value={resSportId} 
                          onChange={(e) => handleSportChange(e.target.value)} 
                          className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer text-xs sm:text-sm shadow-2xs"
                        >
                          <option value="">-- เลือกกีฬา --</option>
                          {sportTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 block mb-1 px-1 uppercase tracking-widest">
                          รุ่นอายุ <span className="text-red-500">*</span>
                        </label>
                        <select 
                          required 
                          value={resAgeGroup} 
                          onChange={(e) => handleAgeGroupChange(e.target.value)} 
                          className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer text-xs sm:text-sm shadow-2xs"
                        >
                          <option value="">-- เลือกรุ่นอายุ --</option>
                          {ageGroups.map(a => {
                            const ageStr = `${a.age} (${a.gender})`;
                            const isRecorded = resSportId && !isAthletics && resultsList.some(r => {
                              if (!isAddingNew && editingResult && r.id === editingResult.id) return false;
                              const sport = sportTypes.find(s => s.id === resSportId);
                              const matchSport = r.sportId === resSportId || (sport && r.sportName === sport.name);
                              return matchSport && (r.ageGroup || '').trim().toLowerCase() === ageStr.trim().toLowerCase();
                            });
                            return (
                              <option key={a.id} value={ageStr}>
                                {ageStr} {isRecorded ? '⚠️ (มีผลแข่งขันแล้ว)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      {isAthletics && (
                        <div className="animate-in slide-in-from-top-2">
                          <label className="text-[10px] font-black text-slate-500 block mb-1 px-1 uppercase tracking-widest">
                            รายการกรีฑา <span className="text-red-500">*</span>
                          </label>
                          <select 
                            required 
                            value={resAthEvent} 
                            onChange={(e) => handleAthEventChange(e.target.value)} 
                            className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-white border border-amber-300 bg-amber-50/20 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer text-xs sm:text-sm shadow-2xs"
                          >
                            <option value="">-- เลือกรายการ --</option>
                            {athleticsList.map(ev => {
                              const evStr = `${ev.eventNo} ${ev.name}`;
                              const isRecorded = resSportId && resAgeGroup && resultsList.some(r => {
                                if (!isAddingNew && editingResult && r.id === editingResult.id) return false;
                                const sport = sportTypes.find(s => s.id === resSportId);
                                const matchSport = r.sportId === resSportId || (sport && r.sportName === sport.name);
                                const matchAge = (r.ageGroup || '').trim().toLowerCase() === resAgeGroup.trim().toLowerCase();
                                const matchAth = (r.athleticsEvent || '').trim().toLowerCase() === evStr.trim().toLowerCase();
                                return matchSport && matchAge && matchAth;
                              });
                              return (
                                <option key={ev.id} value={evStr}>
                                  {ev.eventNo}. {ev.name} {isRecorded ? '⚠️ (มีผลแข่งขันแล้ว)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      {/* ป้ายเตือนหากพบผลการแข่งขันซ้ำซ้อน */}
                      {(() => {
                        const dup = checkDuplicateResult(
                          resSportId,
                          resAgeGroup,
                          isAthletics ? resAthEvent : '',
                          isAddingNew ? undefined : editingResult?.id
                        );
                        if (!dup) return null;
                        return (
                          <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-start gap-2 text-amber-900 animate-in fade-in">
                            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                            <div className="text-xs">
                              <strong className="block font-black text-amber-900">⚠️ รายการนี้มีผลในระบบแล้ว</strong>
                              <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
                                {dup.sportName} รุ่น {dup.ageGroup} {dup.athleticsEvent ? `(${dup.athleticsEvent})` : ''} มีบันทึกแล้ว เพื่อป้องกันการลงผลซ้ำซ้อน
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* ส่วนที่ 2: สรุปผลรางวัล (Spans 7 cols on md, 8 cols on lg) */}
                  <div className="md:col-span-7 lg:col-span-8 space-y-3.5">
                    <h5 className="text-[11px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5 border-l-4 border-emerald-600 pl-2.5">
                      ส่วนที่ 2: สรุปผลรางวัล
                    </h5>
                  {isResLoadingSchools ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                      <Loader2 className="animate-spin" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest">กำลังดึงรายชื่อโรงเรียนที่ลงทะเบียน...</p>
                    </div>
                  ) : resRegisteredSchools.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl p-8 text-center border-2 border-dashed border-slate-200 flex flex-col items-center gap-2">
                      <Info className="text-slate-300" size={32} />
                      <p className="text-xs font-bold text-slate-400">ยังไม่มีโรงเรียนลงทะเบียนในรายการนี้</p>
                      <p className="text-[10px] text-slate-400 italic">กรุณาเลือกรายการแข่งขันที่มีคนลงทะเบียน</p>
                    </div>
                  ) : (
                    (() => {
                      const r1 = editingResult.rank1SchoolId || '';
                      const r2 = editingResult.rank2SchoolId || '';
                      const r3 = editingResult.rank3SchoolId || '';
                      const r3_2 = editingResult.rank3SchoolId2 || '';

                      // ตรวจสอบเงื่อนไขกรีฑารุ่นอายุไม่เกิน 15 ปี (อนุญาตให้แต่ละโรงเรียนส่งรายชื่อได้มากกว่า 1 คน และได้รับรางวัลมากกว่า 1 รางวัล)
                      const isUnder15Athletics = Boolean(isAthletics && (resAgeGroup.includes('15') || resAgeGroup.includes('ไม่เกิน 15')));

                      // Helper: รับประกันว่าโรงเรียนเดิมที่เคยบันทึกไว้จะไม่หายไปจาก dropdown ตัวเลือก แม้ยังโหลดรายชื่อโรงเรียนที่ลงทะเบียนไม่เสร็จ
                      const ensureSchoolInOptions = (options: {id: string, name: string}[], schoolId?: string, schoolName?: string) => {
                        if (!schoolId) return options;
                        if (options.some(s => s.id === schoolId)) return options;
                        const found = schools.find(s => s.id === schoolId);
                        const name = schoolName || found?.name || `โรงเรียน ID: ${schoolId}`;
                        return [{ id: schoolId, name }, ...options];
                      };

                      // หากเป็นกรีฑารุ่นอายุไม่เกิน 15 ปี อนุญาตให้โรงเรียนเดิมสามารถได้รับเหรียญรางวัลมากกว่า 1 รางวัลได้
                      // หากเป็นกีฬา/รุ่นอายุอื่น จะกรองโรงเรียนที่ถูกเลือกแล้วออก เพื่อป้องกันการเลือกซ้ำ
                      const baseRank1Options = isUnder15Athletics 
                        ? resRegisteredSchools 
                        : resRegisteredSchools.filter(s => s.id === r1 || (s.id !== r2 && s.id !== r3 && s.id !== r3_2));
                      const baseRank2Options = isUnder15Athletics 
                        ? resRegisteredSchools 
                        : resRegisteredSchools.filter(s => s.id === r2 || (s.id !== r1 && s.id !== r3 && s.id !== r3_2));
                      const baseRank3Options = isUnder15Athletics 
                        ? resRegisteredSchools 
                        : resRegisteredSchools.filter(s => s.id === r3 || (s.id !== r1 && s.id !== r2 && s.id !== r3_2));
                      const baseRank3_2Options = isUnder15Athletics 
                        ? resRegisteredSchools 
                        : resRegisteredSchools.filter(s => s.id === r3_2 || (s.id !== r1 && s.id !== r2 && s.id !== r3));

                      const rank1Options = ensureSchoolInOptions(baseRank1Options, r1, editingResult.rank1SchoolName);
                      const rank2Options = ensureSchoolInOptions(baseRank2Options, r2, editingResult.rank2SchoolName);
                      const rank3Options = ensureSchoolInOptions(baseRank3Options, r3, editingResult.rank3SchoolName);
                      const rank3_2Options = ensureSchoolInOptions(baseRank3_2Options, r3_2, editingResult.rank3SchoolName2);

                      const athletesR1 = r1 ? (schoolAthletesMap[r1] || []) : [];
                      const athletesR2 = r2 ? (schoolAthletesMap[r2] || []) : [];
                      const athletesR3 = r3 ? (schoolAthletesMap[r3] || []) : [];
                      const athletesR3_2 = r3_2 ? (schoolAthletesMap[r3_2] || []) : [];

                      const isLoadingR1 = Boolean(r1 && loadingAthletesForSchool[r1]);
                      const isLoadingR2 = Boolean(r2 && loadingAthletesForSchool[r2]);
                      const isLoadingR3 = Boolean(r3 && loadingAthletesForSchool[r3]);
                      const isLoadingR3_2 = Boolean(r3_2 && loadingAthletesForSchool[r3_2]);

                      return (
                        <div className="space-y-4 animate-in fade-in">
                          {isUnder15Athletics && (
                            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-emerald-900 animate-in fade-in">
                              <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                              <div className="text-xs">
                                <strong className="block font-black text-emerald-900">🌟 รายการกรีฑา รุ่นอายุไม่เกิน 15 ปี</strong>
                                <span className="text-emerald-700">
                                  โรงเรียนสามารถส่งนักกีฬาได้มากกว่า 1 คน ในช่องสรุปผลรางวัลนี้ ระบบอนุญาตให้บางโรงเรียนสามารถได้รับเหรียญรางวัลมากกว่า 1 เหรียญรางวัลได้ และสามารถเลือกชื่อนักเรียนในแต่ละรางวัลได้
                                </span>
                              </div>
                            </div>
                          )}

                          {/* รางวัลชนะเลิศ (อันดับ 1) */}
                          <div className="bg-amber-50/50 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-200/90 space-y-2.5 sm:space-y-3">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-black text-amber-600 flex items-center gap-1.5 uppercase tracking-widest">
                                <Medal size={14} className="text-yellow-500" /> ชนะเลิศ (อันดับ 1 / เหรียญทอง) <span className="text-red-500">*</span>
                              </label>
                            </div>
                            <select 
                              required 
                              value={r1} 
                              onChange={(e) => {
                                const newId = e.target.value;
                                const foundSchool = rank1Options.find(s => s.id === newId) || schools.find(s => s.id === newId);
                                setEditingResult({
                                  ...editingResult, 
                                  rank1SchoolId: newId,
                                  rank1SchoolName: foundSchool?.name || '',
                                  rank1AthleteName: ''
                                });
                                if (newId) fetchAthletesForSchool(newId, resSportId, resAgeGroup, resAthEvent);
                              }} 
                              className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-white border-2 border-amber-300 rounded-xl font-bold text-slate-800 outline-none focus:border-amber-500 transition-all cursor-pointer text-xs sm:text-sm"
                            >
                              <option value="">-- เลือกโรงเรียนชนะเลิศ --</option>
                              {rank1Options.map(s => {
                                const isAlsoOther = isUnder15Athletics && (s.id === r2 || s.id === r3 || s.id === r3_2);
                                return <option key={s.id} value={s.id}>🥇 {s.name}{isAlsoOther ? ' (ได้รับรางวัลอื่นในรายการนี้ด้วย)' : ''}</option>;
                              })}
                            </select>

                            {/* Dropdownlist เลือกชื่อนักเรียนเพื่อรับเหรียญรางวัล */}
                            {r1 && (
                              <div className="pt-1">
                                {isLoadingR1 ? (
                                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                                    <Loader2 size={14} className="animate-spin text-amber-600" />
                                    <span>กำลังโหลดรายชื่อนักเรียน...</span>
                                  </div>
                                ) : athletesR1.length > 0 ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between px-1">
                                      <label className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                        <UserCheck size={13} className="text-amber-600" />
                                        <span>เลือกชื่อนักเรียนผู้ได้รับเหรียญทอง</span>
                                        {athletesR1.length > 1 && (
                                          <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                            มีนักเรียน {athletesR1.length} คน
                                          </span>
                                        )}
                                      </label>
                                      {editingResult.rank1AthleteName && (
                                        <button
                                          type="button"
                                          onClick={() => setEditingResult({ ...editingResult, rank1AthleteName: '' })}
                                          className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                                        >
                                          ล้างชื่อนักเรียน
                                        </button>
                                      )}
                                    </div>
                                    <select
                                      value={editingResult.rank1AthleteName || ''}
                                      onChange={(e) => setEditingResult({ ...editingResult, rank1AthleteName: e.target.value })}
                                      className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl font-bold text-slate-800 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer shadow-xs"
                                    >
                                      <option value="">-- {athletesR1.length > 1 ? `เลือกชื่อนักเรียน (พบ ${athletesR1.length} คน)` : 'เลือกชื่อนักเรียน (ถ้ามี)'} --</option>
                                      {athletesR1.map((ath, idx) => {
                                        const fullName = `${ath.prefix || ''}${ath.firstName} ${ath.lastName}`.trim();
                                        const isChosenInOther = (
                                          (fullName === editingResult.rank2AthleteName && r2 === r1) ||
                                          (fullName === editingResult.rank3AthleteName && r3 === r1) ||
                                          (fullName === editingResult.rank3AthleteName2 && r3_2 === r1)
                                        );
                                        return (
                                          <option key={ath.id || `${ath.firstName}-${ath.lastName}-${idx}`} value={fullName}>
                                            👤 {fullName} {isChosenInOther ? '(เลือกในอันดับอื่นแล้ว)' : ''}
                                          </option>
                                        );
                                      })}
                                      {editingResult.rank1AthleteName && !athletesR1.some(a => `${a.prefix || ''}${a.firstName} ${a.lastName}`.trim() === editingResult.rank1AthleteName) && (
                                        <option value={editingResult.rank1AthleteName}>
                                          👤 {editingResult.rank1AthleteName} (ข้อมูลเดิม)
                                        </option>
                                      )}
                                    </select>
                                    {athletesR1.length > 1 && (
                                      <p className="text-[10px] text-amber-800 font-medium px-1 flex items-center gap-1">
                                        <span>💡</span> โรงเรียนส่งนักกีฬามากกว่า 1 คน กรุณาเลือกชื่อนักเรียนเพื่อรับเหรียญรางวัลชนะเลิศ
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 px-1 block">
                                      ชื่อนักเรียนผู้ได้รับเหรียญทอง (ระบุเพิ่มเติมถ้ามี)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="ระบุชื่อ-สกุล นักเรียนผู้ได้รับเหรียญ (ถ้ามี)"
                                      value={editingResult.rank1AthleteName || ''}
                                      onChange={(e) => setEditingResult({ ...editingResult, rank1AthleteName: e.target.value })}
                                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* รางวัลรองชนะเลิศอันดับ 1 (อันดับ 2) */}
                          <div className="bg-slate-50/90 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 space-y-2.5 sm:space-y-3">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-black text-slate-600 flex items-center gap-1.5 uppercase tracking-widest">
                                <Medal size={14} className="text-slate-400" /> รองชนะเลิศอันดับ 1 (อันดับ 2 / เหรียญเงิน)
                              </label>
                              {r2 && (
                                <button
                                  type="button"
                                  onClick={() => setEditingResult({ ...editingResult, rank2SchoolId: '', rank2SchoolName: '', rank2AthleteName: '' })}
                                  className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                                >
                                  ล้างค่า
                                </button>
                              )}
                            </div>
                            <select 
                              value={r2} 
                              onChange={(e) => {
                                const newId = e.target.value;
                                const foundSchool = rank2Options.find(s => s.id === newId) || schools.find(s => s.id === newId);
                                setEditingResult({
                                  ...editingResult, 
                                  rank2SchoolId: newId,
                                  rank2SchoolName: foundSchool?.name || '',
                                  rank2AthleteName: ''
                                });
                                if (newId) fetchAthletesForSchool(newId, resSportId, resAgeGroup, resAthEvent);
                              }} 
                              className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-500/10 transition-all cursor-pointer text-xs sm:text-sm"
                            >
                              <option value="">-- เลือกโรงเรียน (ถ้ามี) --</option>
                              {rank2Options.map(s => {
                                const isAlsoOther = isUnder15Athletics && (s.id === r1 || s.id === r3 || s.id === r3_2);
                                return <option key={s.id} value={s.id}>🥈 {s.name}{isAlsoOther ? ' (ได้รับรางวัลอื่นในรายการนี้ด้วย)' : ''}</option>;
                              })}
                            </select>

                            {/* Dropdownlist เลือกชื่อนักเรียนเพื่อรับเหรียญรางวัล */}
                            {r2 && (
                              <div className="pt-1">
                                {isLoadingR2 ? (
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                                    <Loader2 size={14} className="animate-spin text-slate-500" />
                                    <span>กำลังโหลดรายชื่อนักเรียน...</span>
                                  </div>
                                ) : athletesR2.length > 0 ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between px-1">
                                      <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <UserCheck size={13} className="text-slate-500" />
                                        <span>เลือกชื่อนักเรียนผู้ได้รับเหรียญเงิน</span>
                                        {athletesR2.length > 1 && (
                                          <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                            มีนักเรียน {athletesR2.length} คน
                                          </span>
                                        )}
                                      </label>
                                      {editingResult.rank2AthleteName && (
                                        <button
                                          type="button"
                                          onClick={() => setEditingResult({ ...editingResult, rank2AthleteName: '' })}
                                          className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                                        >
                                          ล้างชื่อนักเรียน
                                        </button>
                                      )}
                                    </div>
                                    <select
                                      value={editingResult.rank2AthleteName || ''}
                                      onChange={(e) => setEditingResult({ ...editingResult, rank2AthleteName: e.target.value })}
                                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 text-xs outline-none focus:ring-2 focus:ring-slate-500/20 transition-all cursor-pointer shadow-xs"
                                    >
                                      <option value="">-- {athletesR2.length > 1 ? `เลือกชื่อนักเรียน (พบ ${athletesR2.length} คน)` : 'เลือกชื่อนักเรียน (ถ้ามี)'} --</option>
                                      {athletesR2.map((ath, idx) => {
                                        const fullName = `${ath.prefix || ''}${ath.firstName} ${ath.lastName}`.trim();
                                        const isChosenInOther = (
                                          (fullName === editingResult.rank1AthleteName && r1 === r2) ||
                                          (fullName === editingResult.rank3AthleteName && r3 === r2) ||
                                          (fullName === editingResult.rank3AthleteName2 && r3_2 === r2)
                                        );
                                        return (
                                          <option key={ath.id || `${ath.firstName}-${ath.lastName}-${idx}`} value={fullName}>
                                            👤 {fullName} {isChosenInOther ? '(เลือกในอันดับอื่นแล้ว)' : ''}
                                          </option>
                                        );
                                      })}
                                      {editingResult.rank2AthleteName && !athletesR2.some(a => `${a.prefix || ''}${a.firstName} ${a.lastName}`.trim() === editingResult.rank2AthleteName) && (
                                        <option value={editingResult.rank2AthleteName}>
                                          👤 {editingResult.rank2AthleteName} (ข้อมูลเดิม)
                                        </option>
                                      )}
                                    </select>
                                    {athletesR2.length > 1 && (
                                      <p className="text-[10px] text-slate-600 font-medium px-1 flex items-center gap-1">
                                        <span>💡</span> โรงเรียนส่งนักกีฬามากกว่า 1 คน กรุณาเลือกชื่อนักเรียนเพื่อรับเหรียญเงิน
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 px-1 block">
                                      ชื่อนักเรียนผู้ได้รับเหรียญเงิน (ระบุเพิ่มเติมถ้ามี)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="ระบุชื่อ-สกุล นักเรียนผู้ได้รับเหรียญ (ถ้ามี)"
                                      value={editingResult.rank2AthleteName || ''}
                                      onChange={(e) => setEditingResult({ ...editingResult, rank2AthleteName: e.target.value })}
                                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-500/20 text-slate-800"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* รางวัลรองชนะเลิศอันดับ 2 (อันดับ 3) */}
                          <div className="bg-orange-50/50 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-orange-200/90 space-y-2.5 sm:space-y-3">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-black text-orange-600 flex items-center gap-1.5 uppercase tracking-widest">
                                <Medal size={14} className="text-orange-400" /> รองชนะเลิศอันดับ 2 (อันดับ 3 / เหรียญทองแดง)
                              </label>
                              {r3 && (
                                <button
                                  type="button"
                                  onClick={() => setEditingResult({ ...editingResult, rank3SchoolId: '', rank3SchoolName: '', rank3AthleteName: '' })}
                                  className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                                >
                                  ล้างค่า
                                </button>
                              )}
                            </div>
                            <select 
                              value={r3} 
                              onChange={(e) => {
                                const newId = e.target.value;
                                const foundSchool = rank3Options.find(s => s.id === newId) || schools.find(s => s.id === newId);
                                setEditingResult({
                                  ...editingResult, 
                                  rank3SchoolId: newId,
                                  rank3SchoolName: foundSchool?.name || '',
                                  rank3AthleteName: ''
                                });
                                if (newId) fetchAthletesForSchool(newId, resSportId, resAgeGroup, resAthEvent);
                              }} 
                              className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-white border border-orange-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500/10 transition-all cursor-pointer text-xs sm:text-sm"
                            >
                              <option value="">-- เลือกโรงเรียน (ถ้ามี) --</option>
                              {rank3Options.map(s => {
                                const isAlsoOther = isUnder15Athletics && (s.id === r1 || s.id === r2 || s.id === r3_2);
                                return <option key={s.id} value={s.id}>🥉 {s.name}{isAlsoOther ? ' (ได้รับรางวัลอื่นในรายการนี้ด้วย)' : ''}</option>;
                              })}
                            </select>

                            {/* Dropdownlist เลือกชื่อนักเรียนเพื่อรับเหรียญรางวัล */}
                            {r3 && (
                              <div className="pt-1">
                                {isLoadingR3 ? (
                                  <div className="flex items-center gap-2 text-xs font-bold text-orange-700 bg-white/80 p-2.5 rounded-xl border border-orange-200">
                                    <Loader2 size={14} className="animate-spin text-orange-500" />
                                    <span>กำลังโหลดรายชื่อนักเรียน...</span>
                                  </div>
                                ) : athletesR3.length > 0 ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between px-1">
                                      <label className="text-[10px] font-black text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
                                        <UserCheck size={13} className="text-orange-500" />
                                        <span>เลือกชื่อนักเรียนผู้ได้รับเหรียญทองแดง</span>
                                        {athletesR3.length > 1 && (
                                          <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                            มีนักเรียน {athletesR3.length} คน
                                          </span>
                                        )}
                                      </label>
                                      {editingResult.rank3AthleteName && (
                                        <button
                                          type="button"
                                          onClick={() => setEditingResult({ ...editingResult, rank3AthleteName: '' })}
                                          className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                                        >
                                          ล้างชื่อนักเรียน
                                        </button>
                                      )}
                                    </div>
                                    <select
                                      value={editingResult.rank3AthleteName || ''}
                                      onChange={(e) => setEditingResult({ ...editingResult, rank3AthleteName: e.target.value })}
                                      className="w-full px-4 py-2.5 bg-white border border-orange-300 rounded-xl font-bold text-slate-800 text-xs outline-none focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer shadow-xs"
                                    >
                                      <option value="">-- {athletesR3.length > 1 ? `เลือกชื่อนักเรียน (พบ ${athletesR3.length} คน)` : 'เลือกชื่อนักเรียน (ถ้ามี)'} --</option>
                                      {athletesR3.map((ath, idx) => {
                                        const fullName = `${ath.prefix || ''}${ath.firstName} ${ath.lastName}`.trim();
                                        const isChosenInOther = (
                                          (fullName === editingResult.rank1AthleteName && r1 === r3) ||
                                          (fullName === editingResult.rank2AthleteName && r2 === r3) ||
                                          (fullName === editingResult.rank3AthleteName2 && r3_2 === r3)
                                        );
                                        return (
                                          <option key={ath.id || `${ath.firstName}-${ath.lastName}-${idx}`} value={fullName}>
                                            👤 {fullName} {isChosenInOther ? '(เลือกในอันดับอื่นแล้ว)' : ''}
                                          </option>
                                        );
                                      })}
                                      {editingResult.rank3AthleteName && !athletesR3.some(a => `${a.prefix || ''}${a.firstName} ${a.lastName}`.trim() === editingResult.rank3AthleteName) && (
                                        <option value={editingResult.rank3AthleteName}>
                                          👤 {editingResult.rank3AthleteName} (ข้อมูลเดิม)
                                        </option>
                                      )}
                                    </select>
                                    {athletesR3.length > 1 && (
                                      <p className="text-[10px] text-orange-800 font-medium px-1 flex items-center gap-1">
                                        <span>💡</span> โรงเรียนส่งนักกีฬามากกว่า 1 คน กรุณาเลือกชื่อนักเรียนเพื่อรับเหรียญทองแดง
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 px-1 block">
                                      ชื่อนักเรียนผู้ได้รับเหรียญทองแดง (ระบุเพิ่มเติมถ้ามี)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="ระบุชื่อ-สกุล นักเรียนผู้ได้รับเหรียญ (ถ้ามี)"
                                      value={editingResult.rank3AthleteName || ''}
                                      onChange={(e) => setEditingResult({ ...editingResult, rank3AthleteName: e.target.value })}
                                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* อันดับ 3 ร่วม (เหรียญทองแดง อีก 1 ทีม) */}
                          <div className="p-3.5 sm:p-4 bg-orange-50/70 rounded-xl sm:rounded-2xl border border-orange-200/90 space-y-2.5 sm:space-y-3">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-black text-orange-700 flex items-center gap-1.5 uppercase tracking-widest">
                                <Medal size={14} className="text-orange-600" /> รองชนะเลิศอันดับ 2 ร่วม (อันดับ 3 ร่วม - เหรียญทองแดง)
                              </label>
                              {r3_2 && (
                                <button
                                  type="button"
                                  onClick={() => setEditingResult({ ...editingResult, rank3SchoolId2: '', rank3SchoolName2: '', rank3AthleteName2: '' })}
                                  className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                                >
                                  ล้างค่า
                                </button>
                              )}
                            </div>
                            <select 
                              value={r3_2} 
                              onChange={(e) => {
                                const newId = e.target.value;
                                const foundSchool = rank3_2Options.find(s => s.id === newId) || schools.find(s => s.id === newId);
                                setEditingResult({
                                  ...editingResult, 
                                  rank3SchoolId2: newId,
                                  rank3SchoolName2: foundSchool?.name || '',
                                  rank3AthleteName2: ''
                                });
                                if (newId) fetchAthletesForSchool(newId, resSportId, resAgeGroup, resAthEvent);
                              }} 
                              className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-white border border-orange-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500/10 transition-all cursor-pointer text-xs sm:text-sm"
                            >
                              <option value="">-- เลือกโรงเรียนอันดับ 3 ร่วม (ถ้ามี) --</option>
                              {rank3_2Options.map(s => {
                                const isAlsoOther = isUnder15Athletics && (s.id === r1 || s.id === r2 || s.id === r3);
                                return <option key={s.id} value={s.id}>🥉 {s.name} (อันดับ 3 ร่วม){isAlsoOther ? ' (ได้รับรางวัลอื่นในรายการนี้ด้วย)' : ''}</option>;
                              })}
                            </select>

                            {/* Dropdownlist เลือกชื่อนักเรียนเพื่อรับเหรียญรางวัล */}
                            {r3_2 && (
                              <div className="pt-1">
                                {isLoadingR3_2 ? (
                                  <div className="flex items-center gap-2 text-xs font-bold text-orange-700 bg-white/80 p-2.5 rounded-xl border border-orange-200">
                                    <Loader2 size={14} className="animate-spin text-orange-500" />
                                    <span>กำลังโหลดรายชื่อนักเรียน...</span>
                                  </div>
                                ) : athletesR3_2.length > 0 ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between px-1">
                                      <label className="text-[10px] font-black text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
                                        <UserCheck size={13} className="text-orange-600" />
                                        <span>เลือกชื่อนักเรียนผู้ได้รับเหรียญทองแดง (ร่วม)</span>
                                        {athletesR3_2.length > 1 && (
                                          <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                            มีนักเรียน {athletesR3_2.length} คน
                                          </span>
                                        )}
                                      </label>
                                      {editingResult.rank3AthleteName2 && (
                                        <button
                                          type="button"
                                          onClick={() => setEditingResult({ ...editingResult, rank3AthleteName2: '' })}
                                          className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                                        >
                                          ล้างชื่อนักเรียน
                                        </button>
                                      )}
                                    </div>
                                    <select
                                      value={editingResult.rank3AthleteName2 || ''}
                                      onChange={(e) => setEditingResult({ ...editingResult, rank3AthleteName2: e.target.value })}
                                      className="w-full px-4 py-2.5 bg-white border border-orange-300 rounded-xl font-bold text-slate-800 text-xs outline-none focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer shadow-xs"
                                    >
                                      <option value="">-- {athletesR3_2.length > 1 ? `เลือกชื่อนักเรียน (พบ ${athletesR3_2.length} คน)` : 'เลือกชื่อนักเรียน (ถ้ามี)'} --</option>
                                      {athletesR3_2.map((ath, idx) => {
                                        const fullName = `${ath.prefix || ''}${ath.firstName} ${ath.lastName}`.trim();
                                        const isChosenInOther = (
                                          (fullName === editingResult.rank1AthleteName && r1 === r3_2) ||
                                          (fullName === editingResult.rank2AthleteName && r2 === r3_2) ||
                                          (fullName === editingResult.rank3AthleteName && r3 === r3_2)
                                        );
                                        return (
                                          <option key={ath.id || `${ath.firstName}-${ath.lastName}-${idx}`} value={fullName}>
                                            👤 {fullName} {isChosenInOther ? '(เลือกในอันดับอื่นแล้ว)' : ''}
                                          </option>
                                        );
                                      })}
                                      {editingResult.rank3AthleteName2 && !athletesR3_2.some(a => `${a.prefix || ''}${a.firstName} ${a.lastName}`.trim() === editingResult.rank3AthleteName2) && (
                                        <option value={editingResult.rank3AthleteName2}>
                                          👤 {editingResult.rank3AthleteName2} (ข้อมูลเดิม)
                                        </option>
                                      )}
                                    </select>
                                    {athletesR3_2.length > 1 && (
                                      <p className="text-[10px] text-orange-800 font-medium px-1 flex items-center gap-1">
                                        <span>💡</span> โรงเรียนส่งนักกีฬามากกว่า 1 คน กรุณาเลือกชื่อนักเรียนเพื่อรับเหรียญทองแดง (ร่วม)
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 px-1 block">
                                      ชื่อนักเรียนผู้ได้รับเหรียญทองแดงร่วม (ระบุเพิ่มเติมถ้ามี)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="ระบุชื่อ-สกุล นักเรียนผู้ได้รับเหรียญ (ถ้ามี)"
                                      value={editingResult.rank3AthleteName2 || ''}
                                      onChange={(e) => setEditingResult({ ...editingResult, rank3AthleteName2: e.target.value })}
                                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            <p className="text-[10px] text-orange-700/80 px-1 font-medium">
                              * เพิ่มโรงเรียนที่ได้รับเหรียญทองแดงอีก 1 ทีม (สำหรับรายการแข่งขันที่มีอันดับ 3 ร่วม)
                            </p>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>

              {/* Modal Sticky Footer Bar (ชัดเจน สะดวก ใช้งานง่ายทุกอุปกรณ์) */}
              <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
                <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500 min-w-0">
                  {!resSportId || !resAgeGroup ? (
                    <span className="text-slate-400">กรุณาเลือกชนิดกีฬาและรุ่นอายุ</span>
                  ) : isAthletics && !resAthEvent ? (
                    <span className="text-amber-600">กรุณาเลือกรายการกรีฑา</span>
                  ) : !editingResult.rank1SchoolId ? (
                    <span className="text-amber-600">กรุณาเลือกโรงเรียนชนะเลิศ (อันดับ 1)</span>
                  ) : (() => {
                    const dup = checkDuplicateResult(
                      resSportId,
                      resAgeGroup,
                      isAthletics ? resAthEvent : '',
                      isAddingNew ? undefined : editingResult.id
                    );
                    if (dup) return <span className="text-red-500 font-black">⚠️ รายการแข่งขันนี้มีผลในระบบแล้ว</span>;
                    return (
                      <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                        <CheckCircle2 size={15} /> ข้อมูลครบถ้วนพร้อมบันทึก
                      </span>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingResult(null)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 active:scale-95 text-xs sm:text-sm transition-all cursor-pointer text-center"
                  >
                    ยกเลิก
                  </button>
                  {(() => {
                    const dup = checkDuplicateResult(
                      resSportId,
                      resAgeGroup,
                      isAthletics ? resAthEvent : '',
                      isAddingNew ? undefined : editingResult.id
                    );
                    return (
                      <button 
                        type="submit" 
                        disabled={!resSportId || !resAgeGroup || (isAthletics && !resAthEvent) || !editingResult.rank1SchoolId || Boolean(dup)} 
                        className="flex-1 sm:flex-initial px-5 py-2.5 sm:px-6 sm:py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black rounded-xl shadow-md shadow-amber-200 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 text-xs sm:text-sm cursor-pointer"
                      >
                        <Save size={16} /> 
                        <span>{dup ? 'รายการซ้ำซ้อน' : (isAddingNew ? 'บันทึกผลการแข่งขัน' : 'บันทึกการแก้ไขผล')}</span>
                      </button>
                    );
                  })()}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;