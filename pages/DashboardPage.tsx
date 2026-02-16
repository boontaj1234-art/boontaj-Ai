import React, { useState, useEffect, useRef } from 'react';
import { UserSession, SchoolProfile, Sport, Athlete, CompetitionResult, FeedbackRecord, School } from '../types';
import { SCRIPT_URL, ICON_MAP } from '../constants';
import RegistrationPage from './RegistrationPage';
import { 
  ClipboardList, 
  Trophy, 
  Users, 
  ChevronRight, 
  Loader2, 
  UserCircle, 
  FileText, 
  LayoutDashboard,
  Settings,
  Menu,
  X,
  XCircle,
  School as SchoolIcon,
  CheckCircle,
  AlertCircle,
  Camera,
  Save,
  Palette,
  Briefcase,
  Quote,
  Phone,
  Hash,
  WifiOff,
  RefreshCw,
  Download,
  FileSearch,
  MessageSquare,
  Send,
  ArrowLeft,
  UserCheck,
  Medal,
  Printer,
  PrinterCheck,
  History,
  Reply,
  BarChart3,
  Search,
  Eye,
  Info,
  ScrollText,
  FileDown,
  Award,
  SearchCheck,
  Filter,
  PersonStanding
} from 'lucide-react';

declare var Swal: any;

interface DashboardPageProps {
  session: UserSession;
  onNavigate: (path: string) => void;
}

type TabType = 'overview' | 'profile' | 'register' | 'check-list' | 'rules' | 'feedback' | 'results-view';

