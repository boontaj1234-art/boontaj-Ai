import React, { useState, useEffect } from 'react';
import { SCRIPT_URL, SPORTS, ICON_MAP } from '../constants';
import { MedalStanding, School, Sport, CompetitionResult, SchoolProfile, parseResponsibleSports } from '../types';
import { 
  Trophy, 
  Medal, 
  Award, 
  FileDown, 
  Eye, 
  X, 
  Lock, 
  School as SchoolIcon, 
  ShieldCheck, 
  ChevronDown, 
  ArrowRight, 
  Loader2, 
  Search, 
  FileText, 
  Download, 
  BarChart3, 
  Sparkles, 
  Palette, 
  Quote, 
  UserCircle, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Layers,
  Info,
  Home,
  MapPin,
  ClipboardList
} from 'lucide-react';

declare const Swal: any;

interface LoginPageProps {
  onLogin: (schoolId: string, schoolName: string, isAdmin?: boolean) => void;
}

interface AccountData {
  id: string;
  name: string;
  username: string;
}

interface RegistrationItem {
  schoolId: string;
  schoolName: string;
  sportId: string;
  sportName: string;
}

type PublicTab = 'overview' | 'standings' | 'results' | 'schools' | 'rules' | 'login';

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  // Navigation & Tabs - Default to 'overview' so general visitors see system overview immediately
  const [activeTab, setActiveTab] = useState<PublicTab>('overview');

  // Public Data States
  const [schools, setSchools] = useState<School[]>([]);
  const [sportsList, setSportsList] = useState<Sport[]>([]);
  const [resultsList, setResultsList] = useState<CompetitionResult[]>([]);
  const [schoolProfiles, setSchoolProfiles] = useState<SchoolProfile[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<RegistrationItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Interactive filter & modal states
  const [selectedSchoolForMedals, setSelectedSchoolForMedals] = useState<MedalStanding | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>('all');

  // Login form states
  const [loginType, setLoginType] = useState<'school' | 'admin'>('school');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [availableSchools, setAvailableSchools] = useState<AccountData[]>([]);

  // Format Thai Date
  const getThaiDateString = () => {
    const d = new Date();
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear() + 543;
    return `${day}/${month}/${year}`;
  };

  const fetchAllPublicData = async () => {
    setIsLoadingData(true);
    try {
      const [accRes, sportsRes, resultsRes, profilesRes, regRes] = await Promise.all([
        fetch(`${SCRIPT_URL}?action=getAccounts`).catch(() => null),
        fetch(`${SCRIPT_URL}?action=getSports`).catch(() => null),
        fetch(`${SCRIPT_URL}?action=getResults`).catch(() => null),
        fetch(`${SCRIPT_URL}?action=getAllSchoolProfiles`).catch(() => null),
        fetch(`${SCRIPT_URL}?action=getAllRegistrations`).catch(() => null),
      ]);

      if (accRes && accRes.ok) {
        const accData = await accRes.json();
        const mappedSchools: School[] = Object.keys(accData).map(id => ({
          id: String(id).trim(),
          name: accData[id].name || `โรงเรียน ID ${id}`,
          username: (accData[id].username || '').toString().trim(),
          responsibleSport: accData[id].responsibleSport || ''
        }));
        setSchools(mappedSchools);

        const list: AccountData[] = mappedSchools
          .filter(acc => acc.username && acc.username !== '')
          .map(acc => ({ id: acc.id, name: acc.name, username: acc.username! }));
        setAvailableSchools(list);
      }

      if (sportsRes && sportsRes.ok) {
        const sportsData = await sportsRes.json();
        if (Array.isArray(sportsData) && sportsData.length > 0) {
          setSportsList(sportsData);
        } else {
          setSportsList(SPORTS);
        }
      } else {
        setSportsList(SPORTS);
      }

      if (resultsRes && resultsRes.ok) {
        const resultsData = await resultsRes.json();
        if (Array.isArray(resultsData)) {
          setResultsList(resultsData);
        }
      }

      if (profilesRes && profilesRes.ok) {
        const pData = await profilesRes.json();
        if (Array.isArray(pData)) {
          setSchoolProfiles(pData);
        }
      }

      if (regRes && regRes.ok) {
        const regData = await regRes.json();
        if (Array.isArray(regData)) {
          setAllRegistrations(regData);
        }
      }

      setLastUpdated(getThaiDateString());
    } catch (err) {
      console.error('Fetch public data error:', err);
    } finally {
      setIsLoadingData(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllPublicData();

    // Listen for custom open-login-tab event from Layout header button
    const handleOpenLogin = () => {
      setActiveTab('login');
      const loginSection = document.getElementById('main-content-section');
      if (loginSection) {
        loginSection.scrollIntoView({ behavior: 'smooth' });
      }
    };

    // Listen for custom open-overview-tab event from Layout header logo/button
    const handleOpenOverview = () => {
      setActiveTab('overview');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('open-login-tab', handleOpenLogin);
    window.addEventListener('open-overview-tab', handleOpenOverview);
    return () => {
      window.removeEventListener('open-login-tab', handleOpenLogin);
      window.removeEventListener('open-overview-tab', handleOpenOverview);
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAllPublicData();
  };

  // Calculate medal standings
  const calculateMedalStandings = (): MedalStanding[] => {
    const standingsMap: Record<string, MedalStanding> = {};

    // Initialise with all registered schools so even 0-medal schools are shown
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
    if (standings.length === 0) {
      if (typeof Swal !== 'undefined') {
        Swal.fire('ไม่มีข้อมูล', 'ยังไม่มีข้อมูลเหรียญรางวัลในระบบ', 'info');
      }
      return;
    }

    let csvContent = "\uFEFF"; // UTF-8 BOM for Thai support
    csvContent += "ตารางสรุปเหรียญรางวัล,กลุ่มโรงเรียนตะเคียน-ลมศักดิ์\n";
    csvContent += `ข้อมูล ณ วันที่,${new Date().toLocaleDateString('th-TH')}\n\n`;
    csvContent += "อันดับ,โรงเรียน,เหรียญทอง,เหรียญเงิน,เหรียญทองแดง,เหรียญรวมทั้งหมด\n";

    standings.forEach((school, idx) => {
      csvContent += `${idx + 1},"${school.schoolName}",${school.gold},${school.silver},${school.bronze},${school.total}\n`;
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

  const handleExportSchoolMedalsToExcel = (schoolStanding: MedalStanding) => {
    const schoolMedals = resultsList.filter(r => r.isPublished && (
      r.rank1SchoolId === schoolStanding.schoolId || 
      r.rank2SchoolId === schoolStanding.schoolId || 
      r.rank3SchoolId === schoolStanding.schoolId ||
      r.rank3SchoolId2 === schoolStanding.schoolId
    )).map(r => ({
      sportName: r.sportName,
      ageGroup: r.ageGroup,
      athleticsEvent: r.athleticsEvent || '-',
      rank: r.rank1SchoolId === schoolStanding.schoolId ? 'ชนะเลิศ (เหรียญทอง)' : 
            r.rank2SchoolId === schoolStanding.schoolId ? 'รองชนะเลิศอันดับ 1 (เหรียญเงิน)' : 
            (r.rank3SchoolId2 === schoolStanding.schoolId ? 'รองชนะเลิศอันดับ 2 ร่วม (เหรียญทองแดง)' : 'รองชนะเลิศอันดับ 2 (เหรียญทองแดง)'),
      medalType: r.rank1SchoolId === schoolStanding.schoolId ? 'ทอง' : 
                r.rank2SchoolId === schoolStanding.schoolId ? 'เงิน' : 'ทองแดง'
    }));

    let csvContent = "\uFEFF";
    csvContent += "รายงานสรุปเหรียญรางวัลรายโรงเรียน\n";
    csvContent += `โรงเรียน,"${schoolStanding.schoolName}"\n`;
    csvContent += `เหรียญทอง,${schoolStanding.gold},เหรียญเงิน,${schoolStanding.silver},เหรียญทองแดง,${schoolStanding.bronze},รวมทั้งหมด,${schoolStanding.total}\n\n`;
    csvContent += "ลำดับ,ชนิดกีฬา,รุ่นอายุ,รายการแข่งขัน,รางวัล,เหรียญ\n";

    schoolMedals.forEach((m, idx) => {
      csvContent += `${idx + 1},"${m.sportName}","${m.ageGroup}","${m.athleticsEvent}","${m.rank}","${m.medalType}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `สรุปเหรียญ_${schoolStanding.schoolName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPdf = (sport: Sport) => {
    if (!sport.rulesPdf) {
      if (typeof Swal !== 'undefined') {
        Swal.fire('ไม่พบเอกสาร', 'ขออภัย ยังไม่มีการอัปโหลดเอกสารระเบียบการสำหรับกีฬานี้', 'info');
      }
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
      if (typeof Swal !== 'undefined') {
        Swal.fire('ดาวน์โหลดล้มเหลว', 'เกิดข้อผิดพลาดในการประมวลผลไฟล์ PDF', 'error');
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoadingLogin(true);

    const inputUser = username.trim();
    const inputPass = password.trim();

    try {
      if (loginType === 'admin') {
        if (inputUser === 'admin' && inputPass === 'admin') {
          onLogin('admin', 'ผู้ดูแลระบบกลาง', true);
        } else {
          setLoginError('Username หรือ Password แอดมินไม่ถูกต้อง');
        }
      } else {
        const response = await fetch(`${SCRIPT_URL}?action=getAccounts`);
        const credsMap = await response.json();
        
        let foundId: string | null = null;
        let foundSchoolName: string | null = null;

        for (const [id, creds] of Object.entries(credsMap as any)) {
          const c = creds as any;
          if (c.username.toString().trim() === inputUser && c.password.toString().trim() === inputPass) {
            foundId = id;
            foundSchoolName = c.name || inputUser;
            break;
          }
        }

        if (foundId) {
          onLogin(foundId, foundSchoolName!, false);
        } else {
          setLoginError('รหัสผ่านไม่ถูกต้อง');
        }
      }
    } catch (err) {
      setLoginError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoadingLogin(false);
    }
  };

  const publishedResults = resultsList.filter(r => r.isPublished);
  const standings = calculateMedalStandings();
  const filteredStandings = standings.filter(s => 
    s.schoolName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredResults = publishedResults.filter(r => {
    const matchSport = selectedSportFilter === 'all' || r.sportName === selectedSportFilter;
    const matchSearch = searchTerm === '' || 
      r.sportName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.rank1SchoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.rank2SchoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.rank3SchoolName && r.rank3SchoolName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.rank3SchoolName2 && r.rank3SchoolName2.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchSport && matchSearch;
  });

  // Extract unique sports from results for filtering
  const distinctResultSports = Array.from(new Set(publishedResults.map(r => r.sportName))).filter(Boolean);

  // Overall medal sums
  const totalGoldMedals = standings.reduce((sum, s) => sum + s.gold, 0);
  const totalSilverMedals = standings.reduce((sum, s) => sum + s.silver, 0);
  const totalBronzeMedals = standings.reduce((sum, s) => sum + s.bronze, 0);
  const totalMedalsAwarded = totalGoldMedals + totalSilverMedals + totalBronzeMedals;

  // Top 3 Podium
  const top1School = standings[0];
  const top2School = standings[1];
  const top3School = standings[2];

  // Recent 6 published results for overview feed
  const recentResults = [...publishedResults].reverse().slice(0, 6);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-16">
      {/* Hero Banner with Overview & Portal Summary */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 rounded-[2.5rem] p-6 sm:p-10 md:p-12 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden border border-white/10">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20 text-xs font-black uppercase tracking-wider">
            <Sparkles size={14} className="text-amber-300 animate-spin" />
            <span>ศูนย์ข้อมูลการแข่งขันกีฬาและรายงานผลสาธารณะ</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            มหกรรมการแข่งขันกีฬา<br className="hidden sm:inline" /> กลุ่มโรงเรียนตะเคียน–ลมศักดิ์
          </h1>

          <p className="text-white/80 text-xs sm:text-base leading-relaxed font-medium max-w-2xl">
            ยินดีต้อนรับสู่ระบบข้อมูลการแข่งขันกีฬา ตารางสรุปเหรียญรางวัล และระเบียบการแข่งขันกีฬา สำหรับนักเรียน ครู ผู้ปกครอง และประชาชนทั่วไป สามารถติดตามภาพรวมและผลการแข่งขันได้ทันทีโดยไม่ต้องเข้าสู่ระบบ
          </p>

          {/* Key Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div 
              onClick={() => setActiveTab('schools')}
              className="bg-white/10 hover:bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 text-white/70 text-[10px] sm:text-xs font-black uppercase tracking-wider">
                <SchoolIcon size={14} /> โรงเรียนในกลุ่ม
              </div>
              <p className="text-xl sm:text-3xl font-black mt-1 text-white">
                {schools.length > 0 ? schools.length : '12'} <span className="text-xs font-normal">แห่ง</span>
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('rules')}
              className="bg-white/10 hover:bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 text-white/70 text-[10px] sm:text-xs font-black uppercase tracking-wider">
                <Trophy size={14} /> ชนิดกีฬาแข่งขัน
              </div>
              <p className="text-xl sm:text-3xl font-black mt-1 text-white">
                {sportsList.length > 0 ? sportsList.length : '9'} <span className="text-xs font-normal">ชนิด</span>
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('results')}
              className="bg-white/10 hover:bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 text-white/70 text-[10px] sm:text-xs font-black uppercase tracking-wider">
                <Medal size={14} /> ผลที่ประกาศแล้ว
              </div>
              <p className="text-xl sm:text-3xl font-black mt-1 text-amber-300">
                {publishedResults.length} <span className="text-xs font-normal text-white">รายการ</span>
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('standings')}
              className="bg-white/10 hover:bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 text-white/70 text-[10px] sm:text-xs font-black uppercase tracking-wider">
                <Award size={14} /> เหรียญรางวัลรวม
              </div>
              <p className="text-xl sm:text-3xl font-black mt-1 text-emerald-300">
                {totalMedalsAwarded} <span className="text-xs font-normal text-white">เหรียญ</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'overview' 
                  ? 'bg-white text-blue-900 shadow-xl' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <Home size={16} /> ภาพรวมระบบ
            </button>

            <button
              onClick={() => setActiveTab('standings')}
              className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'standings' 
                  ? 'bg-amber-400 text-slate-900 shadow-xl shadow-amber-400/20' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <BarChart3 size={16} /> ตารางเหรียญรางวัล
            </button>

            <button
              onClick={() => setActiveTab('results')}
              className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'results' 
                  ? 'bg-amber-400 text-slate-900 shadow-xl shadow-amber-400/20' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <Award size={16} /> ผลการแข่งขันล่าสุด
            </button>

            <button
              onClick={() => setActiveTab('login')}
              className="ml-auto px-6 py-3 bg-amber-400 text-slate-950 hover:bg-amber-300 rounded-2xl text-xs sm:text-sm font-black shadow-xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Lock size={16} /> เข้าสู่ระบบโรงเรียน / แอดมิน
            </button>
          </div>
        </div>

        {/* Decorative background trophy */}
        <Trophy className="absolute right-[-40px] bottom-[-40px] w-80 h-80 text-white/5 rotate-12 pointer-events-none" />
      </div>

      {/* Main Public Navigation Bar */}
      <div id="main-content-section" className="bg-white p-2.5 sm:p-3 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-2 sticky top-20 z-40 backdrop-blur-md bg-white/95">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Home size={16} />
            <span>ภาพรวมระบบ</span>
          </button>

          <button
            onClick={() => setActiveTab('standings')}
            className={`px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'standings'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 size={16} />
            <span>ตารางสรุปเหรียญ</span>
          </button>

          <button
            onClick={() => setActiveTab('results')}
            className={`px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'results'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award size={16} />
            <span>ผลการแข่งขัน</span>
          </button>

          <button
            onClick={() => setActiveTab('schools')}
            className={`px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'schools'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <SchoolIcon size={16} />
            <span>สนามแข่งขันและโรงเรียน</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText size={16} />
            <span>ระเบียบการ</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={18} />
          </button>

          <button
            onClick={() => setActiveTab('login')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Lock size={16} />
            <span>เข้าสู่ระบบ</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 0: ภาพรวมระบบ (SYSTEM OVERVIEW & PUBLIC PORTAL) ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
          
          {/* Top 3 Podium (3 อันดับผู้นำตารางเหรียญทอง) */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-xl border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-black uppercase tracking-wider mb-2 border border-amber-200">
                  <Trophy size={14} className="text-amber-500" />
                  <span>3 อันดับผู้นำตารางเหรียญรางวัล</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                  ทำเนียบผู้นำเหรียญทอง
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
                  โรงเรียนที่มีคะแนนเหรียญรางวัลสูงสุดในการแข่งขันกลุ่มโรงเรียนตะเคียน–ลมศักดิ์
                </p>
              </div>

              <button
                onClick={() => setActiveTab('standings')}
                className="self-start sm:self-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
              >
                <BarChart3 size={16} />
                <span>ดูตารางสรุปเหรียญทั้งหมด ({standings.length} โรงเรียน)</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Podium Display */}
            {isLoadingData ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
                <Loader2 size={36} className="animate-spin text-blue-600" />
                <p className="text-xs font-black uppercase tracking-wider">กำลังประมวลผลข้อมูลเหรียญรางวัล...</p>
              </div>
            ) : standings.length === 0 ? (
              <div className="py-12 text-center text-slate-400">ยังไม่มีข้อมูลเหรียญรางวัล</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
                
                {/* 2nd Place (Silver) */}
                {top2School && (
                  <div 
                    onClick={() => setSelectedSchoolForMedals(top2School)}
                    className="order-2 md:order-1 bg-gradient-to-b from-slate-50 to-slate-100/80 rounded-3xl p-6 border border-slate-200 text-center hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute top-4 right-4 bg-slate-200 text-slate-700 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">
                      2
                    </div>
                    <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-2xl shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Medal size={36} className="text-slate-400" />
                    </div>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                      รองชนะเลิศอันดับ 1
                    </span>
                    <h3 className="font-black text-slate-800 text-base sm:text-lg mb-3 truncate group-hover:text-blue-600 transition-colors">
                      {top2School.schoolName}
                    </h3>
                    <div className="flex items-center justify-center gap-2">
                      <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-black">
                        🥇 {top2School.gold}
                      </span>
                      <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded-lg text-xs font-black">
                        🥈 {top2School.silver}
                      </span>
                      <span className="px-2.5 py-1 bg-orange-100 text-orange-800 rounded-lg text-xs font-black">
                        🥉 {top2School.bronze}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold mt-3">รวม {top2School.total} เหรียญ</p>
                  </div>
                )}

                {/* 1st Place (Gold - Elevated) */}
                {top1School && (
                  <div 
                    onClick={() => setSelectedSchoolForMedals(top1School)}
                    className="order-1 md:order-2 bg-gradient-to-b from-amber-50 via-yellow-50 to-amber-100/60 rounded-3xl p-8 border-2 border-amber-300 text-center shadow-xl shadow-amber-500/10 hover:shadow-2xl transition-all cursor-pointer group relative -translate-y-2"
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                      <Sparkles size={12} /> ผู้นำอันดับ 1
                    </div>
                    <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-3xl shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform border border-amber-200">
                      <Trophy size={44} className="text-amber-500" />
                    </div>
                    <span className="text-xs font-black text-amber-700 uppercase tracking-widest block mb-1">
                      ชนะเลิศยอดเยี่ยม
                    </span>
                    <h3 className="font-black text-slate-900 text-lg sm:text-xl mb-3 truncate group-hover:text-amber-600 transition-colors">
                      {top1School.schoolName}
                    </h3>
                    <div className="flex items-center justify-center gap-2">
                      <span className="px-3 py-1.5 bg-yellow-200 text-yellow-900 rounded-xl text-sm font-black shadow-xs">
                        🥇 {top1School.gold} ทอง
                      </span>
                      <span className="px-2.5 py-1 bg-white/80 text-slate-700 rounded-lg text-xs font-black">
                        🥈 {top1School.silver}
                      </span>
                      <span className="px-2.5 py-1 bg-white/80 text-orange-800 rounded-lg text-xs font-black">
                        🥉 {top1School.bronze}
                      </span>
                    </div>
                    <p className="text-sm font-black text-amber-800 mt-4">เหรียญรวมทั้งหมด {top1School.total} เหรียญ</p>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {top3School && (
                  <div 
                    onClick={() => setSelectedSchoolForMedals(top3School)}
                    className="order-3 md:order-3 bg-gradient-to-b from-orange-50/50 to-orange-100/60 rounded-3xl p-6 border border-orange-200 text-center hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute top-4 right-4 bg-orange-200 text-orange-800 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">
                      3
                    </div>
                    <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-2xl shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Medal size={36} className="text-orange-500" />
                    </div>
                    <span className="text-[11px] font-black text-orange-600 uppercase tracking-wider block mb-1">
                      รองชนะเลิศอันดับ 2
                    </span>
                    <h3 className="font-black text-slate-800 text-base sm:text-lg mb-3 truncate group-hover:text-blue-600 transition-colors">
                      {top3School.schoolName}
                    </h3>
                    <div className="flex items-center justify-center gap-2">
                      <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-black">
                        🥇 {top3School.gold}
                      </span>
                      <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded-lg text-xs font-black">
                        🥈 {top3School.silver}
                      </span>
                      <span className="px-2.5 py-1 bg-orange-100 text-orange-800 rounded-lg text-xs font-black">
                        🥉 {top3School.bronze}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold mt-3">รวม {top3School.total} เหรียญ</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Overview Metrics & System Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <SchoolIcon size={28} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">โรงเรียนสมาชิก</p>
                <h4 className="text-2xl font-black text-slate-800 mt-0.5">{schools.length || 12} แห่ง</h4>
                <span className="text-[10px] text-emerald-600 font-bold">เข้าร่วมครบทุกโรงเรียน</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Trophy size={28} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">ชนิดกีฬาแข่งขัน</p>
                <h4 className="text-2xl font-black text-slate-800 mt-0.5">{sportsList.length || 9} ชนิด</h4>
                <span className="text-[10px] text-purple-600 font-bold">พร้อมระเบียบการแข่งขัน</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <ClipboardList size={28} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">การส่งทีมแข่งขัน</p>
                <h4 className="text-2xl font-black text-slate-800 mt-0.5">{allRegistrations.length || '50+'} รายการ</h4>
                <span className="text-[10px] text-amber-600 font-bold">จากทุกโรงเรียนในกลุ่ม</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Award size={28} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">ประกาศผลทางการ</p>
                <h4 className="text-2xl font-black text-slate-800 mt-0.5">{publishedResults.length} รายการ</h4>
                <span className="text-[10px] text-emerald-600 font-bold">มอบเหรียญแล้ว {totalMedalsAwarded} เหรียญ</span>
              </div>
            </div>
          </div>

          {/* Recent Results Feed & Host Schools Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left 2 Cols: Recent Published Results Feed */}
            <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
                      <Award className="text-blue-600" /> ผลการแข่งขันล่าสุด
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      รายการแข่งขันที่คณะกรรมการประกาศผลเรียบร้อยแล้ว
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setActiveTab('results')}
                    className="text-xs font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>ดูทั้งหมด</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {recentResults.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                    <Award size={40} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500">อยู่ระหว่างการแข่งขัน ยังไม่มีผลที่ประกาศ</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recentResults.map(res => (
                      <div 
                        key={res.id}
                        className="p-4 sm:p-5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              {res.sportName}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              รุ่น {res.ageGroup}
                            </span>
                          </div>

                          {res.athleticsEvent && (
                            <p className="text-xs font-bold text-slate-700 truncate mb-3">
                              {res.athleticsEvent}
                            </p>
                          )}

                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-yellow-500 font-black text-xs">🥇</span>
                              <span className="font-black text-slate-800 truncate">{res.rank1SchoolName || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-400 font-black text-xs">🥈</span>
                              <span className="font-bold text-slate-600 truncate">{res.rank2SchoolName || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-orange-500 font-black text-xs">🥉</span>
                              <span className="font-bold text-slate-600 truncate">
                                {res.rank3SchoolName || '-'}
                                {res.rank3SchoolName2 ? ` และ ${res.rank3SchoolName2}` : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>อัปเดตแบบเรียลไทม์จากระบบบันทึกผลกลาง</span>
                <button
                  onClick={() => setActiveTab('results')}
                  className="font-black text-blue-600 hover:underline cursor-pointer"
                >
                  ค้นหาผลการแข่งขันตามชนิดกีฬา →
                </button>
              </div>
            </div>

            {/* Right 1 Col: Host Venues & Schools Highlights */}
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <MapPin className="text-emerald-600" /> สนามแข่งขัน
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      โรงเรียนที่รับผิดชอบจัดการแข่งขันกีฬา
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setActiveTab('schools')}
                    className="text-xs font-black text-emerald-600 hover:text-emerald-800 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>ทั้งหมด</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                <div className="space-y-3">
                  {schools.slice(0, 5).map((sc, idx) => {
                    const prof = schoolProfiles.find(p => p.schoolId === sc.id);
                    const respSports = parseResponsibleSports(sc.responsibleSport || prof?.responsibleSport);

                    return (
                      <div 
                        key={sc.id} 
                        onClick={() => setActiveTab('schools')}
                        className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-emerald-50/40 hover:border-emerald-200 transition-all cursor-pointer flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 overflow-hidden">
                          {prof?.logo ? (
                            <img src={prof.logo} alt={sc.name} className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <SchoolIcon size={20} className="text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-800 truncate">{sc.name}</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {respSports.length > 0 ? (
                              respSports.slice(0, 2).map(sp => (
                                <span key={sp} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                                  🏟️ {sp}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">สมาชิกกลุ่มโรงเรียน</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 text-center">
                <button
                  onClick={() => setActiveTab('schools')}
                  className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <SchoolIcon size={14} />
                  <span>ดูทำเนียบ 12 โรงเรียนและสนามแข่งขัน</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick PDF Rules & Public Notice Footer */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-[2.5rem] p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left max-w-2xl">
              <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-300">
                เอกสารและข้อปฏิบัติ
              </span>
              <h3 className="text-xl sm:text-2xl font-black">
                ดาวน์โหลดระเบียบและกติกาการแข่งขันกีฬา
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
                เข้าถึงระเบียบการแข่งขันกีฬาฉบับสมบูรณ์ แยกตามชนิดกีฬาในรูปแบบไฟล์ PDF พร้อมให้ครูผู้ฝึกสอนและนักกีฬาตรวจสอบกติกาได้ทันที
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => setActiveTab('rules')}
                className="px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-purple-600/30 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <FileText size={16} />
                <span>ดูระเบียบการแข่งขัน ({sportsList.length} ชนิดกีฬา)</span>
              </button>

              <button
                onClick={() => setActiveTab('login')}
                className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs sm:text-sm font-black border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Lock size={16} />
                <span>สำหรับเจ้าหน้าที่/โรงเรียน</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ================= TAB 1: ตารางสรุปเหรียญรางวัล (MEDAL STANDINGS) ================= */}
      {activeTab === 'standings' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-xl border border-slate-100">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                  <BarChart3 size={32} />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">
                    ตารางสรุปเหรียญรางวัล
                  </h2>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    MEDAL STANDINGS (สรุปเหรียญรางวัลครบทุกโรงเรียน)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">อัปเดตล่าสุด</span>
                  <span className="text-xs font-black text-slate-600">{lastUpdated || getThaiDateString()}</span>
                </div>

                <button
                  onClick={handleExportAllStandingsToExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 active:scale-95 transition-all cursor-pointer"
                >
                  <FileDown size={18} />
                  <span>ส่งออกตารางสรุป</span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="mb-6 relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อโรงเรียน..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 transition-all"
              />
            </div>

            {/* Table */}
            {isLoadingData ? (
              <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
                <Loader2 size={36} className="animate-spin text-amber-500" />
                <p className="text-xs font-black uppercase tracking-wider">กำลังโหลดตารางสรุปเหรียญรางวัล...</p>
              </div>
            ) : filteredStandings.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                <Trophy size={48} className="mx-auto text-slate-200 mb-2" />
                <p className="text-slate-400 font-bold">ไม่พบข้อมูลโรงเรียนที่ค้นหา</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-inner">
                <table className="w-full text-left">
                  <thead className="bg-[#1e293b] text-white text-[11px] sm:text-xs font-black uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-5 w-20 text-center">อันดับ</th>
                      <th className="px-6 py-5">โรงเรียน</th>
                      <th className="px-6 py-5 text-center bg-black/10">
                        <div className="flex flex-col items-center gap-1">
                          <Medal size={16} className="text-yellow-400" />
                          <span>ทอง</span>
                        </div>
                      </th>
                      <th className="px-6 py-5 text-center bg-black/10">
                        <div className="flex flex-col items-center gap-1">
                          <Medal size={16} className="text-slate-300" />
                          <span>เงิน</span>
                        </div>
                      </th>
                      <th className="px-6 py-5 text-center bg-black/10">
                        <div className="flex flex-col items-center gap-1">
                          <Medal size={16} className="text-orange-400" />
                          <span>ทองแดง</span>
                        </div>
                      </th>
                      <th className="px-6 py-5 text-center bg-black/15">
                        <div className="flex flex-col items-center gap-1">
                          <CheckCircle2 size={16} className="text-blue-400" />
                          <span>รวม</span>
                        </div>
                      </th>
                      <th className="px-6 py-5 text-center">ดูข้อมูล</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredStandings.map((school, idx) => (
                      <tr
                        key={school.schoolId}
                        onClick={() => setSelectedSchoolForMedals(school)}
                        className="hover:bg-amber-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-5 text-center font-black text-slate-400 text-base">
                          {idx === 0 && school.gold > 0 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-black">
                              1
                            </span>
                          ) : idx === 1 && school.silver > 0 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-black">
                              2
                            </span>
                          ) : idx === 2 && school.bronze > 0 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-black">
                              3
                            </span>
                          ) : (
                            idx + 1
                          )}
                        </td>
                        <td className="px-6 py-5 font-black text-slate-800 text-sm sm:text-base group-hover:text-blue-600 transition-colors">
                          {school.schoolName}
                        </td>
                        <td className="px-6 py-5 text-center font-black text-slate-800 text-lg">
                          {school.gold}
                        </td>
                        <td className="px-6 py-5 text-center font-black text-slate-800 text-lg">
                          {school.silver}
                        </td>
                        <td className="px-6 py-5 text-center font-black text-slate-800 text-lg">
                          {school.bronze}
                        </td>
                        <td className="px-6 py-5 text-center font-black text-blue-600 text-xl">
                          {school.total}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSchoolForMedals(school);
                            }}
                            className="p-2.5 bg-amber-50 group-hover:bg-amber-500 text-amber-700 group-hover:text-white rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center justify-center"
                            title="ดูรายละเอียดความสำเร็จ"
                          >
                            <Eye size={18} />
                          </button>
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

      {/* ================= TAB 2: ผลการแข่งขันทั้งหมด (OFFICIAL RESULTS) ================= */}
      {activeTab === 'results' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-xl border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-3">
                  <Award className="text-blue-600" /> ผลการแข่งขันอย่างเป็นทางการ
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm font-bold mt-1">
                  ประกาศผลการแข่งขันกีฬาและผู้ชนะรางวัลชนะเลิศในแต่ละรุ่นอายุ
                </p>
              </div>

              <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 flex items-center gap-2">
                <Medal size={16} className="text-blue-600" />
                <span className="text-xs font-black text-blue-800">
                  ประกาศแล้ว {publishedResults.length} รายการ
                </span>
              </div>
            </div>

            {/* Sport Filter Badges & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อกีฬา โรงเรียน หรือรายการแข่งขัน..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all"
                />
              </div>

              {distinctResultSports.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar">
                  <button
                    onClick={() => setSelectedSportFilter('all')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                      selectedSportFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ทั้งหมด ({publishedResults.length})
                  </button>
                  {distinctResultSports.map(sp => (
                    <button
                      key={sp}
                      onClick={() => setSelectedSportFilter(sp)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                        selectedSportFilter === sp
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {sp} ({publishedResults.filter(r => r.sportName === sp).length})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Results Grid */}
            {filteredResults.length === 0 ? (
              <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                <Award size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-600">ยังไม่มีการประกาศผลการแข่งขันในหมวดหมู่นี้</p>
                <p className="text-xs text-slate-400 mt-1">คณะกรรมการจะประกาศผลการแข่งขันอย่างเป็นทางการทันทีหลังการแข่งขันสิ้นสุด</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredResults.map((res) => (
                  <div
                    key={res.id}
                    className="bg-white rounded-[2rem] border border-slate-200/80 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:border-blue-300"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                            {ICON_MAP[res.sportName.includes('กรีฑา') ? 'PersonStanding' : 'Trophy'] || <Trophy size={24} />}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 text-lg leading-tight">{res.sportName}</h3>
                            <span className="text-[11px] font-black text-blue-600 uppercase tracking-wider block mt-0.5">
                              รุ่น {res.ageGroup}
                            </span>
                          </div>
                        </div>

                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black rounded-full uppercase">
                          Official
                        </span>
                      </div>

                      {/* Athletics Event Subtitle */}
                      {res.athleticsEvent && (
                        <div className="mb-4 px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                          <Info size={14} className="text-slate-400 shrink-0" />
                          <span className="text-xs font-bold text-slate-700 truncate">{res.athleticsEvent}</span>
                        </div>
                      )}

                      {/* Awards list */}
                      <div className="space-y-2.5">
                        {/* Gold */}
                        <div className="p-3.5 bg-yellow-50/70 border border-yellow-200/80 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0">
                              <Medal size={20} className="text-yellow-500" />
                            </div>
                            <div className="truncate">
                              <span className="text-[10px] font-black text-yellow-700 uppercase tracking-wider block">ชนะเลิศ (เหรียญทอง)</span>
                              <span className="text-sm font-black text-slate-800 truncate block">{res.rank1SchoolName || '-'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Silver */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0">
                              <Medal size={20} className="text-slate-400" />
                            </div>
                            <div className="truncate">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">รองชนะเลิศอันดับ 1 (เหรียญเงิน)</span>
                              <span className="text-sm font-bold text-slate-700 truncate block">{res.rank2SchoolName || '-'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bronze */}
                        <div className="p-3.5 bg-orange-50/70 border border-orange-200/80 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0">
                              <Medal size={20} className="text-orange-500" />
                            </div>
                            <div className="truncate">
                              <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider block">
                                {res.rank3SchoolName2 ? 'รองชนะเลิศอันดับ 2 (เหรียญทองแดง)' : 'รองชนะเลิศอันดับ 2 (เหรียญทองแดง)'}
                              </span>
                              <span className="text-sm font-bold text-slate-700 truncate block">{res.rank3SchoolName || '-'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Joint Bronze (อันดับ 3 ร่วม) */}
                        {res.rank3SchoolId2 && res.rank3SchoolName2 && (
                          <div className="p-3.5 bg-orange-50/70 border border-orange-300 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0">
                                <Medal size={20} className="text-orange-600" />
                              </div>
                              <div className="truncate">
                                <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider block">
                                  รองชนะเลิศอันดับ 2 ร่วม (อันดับ 3 ร่วม - เหรียญทองแดง)
                                </span>
                                <span className="text-sm font-bold text-slate-800 truncate block">{res.rank3SchoolName2}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: ข้อมูลโรงเรียนและสนามกีฬา (SCHOOL DIRECTORY & VENUES) ================= */}
      {activeTab === 'schools' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-xl border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-3">
                  <SchoolIcon className="text-emerald-600" /> ทำเนียบโรงเรียนและสนามกีฬาที่รับผิดชอบ
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm font-bold mt-1">
                  รายชื่อโรงเรียนสมาชิก ผู้บริหาร สีประจำโรงเรียน และสนามกีฬาจัดการแข่งขัน
                </p>
              </div>

              <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 text-emerald-700 text-xs font-black">
                {schools.length} โรงเรียนสมาชิก
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {schools.map((school, index) => {
                const profile = schoolProfiles.find(p => p.schoolId === school.id);
                const respSports = parseResponsibleSports(school.responsibleSport || profile?.responsibleSport);

                return (
                  <div
                    key={school.id}
                    className="bg-white rounded-[2rem] border border-slate-200/80 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:border-emerald-300 relative overflow-hidden"
                  >
                    <div>
                      {/* Top bar with logo/badge */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          {profile?.logo ? (
                            <img src={profile.logo} alt={school.name} className="w-full h-full object-contain p-1" />
                          ) : (
                            <SchoolIcon size={28} className="text-emerald-600" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">
                            ลำดับที่ {index + 1}
                          </span>
                          <h4 className="font-black text-slate-800 text-base leading-tight truncate">
                            {school.name}
                          </h4>
                        </div>
                      </div>

                      {/* Details list */}
                      <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        {profile?.directorName && (
                          <div className="flex items-center gap-2">
                            <UserCircle size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate">ผู้อำนวยการ: <strong>{profile.directorName}</strong></span>
                          </div>
                        )}

                        {profile?.schoolColors && (
                          <div className="flex items-center gap-2">
                            <Palette size={14} className="text-slate-400 shrink-0" />
                            <span>สีประจำโรงเรียน: <strong>{profile.schoolColors}</strong></span>
                          </div>
                        )}

                        {profile?.motto && (
                          <div className="flex items-start gap-2 italic text-slate-500 text-[11px] pt-1">
                            <Quote size={12} className="text-slate-300 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">"{profile.motto}"</span>
                          </div>
                        )}

                        {/* Responsible Sports / Stadiums */}
                        {respSports.length > 0 && (
                          <div className="pt-2">
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                              <Trophy size={12} /> สนามกีฬาที่รับผิดชอบจัดการแข่งขัน:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {respSports.map(sp => (
                                <span
                                  key={sp}
                                  className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[10px] font-bold"
                                >
                                  🏟️ {sp}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: ระเบียบการแข่งขัน (RULES & REGULATIONS) ================= */}
      {activeTab === 'rules' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-xl border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-3">
                  <FileText className="text-purple-600" /> ระเบียบและกติกาการแข่งขัน
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm font-bold mt-1">
                  ดาวน์โหลดเอกสารระเบียบการแข่งขันอย่างเป็นทางการในรูปแบบไฟล์ PDF แยกตามชนิดกีฬา
                </p>
              </div>

              <div className="bg-purple-50 px-4 py-2 rounded-2xl border border-purple-100 text-purple-700 text-xs font-black">
                {sportsList.length} ชนิดกีฬา
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sportsList.map((sport) => (
                <div
                  key={sport.id}
                  className="bg-white p-7 rounded-[2rem] border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:border-purple-300"
                >
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center font-black group-hover:scale-110 transition-transform shadow-xs">
                        <FileText size={28} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-lg leading-tight">{sport.name}</h4>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {sport.category || 'หมวดหมู่กีฬา'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed mb-6">
                      {sport.description || 'ระเบียบ กติกา และเงื่อนไขการส่งนักกีฬาเข้าร่วมการแข่งขันกีฬาประเภทนี้'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDownloadPdf(sport)}
                    className={`w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      sport.rulesPdf
                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 active:scale-95'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {sport.rulesPdf ? (
                      <>
                        <Download size={16} /> ดาวน์โหลดเอกสารระเบียบการ (PDF)
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} /> ยังไม่มีเอกสาร PDF
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: เข้าสู่ระบบ (LOGIN FORM) ================= */}
      {activeTab === 'login' && (
        <div className="max-w-md mx-auto animate-in zoom-in-95 duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
            {/* Header */}
            <div className={`p-8 sm:p-10 text-center text-white transition-colors duration-500 ${loginType === 'admin' ? 'bg-slate-800' : 'bg-blue-600'}`}>
              <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                {loginType === 'admin' ? <ShieldCheck size={40} /> : <SchoolIcon size={40} />}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mb-1">
                {loginType === 'admin' ? 'Admin Login' : 'ระบบลงทะเบียนการแข่งขันกีฬา'}
              </h2>
              <p className="text-white/70 text-xs sm:text-sm font-medium">กลุ่มโรงเรียนตะเคียน-ลมศักดิ์</p>
            </div>

            {/* Switch Tabs */}
            <div className="flex bg-slate-50 border-b border-slate-200">
              <button 
                type="button"
                onClick={() => setLoginType('school')} 
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer ${
                  loginType === 'school' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                โรงเรียน
              </button>
              <button 
                type="button"
                onClick={() => setLoginType('admin')} 
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer ${
                  loginType === 'admin' ? 'bg-white text-slate-800 border-b-2 border-slate-800' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                แอดมิน
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="p-8 sm:p-10 space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1 tracking-widest">
                  USERNAME
                </label>
                {loginType === 'school' ? (
                  <div className="relative">
                    <select
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer font-bold text-slate-700 text-sm sm:text-base"
                      required
                    >
                      <option value="" disabled>--- เลือกชื่อผู้ใช้งานโรงเรียน ---</option>
                      {availableSchools.map(s => <option key={s.id} value={s.username}>{s.username}</option>)}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                  </div>
                ) : (
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    placeholder="Username" 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-800/10 font-bold text-sm sm:text-base" 
                    required 
                  />
                )}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1 tracking-widest">
                  PASSWORD
                </label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-mono text-sm sm:text-base" 
                  required 
                />
              </div>

              {loginError && (
                <div className="p-4 bg-red-50 text-red-600 text-xs rounded-2xl border border-red-100 text-center font-black">
                  {loginError}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoadingLogin} 
                className={`w-full py-5 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 cursor-pointer ${
                  loginType === 'admin' ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                } disabled:opacity-50`}
              >
                {isLoadingLogin ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>เข้าสู่ระบบ <ArrowRight size={22} /></>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  ← กลับไปดูภาพรวมและผลการแข่งขันสาธารณะ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: รายละเอียดความสำเร็จรายโรงเรียน ================= */}
      {selectedSchoolForMedals && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl sm:text-2xl font-black">{selectedSchoolForMedals.schoolName}</h3>
                <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-1">
                  รายละเอียดความสำเร็จรายโรงเรียน
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleExportSchoolMedalsToExcel(selectedSchoolForMedals)}
                  className="relative z-20 p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all active:scale-95 cursor-pointer"
                  title="ส่งออกเป็นไฟล์ Excel"
                >
                  <FileDown size={20} />
                </button>
                <button 
                  onClick={() => setSelectedSchoolForMedals(null)} 
                  className="relative z-20 p-2 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>
              <Medal className="absolute right-[-20px] bottom-[-20px] w-48 h-48 text-white/5 rotate-12 pointer-events-none" />
            </div>
            
            <div className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                <div className="bg-yellow-50 p-4 rounded-3xl border border-yellow-100 text-center">
                  <Medal size={24} className="text-yellow-500 mx-auto mb-1.5" />
                  <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">เหรียญทอง</p>
                  <p className="text-2xl font-black text-yellow-700">{selectedSchoolForMedals.gold}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center">
                  <Medal size={24} className="text-slate-400 mx-auto mb-1.5" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">เหรียญเงิน</p>
                  <p className="text-2xl font-black text-slate-700">{selectedSchoolForMedals.silver}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100 text-center">
                  <Medal size={24} className="text-orange-600 mx-auto mb-1.5" />
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">เหรียญทองแดง</p>
                  <p className="text-2xl font-black text-orange-700">{selectedSchoolForMedals.bronze}</p>
                </div>
              </div>

              {/* Award List */}
              <div className="space-y-3">
                {(() => {
                  const schoolAwards = resultsList.filter(r => r.isPublished && (
                    r.rank1SchoolId === selectedSchoolForMedals.schoolId || 
                    r.rank2SchoolId === selectedSchoolForMedals.schoolId || 
                    r.rank3SchoolId === selectedSchoolForMedals.schoolId ||
                    r.rank3SchoolId2 === selectedSchoolForMedals.schoolId
                  )).map(r => ({
                    ...r,
                    type: r.rank1SchoolId === selectedSchoolForMedals.schoolId ? 'gold' : 
                          r.rank2SchoolId === selectedSchoolForMedals.schoolId ? 'silver' : 'bronze'
                  }));

                  if (schoolAwards.length === 0) {
                    return (
                      <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold">ยังไม่มีข้อมูลเหรียญรางวัลที่ประกาศผล</p>
                      </div>
                    );
                  }

                  return schoolAwards.map((medal, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 sm:p-5 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 transition-all shadow-xs">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          medal.type === 'gold' ? 'bg-yellow-100 text-yellow-600' : 
                          medal.type === 'silver' ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-orange-600'
                        }`}>
                          <Medal size={22} />
                        </div>
                        <div className="truncate">
                          <p className="font-black text-slate-800 text-sm truncate">{medal.sportName}</p>
                          <p className="text-[10px] font-bold text-slate-400 truncate">
                            รุ่น {medal.ageGroup} {medal.athleticsEvent ? `• ${medal.athleticsEvent}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shrink-0 ${
                        medal.type === 'gold' ? 'bg-yellow-500 text-white' : 
                        medal.type === 'silver' ? 'bg-slate-400 text-white' : 'bg-orange-600 text-white'
                      }`}>
                        {medal.type === 'gold' ? 'ทอง' : medal.type === 'silver' ? 'เงิน' : 'ทองแดง'}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="p-5 bg-slate-50 text-center flex items-center justify-between border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500">
                รวมทั้งหมด {selectedSchoolForMedals.total} เหรียญ
              </span>
              <button 
                onClick={() => handleExportSchoolMedalsToExcel(selectedSchoolForMedals)} 
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <FileDown size={16} /> ส่งออก Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
