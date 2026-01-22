
import React, { useState, useEffect, useRef } from 'react';
import { SCRIPT_URL } from '../constants';
import { School, AgeGroup, SportType, AthleticsEvent, CompetitionResult, Athlete } from '../types';
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
  FileUp
} from 'lucide-react';

declare var Swal: any;

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'ageGroups' | 'sportTypes' | 'athletics' | 'results' | 'certificates'>('accounts');
  const [schools, setSchools] = useState<School[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [sportTypes, setSportTypes] = useState<SportType[]>([]);
  const [athleticsList, setAthleticsList] = useState<AthleticsEvent[]>([]);
  const [resultsList, setResultsList] = useState<CompetitionResult[]>([]);
  
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [editingAgeGroup, setEditingAgeGroup] = useState<AgeGroup | null>(null);
  const [editingSportType, setEditingSportType] = useState<SportType | null>(null);
  const [editingAthletics, setEditingAthletics] = useState<AthleticsEvent | null>(null);
  const [editingResult, setEditingResult] = useState<Partial<CompetitionResult> | null>(null);
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingCert, setIsSavingCert] = useState<string | null>(null);

  // สำหรับการอัปโหลดเทมเพลต
  const templateInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [currentSportForTemplate, setCurrentSportForTemplate] = useState<string | null>(null);
  const [currentSportForPdf, setCurrentSportForPdf] = useState<string | null>(null);

  // สำหรับหน้าจัดการผลการแข่งขัน
  const [resSportId, setResSportId] = useState('');
  const [resAgeGroup, setResAgeGroup] = useState('');
  const [resAthEvent, setResAthEvent] = useState('');
  const [resRegisteredSchools, setResRegisteredSchools] = useState<{id: string, name: string}[]>([]);
  const [isResLoadingSchools, setIsResLoadingSchools] = useState(false);

  const fetchData = async () => {
    if (!isRefreshing) setIsLoading(true);
    try {
      const [accRes, ageRes, sportRes, athleticsRes, resultsRes] = await Promise.all([
        fetch(`${SCRIPT_URL}?action=getAccounts`),
        fetch(`${SCRIPT_URL}?action=getAgeGroups`),
        fetch(`${SCRIPT_URL}?action=getSports`),
        fetch(`${SCRIPT_URL}?action=getAthleticsList`),
        fetch(`${SCRIPT_URL}?action=getResults`)
      ]);
      
      const accData = await accRes.json();
      const ageData = await ageRes.json();
      const sportData = await sportRes.json();
      const athleticsData = await athleticsRes.json();
      const resultsData = await resultsRes.json();
      
      const mappedSchools = Object.keys(accData).map(id => ({ 
        id: String(id).trim(), 
        name: accData[id].name || '',
        username: accData[id].username || '',
        password: accData[id].password || ''
      }));
      
      setSchools(mappedSchools);
      setAgeGroups(Array.isArray(ageData) ? ageData : []);
      setSportTypes(Array.isArray(sportData) ? sportData : []);
      setResultsList(Array.isArray(resultsData) ? resultsData : []);
      
      const sortedAthletics = Array.isArray(athleticsData) ? [...athleticsData].sort((a, b) => a.eventNo.localeCompare(b.eventNo)) : [];
      setAthleticsList(sortedAthletics);
    } catch (e) {
      console.error('Fetch error:', e);
      Swal.fire({
        icon: 'error',
        title: 'การเชื่อมต่อล้มเหลว',
        text: 'ไม่สามารถดึงข้อมูลได้ กรุณาตรวจสอบการ Deploy Apps Script'
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
  }, [resSportId, resAgeGroup, resAthEvent, activeTab, sportTypes, editingResult]);

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

      const [athletesR1, athletesR2, athletesR3] = await Promise.all([
        getAthletesList(result.rank1SchoolId),
        getAthletesList(result.rank2SchoolId),
        getAthletesList(result.rank3SchoolId)
      ]);

      const individualRecords: any[] = [];
      let globalCounter = 0;

      athletesR1.forEach((ath) => {
        individualRecords.push({
          certNo: formatCertNo(result.certStartNo || '', globalCounter++),
          fullName: `${ath.prefix}${ath.firstName} ${ath.lastName}`,
          schoolName: result.rank1SchoolName,
          rank: 'ชนะเลิศ',
          sportName: result.sportName,
          ageGroup: result.ageGroup,
          athleticsEvent: result.athleticsEvent || '-'
        });
      });

      athletesR2.forEach((ath) => {
        individualRecords.push({
          certNo: formatCertNo(result.certStartNo || '', globalCounter++),
          fullName: `${ath.prefix}${ath.firstName} ${ath.lastName}`,
          schoolName: result.rank2SchoolName,
          rank: 'รองชนะเลิศอันดับ 1',
          sportName: result.sportName,
          ageGroup: result.ageGroup,
          athleticsEvent: result.athleticsEvent || '-'
        });
      });

      athletesR3.forEach((ath) => {
        individualRecords.push({
          certNo: formatCertNo(result.certStartNo || '', globalCounter++),
          fullName: `${ath.prefix}${ath.firstName} ${ath.lastName}`,
          schoolName: result.rank3SchoolName,
          rank: 'รองชนะเลิศอันดับ 2',
          sportName: result.sportName,
          ageGroup: result.ageGroup,
          athleticsEvent: result.athleticsEvent || '-'
        });
      });

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
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: `บันทึกข้อมูลและเลขที่เกียรติบัตรลำดับสุดท้ายคือ ${certEndNo}`, timer: 3000, showConfirmButton: true });
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
    templateInputRef.current?.click();
  };

  const handleSportPdfUpload = (sportId: string) => {
    setCurrentSportForPdf(sportId);
    pdfInputRef.current?.click();
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

  // บันทึกชนิดกีฬา
  const handleSaveSportType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSportType) return;
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const success = await handlePostRequest({ action: 'updateSport', data: editingSportType });
    if (success) setEditingSportType(null);
  };

  // บันทึกบัญชีผู้ใช้
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const success = await handlePostRequest({ action: 'updateAccount', data: editingSchool });
    if (success) setEditingSchool(null);
  };

  // บันทึกรุ่นอายุ
  const handleSaveAgeGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgeGroup) return;
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const success = await handlePostRequest({ action: 'updateAgeGroup', data: editingAgeGroup });
    if (success) setEditingAgeGroup(null);
  };

  // บันทึกรายการกรีฑา
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
    const payload = {
      ...editingResult,
      sportId: resSportId,
      sportName: sport ? sport.name : (editingResult.sportName || ''),
      ageGroup: resAgeGroup,
      athleticsEvent: resAthEvent,
      rank1SchoolId: editingResult.rank1SchoolId,
      rank1SchoolName: resRegisteredSchools.find(s => s.id === editingResult.rank1SchoolId)?.name || (editingResult.rank1SchoolName || ''),
      rank2SchoolId: editingResult.rank2SchoolId,
      rank2SchoolName: resRegisteredSchools.find(s => s.id === editingResult.rank2SchoolId)?.name || (editingResult.rank2SchoolName || ''),
      rank3SchoolId: editingResult.rank3SchoolId,
      rank3SchoolName: resRegisteredSchools.find(s => s.id === editingResult.rank3SchoolId)?.name || (editingResult.rank3SchoolName || ''),
    };
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    if (await handlePostRequest({ action: 'updateResult', data: payload })) {
      setEditingResult(null);
      setResSportId('');
      setResAgeGroup('');
      setResAthEvent('');
      setResRegisteredSchools([]);
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

  const handlePrintCertificates = async (result: CompetitionResult, rank: 1 | 2 | 3 | 'all') => {
    setIsGenerating(true);
    Swal.fire({ title: 'กำลังคำนวณลำดับเลขที่เกียรติบัตร...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const getAthletesList = async (schoolId: string) => {
        if (!schoolId) return [];
        let url = `${SCRIPT_URL}?action=getAthletes&schoolId=${schoolId}&sportId=${result.sportId}&ageGroup=${encodeURIComponent(result.ageGroup)}`;
        if (result.athleticsEvent) url += `&athleticsEvent=${encodeURIComponent(result.athleticsEvent)}`;
        const res = await fetch(url);
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      };

      const [athletesR1, athletesR2, athletesR3] = await Promise.all([
        getAthletesList(result.rank1SchoolId),
        getAthletesList(result.rank2SchoolId),
        getAthletesList(result.rank3SchoolId)
      ]);

      let printData: { athletes: Athlete[], schoolName: string, rankTitle: string, globalOffset: number }[] = [];
      if (rank === 1 || rank === 'all') if (athletesR1.length > 0) printData.push({ athletes: athletesR1, schoolName: result.rank1SchoolName, rankTitle: 'ชนะเลิศ', globalOffset: 0 });
      if (rank === 2 || rank === 'all') if (athletesR2.length > 0) printData.push({ athletes: athletesR2, schoolName: result.rank2SchoolName, rankTitle: 'รองชนะเลิศอันดับ 1', globalOffset: athletesR1.length });
      if (rank === 3 || rank === 'all') if (athletesR3.length > 0) printData.push({ athletes: athletesR3, schoolName: result.rank3SchoolName, rankTitle: 'รองชนะเลิศอันดับ 2', globalOffset: athletesR1.length + athletesR2.length });

      if (printData.length === 0) { Swal.fire('ไม่พบข้อมูล', 'ไม่มีรายชื่อนักกีฬาในลำดับที่เลือก', 'info'); return; }

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const sportDef = sportTypes.find(s => s.id === result.sportId);
      const bgTemplate = sportDef?.certTemplate || '';

      const certsHtml = printData.map(group => group.athletes.map((ath, idx) => {
          const certNo = formatCertNo(result.certStartNo || '', group.globalOffset + idx);
          
          // ตัดเลขลำดับรายการกรีฑาออก (เช่น "001 วิ่ง 40 เมตร ชาย" -> "วิ่ง 40 เมตร ชาย")
          const cleanAthleticsEvent = result.athleticsEvent ? result.athleticsEvent.replace(/^\d+\s+/, '') : '';
          const eventName = cleanAthleticsEvent ? `${result.sportName} (${cleanAthleticsEvent})` : result.sportName;
          
          return `
            <div class="certificate-page">
              ${bgTemplate ? `<img src="${bgTemplate}" class="bg-template" />` : ''}
              <div class="content-container">
                <div class="header-section"><div class="cert-no">เลขที่ ${certNo}</div></div>
                <div class="body-section">              
                  <div class="recipient-name">${ath.prefix}${ath.firstName} ${ath.lastName}</div>
                  <div class="school-name">${group.schoolName}</div>              
                  <div class="achievement-details">
                    <div class="achievement-text">ได้รับรางวัล ${group.rankTitle}</div>
                    <div class="event-text">ประเภทกีฬา ${eventName} รุ่น${result.ageGroup}</div>
                  </div>
                </div>
                <div class="signature-section" style="${bgTemplate ? 'visibility: hidden;' : ''}"><div class="signature-block"></div></div>
              </div>
            </div>
          `;
      }).join('')).join('');

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
              .header-section { height: 100px; position: relative; width: 100%; }
              .signature-section { height: 120px; margin-top: 10px; }
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

  const filteredSchools = schools.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredAgeGroups = ageGroups.filter(a => a.age.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSportTypes = sportTypes.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredAthletics = athleticsList.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.eventNo.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredResults = resultsList.filter(r => 
    r.sportName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (r.athleticsEvent && r.athleticsEvent.toLowerCase().includes(searchTerm.toLowerCase())) ||
    r.ageGroup.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLatestGlobalCertNo = () => {
    const issuedResults = resultsList.filter(r => r.certEndNo);
    if (issuedResults.length === 0) return 'ยังไม่มีการออกเลข';
    const sorted = [...issuedResults].sort((a, b) => (b.certEndNo || '').localeCompare(a.certEndNo || ''));
    return sorted[0].certEndNo || 'ไม่มีข้อมูล';
  };

  const isAthletics = sportTypes.find(s => s.id === resSportId)?.name.includes('กรีฑา');

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-32">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
      <p className="text-slate-500 font-bold">กำลังเชื่อมต่อฐานข้อมูล...</p>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
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
              { id: 'accounts', label: 'จัดการบัญชีโรงเรียน', icon: <Users size={20} />, color: 'blue' },
              { id: 'ageGroups', label: 'จัดการรุ่นอายุ/เพศ', icon: <Trophy size={20} />, color: 'indigo' },
              { id: 'sportTypes', label: 'จัดการประเภทกีฬา', icon: <Dribbble size={20} />, color: 'emerald' },
              { id: 'athletics', label: 'จัดการรายการกรีฑา', icon: <PersonStanding size={20} />, color: 'orange' },
              { id: 'results', label: 'จัดการผลการแข่งขัน', icon: <Award size={20} />, color: 'amber' },
              { id: 'certificates', label: 'จัดการเกียรติบัตร', icon: <ScrollText size={20} />, color: 'rose' },
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 p-4 rounded-3xl backdrop-blur-sm border border-white">
          <h2 className="text-2xl font-black text-slate-800 px-2">
            {activeTab === 'accounts' ? 'บัญชีผู้ใช้งาน' : 
             activeTab === 'ageGroups' ? 'รุ่นอายุและเพศ' : 
             activeTab === 'sportTypes' ? 'รายการชนิดกีฬา' : 
             activeTab === 'athletics' ? 'รายการกรีฑา' : 
             activeTab === 'results' ? 'ผลการแข่งขัน' : 'จัดการออกเกียรติบัตร'}
          </h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-full outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm" />
            </div>
            <button onClick={handleRefresh} className={`p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-all ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-400'}`}><RefreshCw size={20} /></button>
            {activeTab !== 'certificates' && (
              <button 
                onClick={() => {
                  setIsAddingNew(true);
                  if (activeTab === 'accounts') setEditingSchool({ id: Date.now().toString(), name: '', username: '', password: '' });
                  if (activeTab === 'ageGroups') setEditingAgeGroup({ id: `AG-${Date.now()}`, age: '', gender: 'ชาย' });
                  if (activeTab === 'sportTypes') setEditingSportType({ id: `S-${Date.now()}`, name: '', description: '', certTemplate: '', rulesPdf: '' });
                  if (activeTab === 'athletics') setEditingAthletics({ id: `AT-${Date.now()}`, eventNo: '', name: '', description: '' });
                  if (activeTab === 'results') {
                      setEditingResult({ id: `RES-${Date.now()}`, rank1SchoolId: '', rank2SchoolId: '', rank3SchoolId: '' });
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

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase font-black border-b bg-slate-50/50">
                <th className="px-8 py-5 w-32 text-center">{activeTab === 'results' || activeTab === 'certificates' ? 'กีฬา' : 'ที่'}</th>
                <th className="px-8 py-5">{activeTab === 'results' || activeTab === 'certificates' ? 'รุ่น / รายการ' : 'ชื่อรายการ'}</th>
                <th className="px-8 py-5">
                  {activeTab === 'sportTypes' ? 'เอกสาร/เทมเพลต' : (activeTab === 'certificates' ? 'กำหนดเลขที่เกียรติบัตร' : (activeTab === 'results' ? 'สรุปผู้ชนะ' : 'รายละเอียด'))}
                </th>
                <th className="px-8 py-5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeTab === 'accounts' && filteredSchools.map((s) => (
                <tr key={s.id} className="hover:bg-blue-50/20 transition-all">
                  <td className="px-8 py-5 font-bold text-slate-300 text-center">#</td>
                  <td className="px-8 py-5 font-bold text-slate-800">{s.name}</td>
                  <td className="px-8 py-5 font-mono text-xs text-slate-500">User: {s.username} | Pass: {s.password}</td>
                  <td className="px-8 py-5 text-center flex justify-center gap-2">
                    <button onClick={() => { setEditingSchool(s); setIsAddingNew(false); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Edit2 size={18} /></button>
                    <button onClick={() => handleDeleteItem('deleteAccount', s.id, s.name)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><Trash2 size={18} /></button>
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
                      {/* อัปโหลดเทมเพลตเกียรติบัตร */}
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

                      {/* อัปโหลด PDF ระเบียบการ */}
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
                    <div className="flex items-center gap-2 font-black text-amber-600"><Medal size={16} className="text-yellow-500" /> {r.rank1SchoolName || '-'}</div>
                    <div className="text-[10px] text-slate-400 mt-1">2: {r.rank2SchoolName || '-'} | 3: {r.rank3SchoolName || '-'}</div>
                  </td>
                  <td className="px-8 py-5 text-center flex justify-center gap-2">
                    <button onClick={() => { setEditingResult(r); setIsAddingNew(false); setResSportId(r.sportId); setResAgeGroup(r.ageGroup || ''); setResAthEvent(r.athleticsEvent || ''); }} className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"><Edit2 size={18} /></button>
                    <button onClick={() => handleDeleteItem('deleteResult', r.id, `${r.sportName} ${r.ageGroup}`)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
              {activeTab === 'certificates' && filteredResults.map((r) => (
                <tr key={r.id} className="hover:bg-rose-50/20 transition-all group">
                  <td className="px-8 py-5 font-black text-rose-600 bg-rose-50/50 text-center">{r.sportName}</td>
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-800 text-sm">{r.ageGroup}</div>
                    {r.athleticsEvent && <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{r.athleticsEvent}</div>}
                    <div className="mt-2">
                      <label className="flex items-center gap-2 cursor-pointer w-fit group/pub">
                        <input type="checkbox" checked={r.isPublished} onChange={() => handleTogglePublish(r)} className="rounded border-slate-300 text-rose-600 focus:ring-rose-500/20" />
                        <span className="text-[9px] font-black uppercase text-slate-400 group-hover/pub:text-rose-500 transition-colors">แสดงให้โรงเรียนเห็น</span>
                      </label>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-32">
                          <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">เลขที่เริ่มต้น</label>
                          <input type="text" placeholder="001/2568" value={r.certStartNo || ''} onChange={(e) => handleUpdateCertFieldLocally(r, 'certStartNo', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-rose-500/20 group-hover:bg-white transition-all" />
                        </div>
                        <div className="pt-4">
                          <button onClick={() => handleSaveCertConfig(r)} disabled={isSavingCert === r.id} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all active:scale-95 ${isSavingCert === r.id ? 'bg-slate-100 text-slate-400' : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white shadow-sm'}`}>
                            {isSavingCert === r.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            บันทึกค่า
                          </button>
                        </div>
                      </div>
                      
                      {r.certEndNo && (
                        <div className="bg-rose-50/50 border border-rose-100 rounded-xl px-4 py-2 flex items-center justify-between group-hover:bg-white transition-all">
                           <div className="flex items-center gap-2">
                              <CheckCircle2 size={12} className="text-rose-500" />
                              <span className="text-[9px] font-black text-rose-700 uppercase tracking-widest">เลขลำดับสุดท้าย:</span>
                           </div>
                           <span className="text-xs font-black text-rose-600">{r.certEndNo}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex flex-col gap-2">
                       <button onClick={() => handlePrintCertificates(r, 'all')} className="w-full py-2.5 bg-rose-600 text-white rounded-xl font-black text-[10px] flex items-center justify-center gap-2 shadow-lg hover:bg-rose-700 active:scale-95 transition-all"><PrinterCheck size={14} /> พิมพ์ทั้งหมด</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <input type="file" ref={templateInputRef} onChange={onTemplateFileChange} accept="image/*" className="hidden" />
      <input type="file" ref={pdfInputRef} onChange={onPdfFileChange} accept="application/pdf" className="hidden" />

      {/* Account Modal */}
      {editingSchool && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className={`p-8 text-white flex justify-between items-center ${isAddingNew ? 'bg-blue-600' : 'bg-blue-800'}`}>
              <h4 className="font-black text-2xl">จัดการบัญชีโรงเรียน</h4>
              <button onClick={() => setEditingSchool(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveAccount} className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">ชื่อโรงเรียน</label>
                <div className="relative">
                  <SchoolIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" required value={editingSchool.name} onChange={(e) => setEditingSchool({...editingSchool, name: e.target.value})} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="ระบุชื่อโรงเรียน" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">Username</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" required value={editingSchool.username} onChange={(e) => setEditingSchool({...editingSchool, username: e.target.value})} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="username สำหรับเข้าสู่ระบบ" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <EyeOff className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" required value={editingSchool.password} onChange={(e) => setEditingSchool({...editingSchool, password: e.target.value})} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="password สำหรับเข้าสู่ระบบ" />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95">
                <Save size={20} /> บันทึกข้อมูลบัญชี
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Age Group Modal */}
      {editingAgeGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className={`p-8 text-white flex justify-between items-center ${isAddingNew ? 'bg-indigo-600' : 'bg-indigo-800'}`}>
              <h4 className="font-black text-2xl">จัดการรุ่นอายุและเพศ</h4>
              <button onClick={() => setEditingAgeGroup(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveAgeGroup} className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">ชื่อรุ่นอายุ</label>
                <input type="text" required value={editingAgeGroup.age} onChange={(e) => setEditingAgeGroup({...editingAgeGroup, age: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="เช่น อนุบาล, ไม่เกิน 12 ปี" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">เพศ</label>
                <select required value={editingAgeGroup.gender} onChange={(e) => setEditingAgeGroup({...editingAgeGroup, gender: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer">
                  <option value="ชาย">ชาย</option>
                  <option value="หญิง">หญิง</option>
                  <option value="ทั่วไป">ทั่วไป (คละชาย-หญิง)</option>
                </select>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95">
                <Save size={20} /> บันทึกรุ่นอายุ
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sport Type Modal */}
      {editingSportType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className={`p-8 text-white flex justify-between items-center ${isAddingNew ? 'bg-emerald-600' : 'bg-emerald-800'}`}>
              <h4 className="font-black text-2xl">จัดการชนิดกีฬา</h4>
              <button onClick={() => setEditingSportType(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveSportType} className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">ชื่อชนิดกีฬา</label>
                <input type="text" required value={editingSportType.name} onChange={(e) => setEditingSportType({...editingSportType, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" placeholder="ระบุชื่อกีฬา" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">คำอธิบาย</label>
                <textarea value={editingSportType.description} onChange={(e) => setEditingSportType({...editingSportType, description: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl h-24 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" placeholder="ระบุคำอธิบายย่อย" />
              </div>
              <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-95">
                <Save size={20} /> บันทึกข้อมูลกีฬา
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Athletics Modal */}
      {editingAthletics && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className={`p-8 text-white flex justify-between items-center ${isAddingNew ? 'bg-orange-600' : 'bg-orange-800'}`}>
              <h4 className="font-black text-2xl">จัดการรายการกรีฑา</h4>
              <button onClick={() => setEditingAthletics(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveAthletics} className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">เลขที่รายการ (Event No.)</label>
                <input type="text" required value={editingAthletics.eventNo} onChange={(e) => setEditingAthletics({...editingAthletics, eventNo: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-orange-500/10 transition-all" placeholder="เช่น 001, 102" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">ชื่อรายการแข่งขัน</label>
                <input type="text" required value={editingAthletics.name} onChange={(e) => setEditingAthletics({...editingAthletics, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-orange-500/10 transition-all" placeholder="เช่น วิ่ง 100 เมตร, กระโดดไกล" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">คำอธิบายเพิ่มเติม</label>
                <textarea value={editingAthletics.description} onChange={(e) => setEditingAthletics({...editingAthletics, description: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl h-24 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-orange-500/10 transition-all" placeholder="ระบุรายละเอียด (ถ้ามี)" />
              </div>
              <button type="submit" className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black shadow-xl shadow-orange-100 flex items-center justify-center gap-2 hover:bg-orange-700 transition-all active:scale-95">
                <Save size={20} /> บันทึกรายการกรีฑา
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Competition Result Modal */}
      {editingResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
            <div className={`p-8 text-white flex justify-between items-center ${isAddingNew ? 'bg-amber-600' : 'bg-amber-800'}`}>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl"><Award size={32} /></div>
                <div>
                  <h4 className="font-black text-2xl">จัดการผลการแข่งขัน</h4>
                  <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">Competition Result Manager</p>
                </div>
              </div>
              <button onClick={() => setEditingResult(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X size={28} /></button>
            </div>
            <form onSubmit={handleSaveResult} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-widest border-l-4 border-amber-600 pl-3">ส่วนที่ 1: รายการแข่งขัน</h5>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">ชนิดกีฬา</label>
                    <select required value={resSportId} onChange={(e) => setResSportId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all">
                      <option value="">-- เลือกกีฬา --</option>
                      {sportTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">รุ่นอายุ</label>
                    <select required value={resAgeGroup} onChange={(e) => setResAgeGroup(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all">
                      <option value="">-- เลือกรุ่นอายุ --</option>
                      {ageGroups.map(a => <option key={a.id} value={`${a.age} (${a.gender})`}>{a.age} ({a.gender})</option>)}
                    </select>
                  </div>
                  {isAthletics && (
                    <div className="animate-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-slate-400 block mb-2 px-1 uppercase tracking-widest">รายการกรีฑา</label>
                      <select required value={resAthEvent} onChange={(e) => setResAthEvent(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all border-amber-200 bg-amber-50/20">
                        <option value="">-- เลือกรายการ --</option>
                        {athleticsList.map(ev => <option key={ev.id} value={`${ev.eventNo} ${ev.name}`}>{ev.eventNo}. {ev.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-l-4 border-emerald-600 pl-3">ส่วนที่ 2: สรุปผลรางวัล</h5>
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
                    <div className="space-y-4 animate-in fade-in">
                      <div>
                        <label className="text-[10px] font-black text-amber-500 flex items-center gap-1 mb-2 px-1 uppercase tracking-widest"><Medal size={12} className="text-yellow-500" /> ชนะเลิศ (อันดับ 1)</label>
                        <select required value={editingResult.rank1SchoolId} onChange={(e) => setEditingResult({...editingResult, rank1SchoolId: e.target.value})} className="w-full px-5 py-3 bg-white border-2 border-amber-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-amber-500 transition-all">
                          <option value="">-- เลือกโรงเรียน --</option>
                          {resRegisteredSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 flex items-center gap-1 mb-2 px-1 uppercase tracking-widest"><Medal size={12} className="text-slate-400" /> รองชนะเลิศอันดับ 1 (อันดับ 2)</label>
                        <select value={editingResult.rank2SchoolId} onChange={(e) => setEditingResult({...editingResult, rank2SchoolId: e.target.value})} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-slate-500/10 transition-all">
                          <option value="">-- เลือกโรงเรียน (ถ้ามี) --</option>
                          {resRegisteredSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-orange-400 flex items-center gap-1 mb-2 px-1 uppercase tracking-widest"><Medal size={12} className="text-orange-400" /> รองชนะเลิศอันดับ 2 (อันดับ 3)</label>
                        <select value={editingResult.rank3SchoolId} onChange={(e) => setEditingResult({...editingResult, rank3SchoolId: e.target.value})} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-slate-500/10 transition-all">
                          <option value="">-- เลือกโรงเรียน (ถ้ามี) --</option>
                          {resRegisteredSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100 flex items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shrink-0"><AlertCircle size={24} /></div>
                <div>
                  <h6 className="text-sm font-black text-slate-800 mb-1">คำแนะนำการกรอกข้อมูล</h6>
                  <p className="text-xs text-slate-500 leading-relaxed">กรุณาตรวจสอบรายชื่อโรงเรียนที่ชนะเลิศให้ถูกต้อง ระบบจะใช้ข้อมูลนี้ในการสร้างเกียรติบัตรให้กับนักกีฬาของโรงเรียนนั้นๆ โดยอัตโนมัติหลังจากบันทึกผลการแข่งขันแล้ว</p>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={!resSportId || !resAgeGroup || !editingResult.rank1SchoolId}
                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-xl shadow-slate-200 flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                <Save size={24} /> บันทึกผลการแข่งขัน
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
