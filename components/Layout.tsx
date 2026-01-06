
import React from 'react';
import { LogOut, LayoutDashboard, ClipboardList, School as SchoolIcon } from 'lucide-react';
import { UserSession } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  session: UserSession | null;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, session, onLogout, onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-700 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onNavigate('dashboard')}
          >
            <div className="bg-white p-1.5 rounded-lg text-blue-700 group-hover:scale-110 transition-transform">
              <TrophyIcon size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight hidden sm:block">กลุ่มโรงเรียนตะเคียน–ลมศักดิ์</h1>
              <p className="text-xs text-blue-100 hidden sm:block">ระบบลงทะเบียนการแข่งขันกีฬา</p>
              <h1 className="font-bold text-lg leading-tight sm:hidden">ตะเคียน–ลมศักดิ์</h1>
            </div>
          </div>

          {session && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-blue-800 px-3 py-1.5 rounded-full text-sm">
                <SchoolIcon size={16} />
                <span>{session.schoolName}</span>
              </div>
              <button 
                onClick={onLogout}
                className="flex items-center gap-2 hover:bg-blue-800 p-2 rounded-lg transition-colors"
                title="ออกจากระบบ"
              >
                <LogOut size={20} />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Mobile Nav Bar - only if logged in */}
      {session && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3 text-slate-600 shadow-2xl">
          <button onClick={() => onNavigate('dashboard')} className="flex flex-col items-center gap-1">
            <LayoutDashboard size={20} />
            <span className="text-[10px]">หน้าแรก</span>
          </button>
          <button onClick={() => onNavigate('register')} className="flex flex-col items-center gap-1">
            <ClipboardList size={20} />
            <span className="text-[10px]">ลงทะเบียน</span>
          </button>
        </nav>
      )}

      {/* Footer */}
      <footer className="bg-white border-t py-8 text-center text-slate-500 mt-auto">
        <div className="container mx-auto px-4">
          <p className="text-sm">© 2024 กลุ่มโรงเรียนตะเคียน–ลมศักดิ์ สพป.ศรีสะเกษ เขต 3</p>
          <p className="text-xs mt-1">ออกแบบโดยระบบอัตโนมัติเพื่อการจัดการแข่งขันกีฬาที่ทันสมัย</p>
        </div>
      </footer>
    </div>
  );
};

// Helper for the logo
const TrophyIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

export default Layout;