interface MedalStanding {
  schoolId: string;
  schoolName: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ session, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [registeredCount, setRegisteredCount] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sportsList, setSportsList] = useState<Sport[]>([]);
  const [resultsList, setResultsList] = useState<CompetitionResult[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [isSportsLoading, setIsSportsLoading] = useState(false);
  
  // Filter states for results view
  const [searchSport, setSearchSport] = useState('');
  const [searchAge, setSearchAge] = useState('');
  
  // State for school medal details
  const [selectedSchoolForMedals, setSelectedSchoolForMedals] = useState<MedalStanding | null>(null);

  // States for check-list tab
  const [registeredSportsDetails, setRegisteredSportsDetails] = useState<Sport[]>([]);
  const [isCheckListLoading, setIsCheckListLoading] = useState(false);
  const [selectedSportForView, setSelectedSportForView] = useState<Sport | null>(null);
  const [athletesInSport, setAthletesInSport] = useState<any[]>([]);
  const [isAthletesLoading, setIsAthletesLoading] = useState(false);
  const [issuedCertificates, setIssuedCertificates] = useState<any[]>([]);

  const [profile, setProfile] = useState<SchoolProfile>({
    schoolId: session.schoolId,
    directorName: '',
    schoolColors: '',
    staffCount: '',
    motto: '',
    phoneNumber: '',
    logo: ''
  });
  
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for feedback form
  const [feedbackType, setFeedbackType] = useState('ข้อเสนอแนะทั่วไป');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackDetails, setFeedbackDetails] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState<FeedbackRecord[]>([]);
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);

  useEffect(() => {
    const fetchOverviewStats = async () => {
      setIsOverviewLoading(true);
      try {
        const [regRes, resultsRes, sportsRes, accRes] = await Promise.all([
          fetch(`${SCRIPT_URL}?action=getRegistrations&schoolId=${session.schoolId}`),
          fetch(`${SCRIPT_URL}?action=getResults`),
          fetch(`${SCRIPT_URL}?action=getSports`),
          fetch(`${SCRIPT_URL}?action=getAccounts`)
        ]);
        const regData = await regRes.json();
        const resultsData = await resultsRes.json();
        const sportsData = await sportsRes.json();
        const accData = await accRes.json();
        
        if (Array.isArray(regData)) setRegisteredCount(regData.length);
        if (Array.isArray(resultsData)) setResultsList(resultsData);
        if (Array.isArray(sportsData)) setSportsList(sportsData);
        if (accData) {
          const mappedSchools = Object.keys(accData).map(id => ({ 
            id: String(id).trim(), 
            name: accData[id].name || ''
          }));
          setSchools(mappedSchools);
        }
      } catch (error) {
        setRegisteredCount(0);
      } finally {
        setIsOverviewLoading(false);
      }
    };
    if (activeTab === 'overview' || activeTab === 'results-view') fetchOverviewStats();
  }, [session.schoolId, activeTab]);

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchProfile();
    }
    if (activeTab === 'rules' || activeTab === 'check-list') {
      fetchSports();
    }
    if (activeTab === 'check-list') {
      fetchRegisteredSportsOnly();
      fetchCertificatesIssued();
    }
    if (activeTab === 'feedback') {
      fetchMyFeedbacks();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    setIsProfileLoading(true);
    setProfileError(null);
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getSchoolProfile&schoolId=${session.schoolId}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      if (data && data.schoolId) {
        setProfile(data);
      } else if (data && data.status === 'error') {
        throw new Error(data.message || 'Server error');
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
      setProfileError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่ภายหลัง');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const fetchSports = async () => {
    setIsSportsLoading(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getSports`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setSportsList(data);
      }
    } catch (err) {
      console.error('Fetch sports error:', err);
    } finally {
      setIsSportsLoading(false);
    }
  };

  const fetchCertificatesIssued = async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getCertificatesIssued`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setIssuedCertificates(data);
      }
    } catch (err) {
      console.error('Fetch certificates issued error:', err);
    }
  };

  const fetchRegisteredSportsOnly = async () => {
    setIsCheckListLoading(true);
    try {
      const regRes = await fetch(`${SCRIPT_URL}?action=getRegistrations&schoolId=${session.schoolId}`);
      const regIds = await regRes.json();
      const sportsRes = await fetch(`${SCRIPT_URL}?action=getSports`);
      const allSports = await sportsRes.json();
      
      if (Array.isArray(regIds) && Array.isArray(allSports)) {
        const filtered = allSports.filter(s => regIds.includes(s.id));
        setRegisteredSportsDetails(filtered);
      }
    } catch (err) {
      console.error('Fetch check-list error:', err);
    } finally {
      setIsCheckListLoading(false);
    }
  };

  const fetchAthletesBySport = async (sport: Sport) => {
    setSelectedSportForView(sport);
    setIsAthletesLoading(true);
    fetchCertificatesIssued();
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getAthletes&schoolId=${session.schoolId}&sportId=${sport.id}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setAthletesInSport(data);
      } else {
        setAthletesInSport([]);
      }
    } catch (err) {
      console.error('Fetch athletes error:', err);
      setAthletesInSport([]);
    } finally {
      setIsAthletesLoading(false);
    }
  };

  const fetchMyFeedbacks = async () => {
    setIsFetchingFeedback(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getFeedbacks`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const filtered = data.filter(f => f.schoolId === session.schoolId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setMyFeedbacks(filtered);
      }
    } catch (err) {
      console.error('Fetch my feedbacks error:', err);
    } finally {
      setIsFetchingFeedback(false);
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

    // Process only published results
    resultsList.filter(r => r.isPublished).forEach(res => {
      // Helper to add medal to a school
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

    let csvContent = "\uFEFF"; // UTF-8 BOM for Thai support
    csvContent += "ตารางสรุปเหรียญรางวัลรวม,กลุ่มโรงเรียนตะเคียน-ลมศักดิ์\n";
    csvContent += `ข้อมูล ณ วันที่,${new Date().toLocaleDateString('th-TH')}\n\n`;
    csvContent += "อันดับ,โรงเรียน,เหรียญทอง,เหรียญเงิน,เหรียญทองแดง,รวมทั้งหมด\n";

    standings.forEach((school, idx) => {
      csvContent += `${idx + 1},${school.schoolName},${school.gold},${school.silver},${school.bronze},${school.total}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `สรุปเหรียญรางวัลรวม_${new Date().getTime()}.csv`);
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
      r.rank3SchoolId === selectedSchoolForMedals.schoolId
    )).map(r => ({
      sportName: r.sportName,
      ageGroup: r.ageGroup,
      athleticsEvent: r.athleticsEvent || '-',
      rank: r.rank1SchoolId === selectedSchoolForMedals.schoolId ? 'ชนะเลิศ (เหรียญทอง)' : 
            r.rank2SchoolId === selectedSchoolForMedals.schoolId ? 'รองชนะเลิศอันดับ 1 (เหรียญเงิน)' : 'รองชนะเลิศอันดับ 2 (เหรียญทองแดง)'
    }));

    // CSV Header with BOM for Thai encoding
    let csvContent = "\uFEFF";
    csvContent += "โรงเรียน,เหรียญทอง,เหรียญเงิน,เหรียญทองแดง,เหรียญรวม\n";
    csvContent += `${selectedSchoolForMedals.schoolName},${selectedSchoolForMedals.gold},${selectedSchoolForMedals.silver},${selectedSchoolForMedals.bronze},${selectedSchoolForMedals.total}\n\n`;
    csvContent += "ลำดับ,ชนิดกีฬา,รุ่นอายุ,รายการ,รางวัลที่ได้รับ\n";
    
    schoolMedals.forEach((m, idx) => {
      csvContent += `${idx + 1},${m.sportName},${m.ageGroup},${m.athleticsEvent},${m.rank}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `สรุปเหรียญรางวัล_${selectedSchoolForMedals.schoolName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAwardStatusFromCert = (athlete: any, sportName: string) => {
    const fullName = `${athlete.prefix}${athlete.firstName} ${athlete.lastName}`.trim().toLowerCase();
    const schoolName = session.schoolName.trim().toLowerCase();
    const sName = sportName.trim().toLowerCase();
    const ageGroup = (athlete.ageGroup || '').trim().toLowerCase();
    const athleticsEvent = (athlete.athleticsEvent || '').trim().toLowerCase() || '-';

    const award = issuedCertificates.find(c => {
      const cFullName = String(c.fullName || '').trim().toLowerCase();
      const cSchoolName = String(c.schoolName || '').trim().toLowerCase();
      const cSportName = String(c.sportName || '').trim().toLowerCase();
      const cAgeGroup = String(c.ageGroup || '').trim().toLowerCase();
      const cEvent = String(c.athleticsEvent || '').trim().toLowerCase();

      return cFullName === fullName &&
             cSchoolName === schoolName &&
             cSportName === sName &&
             cAgeGroup === ageGroup &&
             (cEvent === athleticsEvent || (cEvent === '-' && athleticsEvent === ''));
    });

    if (!award) return null;

    const rank = award.rank;
    let style = { text: rank, color: 'bg-blue-50 text-blue-600 border-blue-100', iconColor: 'text-blue-300', certData: award };

    if (rank.includes('ชนะเลิศ') && !rank.includes('รอง')) 
      style = { ...style, color: 'bg-yellow-100 text-yellow-700 border-yellow-200', iconColor: 'text-yellow-500' };
    else if (rank.includes('อันดับ 1')) 
      style = { ...style, color: 'bg-slate-100 text-slate-700 border-slate-200', iconColor: 'text-slate-400' };
    else if (rank.includes('อันดับ 2')) 
      style = { ...style, color: 'bg-orange-100 text-orange-700 border-orange-200', iconColor: 'text-orange-500' };

    return style;
  };

  const handlePrintSingleCertificate = (award: any) => {
    if (!selectedSportForView) return;

    const sportDef = sportsList.find(s => s.id === selectedSportForView.id) as any;
    const bgTemplate = sportDef?.certTemplate || '';

    if (!bgTemplate) {
      Swal.fire({
        icon: 'info',
        title: 'อยู่ระหว่างการจัดทำ',
        text: 'ขออภัย แอดมินยังไม่ได้อัปโหลดเทมเพลตเกียรติบัตรสำหรับกีฬานี้ กรุณาติดต่อฝ่ายจัดการแข่งขัน'
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cleanAthleticsEvent = award.athleticsEvent !== '-' ? award.athleticsEvent.replace(/^\d+\s+/, '') : '';
    const eventName = cleanAthleticsEvent ? `${award.sportName} (${cleanAthleticsEvent})` : award.sportName;

    printWindow.document.write(`
      <html>
        <head>
          <title>เกียรติบัตร - ${award.fullName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 landscape; margin: 0; }
            body { margin: 0; padding: 0; font-family: 'Sarabun', sans-serif; }
            .certificate-page { width: 297mm; height: 210mm; background: white; position: relative; overflow: hidden; }
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
          <div class="certificate-page">
            <img src="${bgTemplate}" class="bg-template" />
            <div class="content-container">
              <div class="cert-no">เลขที่ ${award.certNo}</div>
              <div class="body-section">              
                <div class="recipient-name">${award.fullName}</div>
                <div class="school-name">${award.schoolName}</div>              
                <div class="achievement-details">
                  <div class="achievement-text">ได้รับรางวัล ${award.rank}</div>
                  <div class="event-text">ประเภทกีฬา ${eventName} รุ่น${award.ageGroup}</div>
                </div>
              </div>
            </div>
          </div>
          <script>window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 500); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAllCertificates = () => {
    if (!selectedSportForView || athletesInSport.length === 0) return;

    const awardedAthletes = athletesInSport
      .map(ath => getAwardStatusFromCert(ath, selectedSportForView.name))
      .filter(status => status !== null)
      .map(status => status?.certData);

    if (awardedAthletes.length === 0) {
      Swal.fire('ไม่พบรายชื่อ', 'ยังไม่มีนักกีฬาที่ได้รับรางวัลในรายการนี้ที่ประกาศผลแล้ว', 'info');
      return;
    }

    const sportDef = sportsList.find(s => s.id === selectedSportForView.id) as any;
    const bgTemplate = sportDef?.certTemplate || '';

    if (!bgTemplate) {
      Swal.fire('อยู่ระหว่างการจัดทำ', 'แอดมินยังไม่ได้อัปโหลดเทมเพลตเกียรติบัตรสำหรับกีฬานี้', 'info');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const certsHtml = awardedAthletes.map(award => {
      const cleanAthleticsEvent = award.athleticsEvent !== '-' ? award.athleticsEvent.replace(/^\d+\s+/, '') : '';
      const eventName = cleanAthleticsEvent ? `${award.sportName} (${cleanAthleticsEvent})` : award.sportName;

      return `
        <div class="certificate-page">
          <img src="${bgTemplate}" class="bg-template" />
          <div class="content-container">
            <div class="cert-no">เลขที่ ${award.certNo}</div>
            <div class="body-section">              
              <div class="recipient-name">${award.fullName}</div>
              <div class="school-name">${award.schoolName}</div>              
              <div class="achievement-details">
                <div class="achievement-text">ได้รับรางวัล ${award.rank}</div>
                <div class="event-text">ประเภทกีฬา ${eventName} รุ่น${award.ageGroup}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>เกียรติบัตรทั้งหมด - ${selectedSportForView.name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 landscape; margin: 0; }
            body { margin: 0; padding: 0; font-family: 'Sarabun', sans-serif; }
            .certificate-page { width: 297mm; height: 210mm; background: white; position: relative; overflow: hidden; page-break-after: always; }
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
  };

  const handleDownloadPdf = (sport: Sport) => {
    if (!sport.rulesPdf) {
      Swal.fire('ไม่พบเอกสาร', 'ขออภัย ยังไม่มีการอัปโหลดระเบียบการสำหรับกีฬานี้', 'info');
      return;
    }

    try {
      const base64Data = sport.rulesPdf.split(',')[1] || sport.rulesPdf;
      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ระเบียบการ_${sport.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      Swal.fire('ดาวน์โหลดล้มเหลว', 'เกิดข้อผิดพลาดในการประมวลผลไฟล์ PDF', 'error');
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) { 
        Swal.fire('ไฟล์ใหญ่เกินไป', 'กรุณาเลือกไฟล์รูปภาพขนาดไม่เกิน 800KB เพื่อประสิทธิภาพสูงสุด', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileSaving(true);
    Swal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'updateSchoolProfile',
          data: profile
        })
      });
      
      const result = await response.json();

      if (result.status === 'success') {
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: 'ข้อมูลพื้นฐานโรงเรียนได้รับการอัปเดตแล้ว', timer: 1500, showConfirmButton: false });
      } else {
        throw new Error(result.message || 'บันทึกล้มเหลว');
      }
    } catch (error) {
      console.error('Save error:', error);
      Swal.fire('บันทึกล้มเหลว', 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่ภายหลัง', 'error');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackSubject.trim() || !feedbackDetails.trim()) {
      Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุหัวข้อและรายละเอียดข้อเสนอแนะ', 'warning');
      return;
    }

    setIsSubmittingFeedback(true);
    Swal.fire({ title: 'กำลังส่งข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'submitFeedback',
          data: {
            schoolId: session.schoolId,
            schoolName: session.schoolName,
            type: feedbackType,
            subject: feedbackSubject,
            details: feedbackDetails
          }
        })
      });
      const result = await response.json();
      if (result.status === 'success') {
        Swal.fire('ส่งสำเร็จ', 'ขอบคุณสำหรับข้อเสนอแนะ เราจะนำไปพัฒนาระบบได้ดียิ่งขึ้น', 'success');
        setFeedbackSubject('');
        setFeedbackDetails('');
        fetchMyFeedbacks();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Submit feedback error:', error);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถส่งข้อมูลได้ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const menuItems = [
    { id: 'overview', label: 'ภาพรวมระบบ', icon: <LayoutDashboard size={20} /> },
    { id: 'profile', label: 'ข้อมูลพื้นฐาน', icon: <Settings size={20} /> },
    { id: 'register', label: 'ลงทะเบียนแข่งขันกีฬา', icon: <ClipboardList size={20} /> },
    { id: 'results-view', label: 'ตรวจสอบผลการแข่งขัน', icon: <Award size={20} /> },
    { id: 'check-list', label: 'ตรวจสอบรายชื่อ', icon: <Users size={20} /> },
    { id: 'rules', label: 'ระเบียบการแข่งขัน', icon: <FileText size={20} /> },
    { id: 'feedback', label: 'ข้อเสนอแนะ/แจ้งปัญหา', icon: <MessageSquare size={20} /> },
  ];

  const renderMedalDetailsModal = () => {
    if (!selectedSchoolForMedals) return null;

    const schoolMedals = resultsList.filter(r => r.isPublished && (
      r.rank1SchoolId === selectedSchoolForMedals.schoolId || 
      r.rank2SchoolId === selectedSchoolForMedals.schoolId || 
      r.rank3SchoolId === selectedSchoolForMedals.schoolId
    )).map(r => ({
      ...r,
      type: r.rank1SchoolId === selectedSchoolForMedals.schoolId ? 'gold' : 
            r.rank2SchoolId === selectedSchoolForMedals.schoolId ? 'silver' : 'bronze'
    }));

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-8 bg-amber-500 text-white flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-2xl font-black">{selectedSchoolForMedals.schoolName}</h3>
              <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-1">สรุปรายละเอียดเหรียญรางวัล</p>
            </div>
            <button onClick={() => setSelectedSchoolForMedals(null)} className="relative z-20 p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X size={24} />
            </button>
            <Trophy className="absolute right-[-20px] bottom-[-20px] w-48 h-48 text-white/10 rotate-12" />
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

            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ScrollText size={14} className="text-amber-500" /> รายการความสำเร็จ
            </h4>

            {schoolMedals.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                <p className="text-slate-400 font-bold">ไม่พบข้อมูลเหรียญรางวัล</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schoolMedals.map((medal, idx) => (
                  <div key={idx} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:border-amber-200 transition-all shadow-sm group">
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
                      {medal.type === 'gold' ? 'ชนะเลิศ' : medal.type === 'silver' ? 'รองอันดับ 1' : 'รองอันดับ 2'}
                    </div>
                  </div>
                ))}
              </div>
            )}
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

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        const standings = calculateMedalStandings();
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {renderMedalDetailsModal()}
            <section className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-black mb-4">สวัสดี, {session.schoolName}</h2>
                <p className="text-blue-100 font-medium mb-6 opacity-90">
                  ยินดีต้อนรับสู่ระบบจัดการการแข่งขันกีฬากลุ่มโรงเรียนตะเคียน-ลมศักดิ์
                </p>
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => setActiveTab('register')}
                    className="bg-white text-blue-600 px-8 py-3.5 rounded-2xl font-black shadow-lg hover:bg-blue-50 transition-all active:scale-95 text-sm"
                  >
                    เริ่มลงทะเบียนตอนนี้
                  </button>
                  <button 
                    onClick={() => setActiveTab('results-view')}
                    className="bg-blue-500/30 backdrop-blur-md text-white border border-white/20 px-8 py-3.5 rounded-2xl font-black shadow-lg hover:bg-blue-500/50 transition-all active:scale-95 text-sm flex items-center gap-2"
                  >
                    <Award size={18} /> ตรวจสอบผลรางวัล
                  </button>
                </div>
              </div>
              <Trophy className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/10 rotate-12" />
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-all">
                <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                  <CheckCircle size={28} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-wider mb-1">ลงทะเบียนแล้ว</p>
                  <p className="text-2xl font-black text-slate-800">
                    {registeredCount === null ? <Loader2 className="animate-spin" size={20} /> : `${registeredCount} รายการ`}
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-all">
                <div className="bg-amber-50 p-4 rounded-2xl text-amber-600 group-hover:scale-110 transition-transform">
                  <Trophy size={28} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-wider mb-1">สถานะรางวัล</p>
                  <p className="text-2xl font-black text-slate-800">
                    {resultsList.filter(r => r.isPublished).length > 0 ? 'สรุปผลแล้ว' : 'รอสรุปผล'}
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-all">
                <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                  <AlertCircle size={28} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-wider mb-1">ประกาศสำคัญ</p>
                  <p className="text-sm font-bold text-slate-800">ไม่มีแจ้งเตือนใหม่</p>
                </div>
              </div>
            </div>

            {/* Medal Standings Section */}
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl border border-slate-100 overflow-hidden">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200">
                       <BarChart3 size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-800">ตารางสรุปเหรียญรางวัล</h3>
                      <p className="text-slate-400 text-sm font-bold mt-0.5 uppercase tracking-widest">Medal Standings</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={handleExportAllStandingsToExcel}
                      className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                    >
                      <FileDown size={18} />
                      ส่งออกตารางสรุป
                    </button>
                    <div className="hidden sm:block text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">อัปเดตล่าสุด</p>
                       <p className="text-xs font-bold text-slate-600">{new Date().toLocaleDateString('th-TH')}</p>
                    </div>
                  </div>
               </div>

               {isOverviewLoading ? (
                 <div className="py-20 flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-amber-500" size={48} />
                    <p className="text-slate-400 font-bold">กำลังประมวลผลข้อมูลเหรียญ...</p>
                 </div>
               ) : standings.length === 0 ? (
                 <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                    <Trophy className="mx-auto text-slate-200 mb-4" size={56} />
                    <p className="text-slate-400 font-bold max-w-xs mx-auto">ยังไม่มีการประกาศผลการแข่งขันในระบบในขณะนี้</p>
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
                               <CheckCircle size={16} className="text-blue-600" />
                               <span>รวม</span>
                            </div>
                          </th>
                          <th className="px-8 py-5 text-center">ดูข้อมูล</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {standings.map((school, idx) => (
                          <tr 
                            key={school.schoolId} 
                            onClick={() => setSelectedSchoolForMedals(school)}
                            className={`hover:bg-amber-50/40 transition-all cursor-pointer group ${school.schoolId === session.schoolId ? 'bg-blue-50/50' : ''}`}
                          >
                            <td className="px-8 py-5 text-center font-black text-slate-400">{idx + 1}</td>
                            <td className="px-8 py-5">
                               <div className="flex items-center gap-3">
                                  {school.schoolId === session.schoolId && <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>}
                                  <span className={`text-sm font-black ${school.schoolId === session.schoolId ? 'text-blue-700' : 'text-slate-800'}`}>
                                    {school.schoolName}
                                  </span>
                               </div>
                            </td>
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
               <p className="mt-6 text-[10px] font-bold text-slate-400 flex items-center gap-2 px-2">
                  <Info size={14} className="text-amber-500" /> คลิกที่แถวของโรงเรียนเพื่อดูรายละเอียดประเภทกีฬาที่ได้รับเหรียญรางวัล
               </p>
            </div>
          </div>
        );
      case 'results-view':
        const publishedResults = resultsList.filter(r => r.isPublished);
        
        // Dynamic Filter Options
        const uniqueSports = Array.from(new Set(publishedResults.map(r => r.sportName))).sort();
        const uniqueAges = Array.from(new Set(publishedResults.map(r => r.ageGroup))).sort();

        const filteredResults = publishedResults.filter(r => {
          const matchSport = !searchSport || r.sportName === searchSport;
          const matchAge = !searchAge || r.ageGroup === searchAge;
          return matchSport && matchAge;
        });

        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-amber-500 text-white rounded-[1.8rem] shadow-xl shadow-amber-100">
                      <Award size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 leading-tight">ตรวจสอบผลการแข่งขัน</h2>
                      <p className="text-slate-400 font-bold text-sm">สรุปรายชื่อโรงเรียนที่ได้รับรางวัล แยกตามประเภทและรุ่นอายุ</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative">
                       <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                       <select 
                        value={searchSport}
                        onChange={(e) => setSearchSport(e.target.value)}
                        className="pl-11 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-600 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all appearance-none cursor-pointer"
                       >
                         <option value="">ทุกประเภทกีฬา</option>
                         {uniqueSports.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                    <div className="relative">
                       <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                       <select 
                        value={searchAge}
                        onChange={(e) => setSearchAge(e.target.value)}
                        className="pl-11 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-600 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all appearance-none cursor-pointer"
                       >
                         <option value="">ทุกรุ่นอายุ</option>
                         {uniqueAges.map(a => <option key={a} value={a}>{a}</option>)}
                       </select>
                    </div>
                    {(searchSport || searchAge) && (
                      <button 
                        onClick={() => { setSearchSport(''); setSearchAge(''); }}
                        className="p-3 text-slate-400 hover:text-red-500 transition-colors"
                        title="ล้างตัวกรอง"
                      >
                        <XCircle size={20} />
                      </button>
                    )}
                  </div>
                </div>

                {isOverviewLoading ? (
                  <div className="py-32 flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-amber-500" size={56} />
                    <p className="text-slate-400 font-bold">กำลังดึงข้อมูลผลการแข่งขัน...</p>
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="py-24 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <SearchCheck className="mx-auto text-slate-200 mb-4" size={64} strokeWidth={1} />
                    <h4 className="text-lg font-black text-slate-800 mb-1">ไม่พบข้อมูลที่ต้องการ</h4>
                    <p className="text-slate-400 font-bold text-sm max-w-xs mx-auto">ยังไม่มีการประกาศผลในหมวดหมู่ที่ท่านเลือกในขณะนี้</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {filteredResults.map((res) => (
                      <div key={res.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group">
                        {/* Card Header */}
                        <div className="p-8 flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-500 transition-colors">
                              {ICON_MAP[res.sportName.includes('กรีฑา') ? 'PersonStanding' : 'Trophy'] || <Trophy size={32} />}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 text-xl leading-tight">{res.sportName}</h4>
                              <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">{res.ageGroup}</p>
                            </div>
                          </div>
                          <div className="px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase border border-emerald-100 shadow-sm">Official Result</div>
                        </div>

                        <div className="px-8 pb-8 space-y-4">
                          {/* Athletics Event Header if exists */}
                          {res.athleticsEvent && (
                            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-[1.5rem] flex items-center gap-3">
                              <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                                <Info size={14} />
                              </div>
                              <span className="text-sm font-black text-blue-800 truncate">{res.athleticsEvent}</span>
                            </div>
                          )}

                          {/* Medallists List */}
                          <div className="space-y-3 mt-4">
                            {/* Gold */}
                            <div className={`flex items-center justify-between p-5 rounded-[1.8rem] border transition-all ${res.rank1SchoolId === session.schoolId ? 'bg-yellow-100 border-yellow-300 ring-2 ring-yellow-500/20' : 'bg-yellow-50/50 border-yellow-100 hover:border-yellow-200'}`}>
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                  <Medal size={24} className="text-yellow-500 drop-shadow-sm" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">ชนะเลิศ (ทอง)</p>
                                  <h5 className="font-black text-slate-800 text-sm leading-tight">{res.rank1SchoolName}</h5>
                                </div>
                              </div>
                              {res.rank1SchoolId === session.schoolId && <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />}
                            </div>

                            {/* Silver */}
                            <div className={`flex items-center justify-between p-5 rounded-[1.8rem] border transition-all ${res.rank2SchoolId === session.schoolId ? 'bg-slate-200 border-slate-300 ring-2 ring-slate-400/20' : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'}`}>
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                  <Medal size={24} className="text-slate-400 drop-shadow-sm" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">รองชนะเลิศอันดับ 1</p>
                                  <h5 className="font-black text-slate-800 text-sm leading-tight">{res.rank2SchoolName || '-'}</h5>
                                </div>
                              </div>
                              {res.rank2SchoolId === session.schoolId && <div className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-pulse" />}
                            </div>

                            {/* Bronze */}
                            <div className={`flex items-center justify-between p-5 rounded-[1.8rem] border transition-all ${res.rank3SchoolId === session.schoolId ? 'bg-orange-100 border-orange-300 ring-2 ring-orange-400/20' : 'bg-orange-50/50 border-orange-100 hover:border-orange-200'}`}>
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                  <Medal size={24} className="text-orange-600/70 drop-shadow-sm" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">รองชนะเลิศอันดับ 2</p>
                                  <h5 className="font-black text-slate-800 text-sm leading-tight">{res.rank3SchoolName || '-'}</h5>
                                </div>
                              </div>
                              {res.rank3SchoolId === session.schoolId && <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />}
                            </div>
                          </div>
                        </div>

                        {/* Special Footer for "Own School" results */}
                        {(res.rank1SchoolId === session.schoolId || res.rank2SchoolId === session.schoolId || res.rank3SchoolId === session.schoolId) && (
                          <div className="mt-auto bg-blue-600 p-5 flex items-center justify-between text-white animate-in slide-in-from-bottom-2">
                             <div className="flex items-center gap-3">
                               <div className="bg-white/20 p-2 rounded-xl">
                                  <Award size={20} />
                               </div>
                               <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none mb-1">ความสำเร็จของโรงเรียน</p>
                                  <p className="text-xs font-bold">โรงเรียนของคุณได้รับรางวัลในรายการนี้!</p>
                               </div>
                             </div>
                             <button 
                              onClick={() => setActiveTab('check-list')}
                              className="bg-white text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                             >
                               ไปตรวจสอบรายชื่อ
                             </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        );
      case 'profile':
        return (
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl border border-slate-100 animate-in slide-in-from-bottom-4 overflow-hidden relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-slate-50 pb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <Settings className="text-blue-600" /> แก้ไขข้อมูลพื้นฐานโรงเรียน
                </h3>
                <p className="text-slate-400 text-sm mt-1">กรอกข้อมูลให้ครบถ้วนเพื่อใช้ในการจัดการแข่งขัน</p>
              </div>
              {!profileError && !isProfileLoading && (
                <button 
                  form="profile-form"
                  type="submit"
                  disabled={isProfileSaving}
                  className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isProfileSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  บันทึกข้อมูล
                </button>
              )}
            </div>

            {isProfileLoading ? (
              <div className="py-24 flex flex-col items-center gap-4">
                <div className="relative">
                  <Loader2 className="animate-spin text-blue-600" size={56} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <SchoolIcon size={20} className="text-blue-400" />
                  </div>
                </div>
                <p className="text-slate-400 font-bold animate-pulse">กำลังดึงข้อมูลจากระบบ...</p>
              </div>
            ) : profileError ? (
              <div className="py-20 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                <div className="bg-red-50 p-6 rounded-full text-red-500 mb-6 shadow-inner">
                  <WifiOff size={48} />
                </div>
                <h4 className="text-xl font-black text-slate-800 mb-2">ไม่สามารถเชื่อมต่อฐานข้อมูลได้</h4>
                <p className="text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed">
                  ขออภัย ระบบขัดข้องไม่สามารถดึงข้อมูลได้ในขณะนี้ กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่อีกครั้ง
                </p>
                <button 
                  onClick={fetchProfile}
                  className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
                >
                  <RefreshCw size={18} />
                  ลองใหม่ภายหลัง
                </button>
              </div>
            ) : (
              <form id="profile-form" onSubmit={handleSaveProfile} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                  <div className="md:col-span-4 flex flex-col items-center text-center space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block w-full mb-2 text-center">โลโก้โรงเรียน</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-48 h-48 rounded-[3rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all group overflow-hidden relative shadow-inner"
                    >
                      {profile.logo ? (
                        <>
                          <img src={profile.logo} alt="School Logo" className="w-full h-full object-contain p-4 group-hover:opacity-40 transition-opacity" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600/10 backdrop-blur-sm">
                            <Camera className="text-blue-600" size={32} />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-300 group-hover:text-blue-400">
                          <Camera size={48} strokeWidth={1} />
                          <span className="text-xs font-bold">เลือกรูปภาพ</span>
                        </div>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">แนะนำรูปภาพสัญลักษณ์ประจำโรงเรียน (ไม่เกิน 800KB)</p>
                  </div>

                  <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">ชื่อโรงเรียน (เรียกดูอย่างเดียว)</label>
                      <div className="relative">
                        <SchoolIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input type="text" readOnly value={session.schoolName} className="w-full pl-11 pr-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-500 cursor-not-allowed" />
                      </div>
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">ชื่อผู้อำนวยการ</label>
                      <div className="relative">
                        <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input type="text" required value={profile.directorName} onChange={(e) => setProfile({...profile, directorName: e.target.value})} placeholder="ระบุชื่อ-นามสกุล ผู้อำนวยการ" className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" />
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">สีประจำโรงเรียน</label>
                      <div className="relative">
                        <Palette className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input type="text" required value={profile.schoolColors} onChange={(e) => setProfile({...profile, schoolColors: e.target.value})} placeholder="เช่น ขาว-น้ำเงิน" className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" />
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">จำนวนบุคลากร</label>
                      <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input type="text" required value={profile.staffCount} onChange={(e) => setProfile({...profile, staffCount: e.target.value})} placeholder="จำนวนทั้งหมด" className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">คำขวัญโรงเรียน</label>
                      <div className="relative">
                        <Quote className="absolute left-4 top-4 text-slate-300" size={18} />
                        <textarea value={profile.motto} onChange={(e) => setProfile({...profile, motto: e.target.value})} placeholder="ระบุคำขวัญของโรงเรียน" className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-24 resize-none shadow-sm" />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">เบอร์โทรศัพท์ติดต่อ</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input type="tel" required value={profile.phoneNumber} onChange={(e) => setProfile({...profile, phoneNumber: e.target.value})} placeholder="ระบุเบอร์โทรศัพท์" className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        );
      case 'register':
        return (
          <RegistrationPage 
            schoolName={session.schoolName} 
            schoolId={session.schoolId} 
            onBack={() => setActiveTab('overview')} 
          />
        );
      case 'check-list':
        const hasAnyAwards = athletesInSport.some(ath => getAwardStatusFromCert(ath, selectedSportForView?.name || '') !== null);

        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {selectedSportForView ? (
              <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-slate-100 overflow-hidden relative">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                  <div>
                    <button 
                      onClick={() => { setSelectedSportForView(null); setAthletesInSport([]); }} 
                      className="flex items-center gap-2 text-slate-400 hover:text-blue-600 mb-4 font-black text-xs uppercase transition-colors"
                    >
                      <ArrowLeft size={16} /> ย้อนกลับไปรายการกีฬา
                    </button>
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg">
                        {ICON_MAP[selectedSportForView.icon] || <Users size={24} />}
                      </div>
                      <div>
                        <h3 className="text-3xl font-black text-slate-900 leading-tight">
                          รายชื่อนักกีฬา {selectedSportForView.name}
                        </h3>
                        <p className="text-slate-400 text-sm font-bold mt-1">รายการทั้งหมดที่บันทึกไว้ในระบบ</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {hasAnyAwards && (
                      <button 
                        onClick={handlePrintAllCertificates}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95 text-sm animate-bounce"
                      >
                        <PrinterCheck size={20} />
                        พิมพ์เกียรติบัตรทั้งหมด
                      </button>
                    )}
                    <div className="bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100 flex items-center gap-3 text-blue-600 h-fit">
                      <UserCheck size={20} />
                      <span className="font-black text-sm">รวม {athletesInSport.length} คน</span>
                    </div>
                  </div>
                </div>

                {isAthletesLoading ? (
                  <div className="py-32 flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                    <p className="text-slate-400 font-bold">กำลังดึงรายชื่อนักกีฬา...</p>
                  </div>
                ) : athletesInSport.length === 0 ? (
                  <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                    <Users className="mx-auto text-slate-200 mb-4" size={56} />
                    <p className="text-slate-500 font-bold">ไม่พบรายชื่อนักกีฬาที่บันทึกไว้ในประเภทนี้</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-inner">
                    <table className="w-full text-left">
                      <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                        <tr>
                          <th className="px-8 py-5">ลำดับ</th>
                          <th className="px-8 py-5">รูปภาพ</th>
                          <th className="px-8 py-5">ชื่อ-นามสกุล</th>
                          <th className="px-8 py-5">รุ่นอายุ / รายการ</th>
                          <th className="px-8 py-5 text-center">รางวัลที่ได้รับ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {athletesInSport.map((ath, idx) => {
                          const awardStyle = getAwardStatusFromCert(ath, selectedSportForView.name);
                          return (
                            <tr key={idx} className="hover:bg-blue-50/20 transition-all group">
                              <td className="px-8 py-6 font-black text-slate-300">{idx + 1}</td>
                              <td className="px-8 py-6">
                                <div className="w-16 h-20 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
                                  {ath.avatar ? (
                                    <img src={ath.avatar} className="w-full h-full object-cover" alt="avatar" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                      <Camera size={20} />
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="font-black text-slate-800 text-base">{ath.prefix}{ath.firstName} {ath.lastName}</div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="space-y-1">
                                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black">
                                    {ath.ageGroup}
                                  </span>
                                  {ath.athleticsEvent && (
                                    <div className="text-[10px] text-slate-400 font-bold mt-1 px-1 uppercase tracking-wider truncate max-w-[150px]">
                                      {ath.athleticsEvent}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-8 py-6 text-center">
                                {awardStyle ? (
                                  <button 
                                    onClick={() => handlePrintSingleCertificate(awardStyle.certData)}
                                    title="คลิกเพื่อพิมพ์เกียรติบัตร"
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-black text-xs shadow-sm animate-in fade-in zoom-in-95 transition-all active:scale-95 hover:shadow-md hover:brightness-105 ${awardStyle.color}`}
                                  >
                                    <Printer size={16} className={awardStyle.iconColor} />
                                    {awardStyle.text}
                                  </button>
                                ) : (
                                  <span className="text-slate-300 font-bold text-xs italic tracking-wide">รอสรุปผล</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-slate-100 animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-4 mb-10">
                  <div className="bg-indigo-100 p-4 rounded-3xl text-indigo-600">
                    <Users size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">ตรวจสอบรายชื่อนักกีฬา</h3>
                    <p className="text-slate-400 text-sm mt-1">เลือกชนิดกีฬาที่ลงทะเบียนแล้วเพื่อดูรายชื่อนักกีฬาและสถานะรางวัล</p>
                  </div>
                </div>

                {isCheckListLoading ? (
                  <div className="py-24 flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-indigo-600" size={48} />
                    <p className="text-slate-400 font-bold">กำลังดึงข้อมูลการลงทะเบียนของคุณ...</p>
                  </div>
                ) : registeredSportsDetails.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
                    <AlertCircle className="mx-auto text-slate-300 mb-4" size={56} />
                    <h4 className="text-lg font-black text-slate-800 mb-2">ยังไม่มีการลงทะเบียน</h4>
                    <p className="text-slate-400 max-w-xs mx-auto mb-8 font-bold">
                      คุณยังไม่ได้เลือกประเภทกีฬาเพื่อลงทะเบียนแข่งขันในขณะนี้
                    </p>
                    <button 
                      onClick={() => setActiveTab('register')}
                      className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 text-sm"
                    >
                      เริ่มลงทะเบียนตอนนี้
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {registeredSportsDetails.map(sport => (
                      <button
                        key={sport.id}
                        onClick={() => fetchAthletesBySport(sport)}
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group text-left relative overflow-hidden active:scale-95"
                      >
                        <div className="relative z-10">
                          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                            {ICON_MAP[sport.icon] || <Users size={28} />}
                          </div>
                          <h4 className="font-black text-slate-800 text-lg leading-tight mb-2">{sport.name}</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sport.category}</p>
                          <div className="mt-8 flex items-center gap-2 text-indigo-600 font-black text-xs">
                            คลิกเพื่อดูรายชื่อ <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                        <Users className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-slate-50/50 -rotate-12 transition-colors group-hover:text-indigo-50/50" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'rules':
        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between bg-white/40 p-8 rounded-[3rem] border border-white backdrop-blur-md">
              <div>
                <h2 className="text-3xl font-black text-slate-900 leading-tight">ระเบียบการแข่งขัน</h2>
                <p className="text-slate-500 font-bold text-sm mt-1">ดาวน์โหลดเอกสารระเบียบการแยกตามชนิดกีฬา</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-3xl text-blue-600">
                <FileSearch size={32} />
              </div>
            </div>

            {isSportsLoading ? (
              <div className="py-24 flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-blue-600" size={48} />
                <p className="text-slate-400 font-bold">กำลังโหลดรายการระเบียบการ...</p>
              </div>
            ) : sportsList.length === 0 ? (
              <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
                <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500 font-bold">ไม่พบข้อมูลชนิดกีฬาในขณะนี้</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sportsList.map(sport => (
                  <div key={sport.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                          <FileText size={28} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-lg leading-tight">{sport.name}</h4>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sport.category || 'กีฬากลุ่ม'}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed mb-8">{sport.description || 'ระเบียบและกติกาการแข่งขันสำหรับประเภทนี้'}</p>
                    </div>
                    
                    <button 
                      onClick={() => handleDownloadPdf(sport)}
                      className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                        sport.rulesPdf 
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      {sport.rulesPdf ? (
                        <><Download size={18} /> ดาวน์โหลด PDF</>
                      ) : (
                        <><AlertCircle size={18} /> ยังไม่มีเอกสาร</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'feedback':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-violet-100 p-4 rounded-3xl text-violet-600">
                  <MessageSquare size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">ส่งข้อเสนอแนะใหม่</h3>
                  <p className="text-slate-400 text-sm mt-1">ความคิดเห็นของคุณช่วยให้เราพัฒนาระบบได้ดียิ่งขึ้น</p>
                </div>
              </div>

              <form onSubmit={handleSubmitFeedback} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">ประเภทเรื่อง</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['ข้อเสนอแนะทั่วไป', 'แจ้งปัญหาการใช้งาน', 'แจ้งข้อมูลผิดพลาด', 'อื่นๆ'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFeedbackType(type)}
                        className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border-2 ${
                          feedbackType === type 
                            ? 'border-violet-600 bg-violet-50 text-violet-700 shadow-md' 
                            : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">หัวข้อ</label>
                  <input 
                    type="text" 
                    value={feedbackSubject}
                    onChange={(e) => setFeedbackSubject(e.target.value)}
                    placeholder="ระบุหัวข้อสั้นๆ"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-violet-500/10 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">รายละเอียดเพิ่มเติม</label>
                  <textarea 
                    value={feedbackDetails}
                    onChange={(e) => setFeedbackDetails(e.target.value)}
                    placeholder="อธิบายปัญหาหรือข้อเสนอแนะ..."
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-violet-500/10 transition-all h-32 resize-none"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="w-full bg-violet-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-violet-200 hover:bg-violet-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingFeedback ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  ส่งความคิดเห็น
                </button>
              </form>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-slate-100 flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-4 rounded-3xl text-slate-600">
                    <History size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">ประวัติการแจ้ง</h3>
                    <p className="text-slate-400 text-sm mt-1">ติดตามสถานะการตอบกลับจากผู้ดูแลระบบ</p>
                  </div>
                </div>
                <button 
                  onClick={fetchMyFeedbacks}
                  disabled={isFetchingFeedback}
                  className="p-3 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <RefreshCw size={20} className={isFetchingFeedback ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                {isFetchingFeedback ? (
                  <div className="py-20 flex flex-col items-center gap-4 text-slate-300">
                    <Loader2 size={40} className="animate-spin text-blue-600" />
                    <span className="font-bold">กำลังดึงข้อมูล...</span>
                  </div>
                ) : myFeedbacks.length === 0 ? (
                  <div className="py-20 text-center text-slate-300 flex flex-col items-center gap-4">
                    <MessageSquare size={64} strokeWidth={1} />
                    <p className="font-bold">ยังไม่มีประวัติการแจ้งข้อมูล</p>
                  </div>
                ) : (
                  myFeedbacks.map(fb => (
                    <div key={fb.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 hover:border-violet-200 transition-all group">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{fb.type}</span>
                            <span className="text-slate-200">•</span>
                            <span className="text-[10px] font-black text-slate-400">{new Date(fb.timestamp).toLocaleDateString('th-TH')}</span>
                          </div>
                          <h4 className="font-black text-slate-800 text-sm leading-tight">{fb.subject}</h4>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase whitespace-nowrap ${
                          fb.status === 'เสร็จสิ้น' || fb.status === 'แก้ไขแล้ว' ? 'bg-emerald-100 text-emerald-600' : 
                          fb.status === 'รอดำเนินการ' ? 'bg-amber-100 text-amber-600' : 
                          fb.status === 'ไม่สามารถดำเนินการได้' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {fb.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{fb.details}</p>
                      
                      {fb.reply && (
                        <div className="mt-4 p-4 bg-violet-600 rounded-2xl text-white relative animate-in slide-in-from-top-2">
                          <div className="flex items-center gap-2 mb-1 opacity-80">
                            <Reply size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">คำตอบจากแอดมิน</span>
                          </div>
                          <p className="text-xs font-bold leading-relaxed">{fb.reply}</p>
                          <div className="absolute -top-2 left-6 w-4 h-4 bg-violet-600 rotate-45" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-160px)]">
      <div className="lg:hidden flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm mb-4">
        <span className="font-black text-slate-800 text-sm uppercase tracking-wider">
          {menuItems.find(m => m.id === activeTab)?.label}
        </span>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-blue-600 text-white rounded-xl"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 w-72 bg-white lg:bg-transparent z-50 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full lg:h-auto bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden sticky top-24">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600 rounded-xl text-white">
                <SchoolIcon size={18} />
              </div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">School Management</span>
            </div>
            <h3 className="font-black text-slate-800 text-sm leading-tight truncate">
              {session.schoolName}
            </h3>
          </div>
          
          <nav className="p-4 space-y-1.5">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as TabType);
                  setIsSidebarOpen(false);
                  // Reset Checklist or Result filters when switching tabs
                  if (item.id === 'results-view') {
                    setSearchSport('');
                    setSearchAge('');
                  }
                  if (item.id !== 'check-list') {
                    setSelectedSportForView(null);
                    setAthletesInSport([]);
                  }
                }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-200 group ${
                  activeTab === item.id 
                    ? `bg-blue-600 text-white shadow-lg shadow-blue-200 scale-[1.02]` 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'} transition-colors`}>
                    {item.icon}
                  </span>
                  <span className="font-bold text-sm">{item.label}</span>
                </div>
                <ChevronRight size={14} className={`${activeTab === item.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'} transition-all`} />
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex-grow">
        {renderContent()}
      </div>
    </div>
  );
};

export default DashboardPage;