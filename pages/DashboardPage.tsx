
import React, { useState, useEffect, useRef } from 'react';
import { UserSession, SchoolProfile, Sport } from '../types';
import { SCRIPT_URL } from '../constants';
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
  FileSearch
} from 'lucide-react';

declare var Swal: any;

interface DashboardPageProps {
  session: UserSession;
  onNavigate: (path: string) => void;
}

type TabType = 'overview' | 'profile' | 'register' | 'check-list' | 'rules';

const DashboardPage: React.FC<DashboardPageProps> = ({ session, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [registeredCount, setRegisteredCount] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sportsList, setSportsList] = useState<Sport[]>([]);
  const [isSportsLoading, setIsSportsLoading] = useState(false);
  
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${SCRIPT_URL}?action=getRegistrations&schoolId=${session.schoolId}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setRegisteredCount(data.length);
        }
      } catch (error) {
        setRegisteredCount(0);
      }
    };
    fetchStats();
  }, [session.schoolId]);

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchProfile();
    }
    if (activeTab === 'rules') {
      fetchSports();
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

  const menuItems = [
    { id: 'overview', label: 'ภาพรวมระบบ', icon: <LayoutDashboard size={20} /> },
    { id: 'profile', label: 'ข้อมูลพื้นฐาน', icon: <Settings size={20} /> },
    { id: 'register', label: 'ลงทะเบียนแข่งขันกีฬา', icon: <ClipboardList size={20} /> },
    { id: 'check-list', label: 'ตรวจสอบรายชื่อ', icon: <Users size={20} /> },
    { id: 'rules', label: 'ระเบียบการแข่งขัน', icon: <FileText size={20} /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <section className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-black mb-4">สวัสดี, {session.schoolName}</h2>
                <p className="text-blue-100 font-medium mb-6 opacity-90">
                  ยินดีต้อนรับสู่ระบบจัดการการแข่งขันกีฬากลุ่มโรงเรียนตะเคียน-ลมศักดิ์
                </p>
                <button 
                  onClick={() => setActiveTab('register')}
                  className="bg-white text-blue-600 px-8 py-3.5 rounded-2xl font-black shadow-lg hover:bg-blue-50 transition-all active:scale-95 text-sm"
                >
                  เริ่มลงทะเบียนตอนนี้
                </button>
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
                  <p className="text-2xl font-black text-slate-800">รอสรุปผล</p>
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
        return (
          <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 animate-in slide-in-from-bottom-4">
            <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
              <Users className="text-indigo-600" /> ตรวจสอบรายชื่อนักกีฬา
            </h3>
            <div className="p-20 text-center space-y-4">
              <div className="bg-indigo-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-indigo-600">
                <Users size={40} />
              </div>
              <p className="text-slate-500 font-bold italic">ระบบกำลังดึงข้อมูลการลงทะเบียน...</p>
            </div>
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
