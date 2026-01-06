
import React from 'react';
import { 
  Trophy, 
  Users, 
  Target, 
  Activity, 
  Dribbble, 
  Gamepad2, 
  PersonStanding,
  CircleDot
} from 'lucide-react';
import { School, Sport } from './types';

export const SCHOOLS: School[] = [
  { id: '1', name: 'โรงเรียนบ้านตะเคียนช่างเหล็ก' },
  { id: '2', name: 'โรงเรียนบ้านกะกำ' },
  { id: '3', name: 'โรงเรียนบ้านบัวบก' },
  { id: '4', name: 'โรงเรียนบ้านจันลม' },
  { id: '5', name: 'โรงเรียนบ้านหนองกาด' },
  { id: '6', name: 'โรงเรียนบ้านทุ่งศักดิ์' },
];

export const SPORTS: Sport[] = [
  { id: 'fb11', name: 'ฟุตบอล 11 คน', category: 'ฟุตบอล', icon: 'Trophy', description: 'การแข่งขันฟุตบอลสนามใหญ่ 11 คน' },
  { id: 'fs7', name: 'ฟุตซอล 7 คน', category: 'ฟุตซอล', icon: 'Activity', description: 'ฟุตซอลในร่มหรือสนามคอนกรีต' },
  { id: 'fb7', name: 'ฟุตบอล 7 คน', category: 'ฟุตบอล', icon: 'Activity', description: 'การแข่งขันฟุตบอลสนามเล็ก 7 คน' },
  { id: 'vb', name: 'วอลเลย์บอล', category: 'วอลเลย์บอล', icon: 'Target', description: 'วอลเลย์บอลชาย/หญิง' },
  { id: 'st', name: 'เซปักตะกร้อ', category: 'ตะกร้อ', icon: 'Dribbble', description: 'การแข่งขันตะกร้อทีมชุด/ทีมเดี่ยว' },
  { id: 'tt', name: 'เทเบิลเทนนิส', category: 'ปิงปอง', icon: 'Gamepad2', description: 'การแข่งขันปิงปองประเภทเดี่ยวและคู่' },
  { id: 'pq', name: 'เปตอง', category: 'เปตอง', icon: 'CircleDot', description: 'การแข่งขันเปตองทีมและคู่' },
  { id: 'hb', name: 'แฮนด์บอล', category: 'แฮนด์บอล', icon: 'Users', description: 'การแข่งขันแฮนด์บอลชาย/หญิง' },
  { id: 'at', name: 'กรีฑา', category: 'กรีฑา', icon: 'PersonStanding', description: 'วิ่งระยะสั้น ระยะกลาง และผลัด' },
];

export const ICON_MAP: Record<string, React.ReactNode> = {
  Trophy: <Trophy className="w-8 h-8" />,
  Users: <Users className="w-8 h-8" />,
  Target: <Target className="w-8 h-8" />,
  Activity: <Activity className="w-8 h-8" />,
  Dribbble: <Dribbble className="w-8 h-8" />,
  Gamepad2: <Gamepad2 className="w-8 h-8" />,
  PersonStanding: <PersonStanding className="w-8 h-8" />,
  CircleDot: <CircleDot className="w-8 h-8" />,
};
