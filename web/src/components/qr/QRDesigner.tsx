import { useState, useEffect, useCallback } from 'react';
import { Loader2, Download, Package, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, apiFetchBlob } from '@/config/api';
import type { Restaurant, QRData } from '@/types';
import Modal from '@/components/ui/Modal';

// ─── Types ──────────────────────────────────────────

type TemplateCategory = 'elegant' | 'professional' | 'modern' | 'fun' | 'geometric' | 'minimal';

interface TemplateDef {
  id: string;
  label: string;
  category: TemplateCategory;
  bg: string;
  accent: string;
  text: string;
  textMuted: string;
  qrDark: string;
  qrLight: string;
  decorations: boolean;
  borderStyle: 'thin' | 'ornate' | 'none';
  patternSvg?: string; // Raw SVG pattern content (inside <svg>)
  patternViewBox?: string; // viewBox for absolute-coordinate patterns (e.g. "0 0 400 600")
}

interface FontDef {
  id: string;
  label: string;
  family: string;
  category: string;
  type: 'serif' | 'sans';
}

// ─── Templates ──────────────────────────────────────

const TEMPLATES: TemplateDef[] = [
  // Elegant
  { id: 'classic-gold', label: 'Classic Gold', category: 'elegant', bg: '#0A0A0A', accent: '#C9A84C', text: '#FFFFFF', textMuted: '#A0A0A0', qrDark: '#FFFFFF', qrLight: '#0A0A0A', decorations: true, borderStyle: 'thin',
    patternSvg: `<defs><pattern id="p" width="200" height="200" patternUnits="userSpaceOnUse"><line x1="100" y1="200" x2="20" y2="0" stroke="#C9A84C" stroke-width="0.5" opacity="0.12"/><line x1="100" y1="200" x2="60" y2="0" stroke="#C9A84C" stroke-width="0.5" opacity="0.1"/><line x1="100" y1="200" x2="100" y2="0" stroke="#C9A84C" stroke-width="0.5" opacity="0.12"/><line x1="100" y1="200" x2="140" y2="0" stroke="#C9A84C" stroke-width="0.5" opacity="0.1"/><line x1="100" y1="200" x2="180" y2="0" stroke="#C9A84C" stroke-width="0.5" opacity="0.12"/><path d="M0,200 Q50,160 100,200 Q150,160 200,200" stroke="#C9A84C" fill="none" stroke-width="0.5" opacity="0.08"/><path d="M0,150 Q50,110 100,150 Q150,110 200,150" stroke="#C9A84C" fill="none" stroke-width="0.5" opacity="0.06"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'midnight-blue', label: 'Midnight Blue', category: 'elegant', bg: '#0C1425', accent: '#8BADD4', text: '#E8EDF4', textMuted: '#6B7D94', qrDark: '#E8EDF4', qrLight: '#0C1425', decorations: true, borderStyle: 'thin',
    patternSvg: `<defs><pattern id="p" width="180" height="180" patternUnits="userSpaceOnUse"><circle cx="25" cy="30" r="1.2" fill="#8BADD4" opacity="0.4"/><circle cx="80" cy="15" r="0.8" fill="#8BADD4" opacity="0.3"/><circle cx="150" cy="45" r="1.5" fill="#8BADD4" opacity="0.5"/><circle cx="45" cy="90" r="0.6" fill="#8BADD4" opacity="0.25"/><circle cx="120" cy="80" r="1" fill="#8BADD4" opacity="0.35"/><circle cx="170" cy="120" r="0.8" fill="#8BADD4" opacity="0.3"/><circle cx="30" cy="150" r="1.3" fill="#8BADD4" opacity="0.45"/><circle cx="100" cy="140" r="0.7" fill="#8BADD4" opacity="0.25"/><circle cx="140" cy="160" r="1.1" fill="#8BADD4" opacity="0.4"/><circle cx="65" cy="55" r="1.8" fill="#B0C8E8" opacity="0.2"/><circle cx="160" cy="90" r="1.6" fill="#B0C8E8" opacity="0.15"/><line x1="25" y1="30" x2="80" y2="15" stroke="#8BADD4" stroke-width="0.3" opacity="0.08"/><line x1="80" y1="15" x2="150" y2="45" stroke="#8BADD4" stroke-width="0.3" opacity="0.08"/><line x1="120" y1="80" x2="150" y2="45" stroke="#8BADD4" stroke-width="0.3" opacity="0.06"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'wine-rose', label: 'Wine & Rose', category: 'elegant', bg: '#1A0A10', accent: '#D4918A', text: '#F0DCD9', textMuted: '#8B6B67', qrDark: '#F0DCD9', qrLight: '#1A0A10', decorations: true, borderStyle: 'ornate',
    patternSvg: `<defs><pattern id="p" width="200" height="160" patternUnits="userSpaceOnUse"><path d="M0,80 C30,40 60,40 80,80 C100,120 130,120 160,80 C180,50 200,50 200,80" stroke="#D4918A" fill="none" stroke-width="0.8" opacity="0.12"/><path d="M80,80 C85,65 75,55 65,60" stroke="#D4918A" fill="none" stroke-width="0.5" opacity="0.1"/><path d="M160,80 C165,95 155,105 145,100" stroke="#D4918A" fill="none" stroke-width="0.5" opacity="0.1"/><circle cx="62" cy="58" r="2.5" fill="#D4918A" opacity="0.08"/><circle cx="142" cy="102" r="2.5" fill="#D4918A" opacity="0.08"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'champagne', label: 'Champagne', category: 'elegant', bg: '#F5F0E4', accent: '#8B6914', text: '#2A2010', textMuted: '#7A7060', qrDark: '#2A2010', qrLight: '#F5F0E4', decorations: true, borderStyle: 'thin',
    patternSvg: `<defs><pattern id="p" width="160" height="200" patternUnits="userSpaceOnUse"><circle cx="30" cy="180" r="4" stroke="#8B6914" fill="none" stroke-width="0.5" opacity="0.12"/><circle cx="30" cy="140" r="3.5" stroke="#8B6914" fill="none" stroke-width="0.5" opacity="0.1"/><circle cx="32" cy="100" r="3" stroke="#8B6914" fill="none" stroke-width="0.5" opacity="0.09"/><circle cx="28" cy="60" r="2.5" stroke="#8B6914" fill="none" stroke-width="0.5" opacity="0.07"/><circle cx="31" cy="25" r="2" stroke="#8B6914" fill="none" stroke-width="0.5" opacity="0.05"/><circle cx="100" cy="190" r="3.5" stroke="#8B6914" fill="none" stroke-width="0.5" opacity="0.11"/><circle cx="98" cy="150" r="3" stroke="#8B6914" fill="none" stroke-width="0.5" opacity="0.09"/><circle cx="102" cy="115" r="2.5" stroke="#8B6914" fill="none" stroke-width="0.5" opacity="0.08"/><circle cx="99" cy="80" r="2" stroke="#8B6914" fill="none" stroke-width="0.5" opacity="0.06"/><circle cx="140" cy="170" r="2" stroke="#8B6914" fill="none" stroke-width="0.5" opacity="0.07"/><circle cx="60" cy="160" r="1.5" stroke="#8B6914" fill="none" stroke-width="0.5" opacity="0.06"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'emerald-gold', label: 'Emerald Gold', category: 'elegant', bg: '#0A1F14', accent: '#D4AF37', text: '#F0EDE4', textMuted: '#8A9A80', qrDark: '#F0EDE4', qrLight: '#0A1F14', decorations: true, borderStyle: 'thin',
    patternSvg: `<defs><pattern id="p" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M40,0 L80,40 L40,80 L0,40 Z" stroke="#D4AF37" fill="none" stroke-width="0.6" opacity="0.1"/><path d="M40,15 L65,40 L40,65 L15,40 Z" stroke="#D4AF37" fill="none" stroke-width="0.4" opacity="0.07"/><circle cx="40" cy="40" r="2" fill="#D4AF37" opacity="0.08"/><circle cx="40" cy="0" r="1.5" fill="#D4AF37" opacity="0.06"/><circle cx="0" cy="40" r="1.5" fill="#D4AF37" opacity="0.06"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'royal-purple', label: 'Royal Purple', category: 'elegant', bg: '#140A28', accent: '#B48CDE', text: '#EDE4F5', textMuted: '#7A6A90', qrDark: '#EDE4F5', qrLight: '#140A28', decorations: true, borderStyle: 'ornate',
    patternSvg: `<defs><pattern id="p" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="60" stroke="#B48CDE" stroke-width="0.5" opacity="0.08"/><line x1="30" y1="0" x2="30" y2="60" stroke="#B48CDE" stroke-width="0.5" opacity="0.06"/></pattern><pattern id="p2" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="60" stroke="#B48CDE" stroke-width="0.5" opacity="0.08"/><line x1="30" y1="0" x2="30" y2="60" stroke="#B48CDE" stroke-width="0.5" opacity="0.06"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/><rect width="100%" height="100%" fill="url(#p2)"/>` },
  { id: 'copper-noir', label: 'Copper Noir', category: 'elegant', bg: '#121010', accent: '#CD7F52', text: '#F2E8E0', textMuted: '#9A8070', qrDark: '#F2E8E0', qrLight: '#121010', decorations: true, borderStyle: 'thin',
    patternSvg: `<defs><pattern id="p" width="200" height="8" patternUnits="userSpaceOnUse"><line x1="0" y1="2" x2="200" y2="2" stroke="#CD7F52" stroke-width="0.3" opacity="0.1"/><line x1="0" y1="5" x2="200" y2="5" stroke="#CD7F52" stroke-width="0.2" opacity="0.06"/><line x1="0" y1="7" x2="200" y2="7.2" stroke="#CD7F52" stroke-width="0.4" opacity="0.08"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  // Professional
  { id: 'clean-white', label: 'Clean White', category: 'professional', bg: '#FFFFFF', accent: '#1A1A1A', text: '#1A1A1A', textMuted: '#6B6B6B', qrDark: '#1A1A1A', qrLight: '#FFFFFF', decorations: true, borderStyle: 'thin',
    patternSvg: `<defs><pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="0.8" fill="#1A1A1A" opacity="0.08"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'slate', label: 'Slate', category: 'professional', bg: '#1E2228', accent: '#E0E0E0', text: '#E8E8E8', textMuted: '#8A8A8A', qrDark: '#E8E8E8', qrLight: '#1E2228', decorations: true, borderStyle: 'thin',
    patternSvg: `<defs><pattern id="p" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(135)"><line x1="0" y1="0" x2="0" y2="16" stroke="#E0E0E0" stroke-width="0.5" opacity="0.06"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'forest', label: 'Forest', category: 'professional', bg: '#0B1A12', accent: '#A8C5A0', text: '#D8E8D4', textMuted: '#6B8A64', qrDark: '#D8E8D4', qrLight: '#0B1A12', decorations: true, borderStyle: 'thin',
    patternSvg: `<defs><pattern id="p" width="200" height="100" patternUnits="userSpaceOnUse"><path d="M0,50 C30,30 60,70 100,45 C140,20 170,60 200,50" stroke="#A8C5A0" fill="none" stroke-width="0.6" opacity="0.1"/><path d="M0,80 C40,60 80,90 120,75 C160,60 180,80 200,75" stroke="#A8C5A0" fill="none" stroke-width="0.5" opacity="0.07"/><path d="M0,20 C50,10 90,35 140,20 C170,12 190,25 200,22" stroke="#A8C5A0" fill="none" stroke-width="0.4" opacity="0.06"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'ocean', label: 'Ocean', category: 'professional', bg: '#0A1A2A', accent: '#4AC5C5', text: '#D4F0F0', textMuted: '#5A8A8A', qrDark: '#D4F0F0', qrLight: '#0A1A2A', decorations: true, borderStyle: 'thin',
    patternSvg: `<defs><pattern id="p" width="200" height="60" patternUnits="userSpaceOnUse"><path d="M0,30 C25,15 50,15 75,30 C100,45 125,45 150,30 C175,15 200,15 225,30" stroke="#4AC5C5" fill="none" stroke-width="0.8" opacity="0.12"/><path d="M-25,50 C0,35 25,35 50,50 C75,65 100,65 125,50 C150,35 175,35 200,50" stroke="#4AC5C5" fill="none" stroke-width="0.6" opacity="0.08"/><path d="M10,12 C35,-3 60,-3 85,12 C110,27 135,27 160,12 C185,-3 210,-3 235,12" stroke="#4AC5C5" fill="none" stroke-width="0.4" opacity="0.06"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'arctic', label: 'Arctic', category: 'professional', bg: '#E8F0F8', accent: '#2E6B9E', text: '#1A2A3A', textMuted: '#6080A0', qrDark: '#1A2A3A', qrLight: '#E8F0F8', decorations: true, borderStyle: 'thin',
    patternSvg: `<defs><pattern id="p" width="100" height="100" patternUnits="userSpaceOnUse"><polygon points="50,10 90,30 90,70 50,90 10,70 10,30" stroke="#2E6B9E" fill="none" stroke-width="0.5" opacity="0.08"/><line x1="50" y1="10" x2="50" y2="90" stroke="#2E6B9E" stroke-width="0.3" opacity="0.06"/><line x1="10" y1="30" x2="90" y2="70" stroke="#2E6B9E" stroke-width="0.3" opacity="0.05"/><line x1="10" y1="70" x2="90" y2="30" stroke="#2E6B9E" stroke-width="0.3" opacity="0.05"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'sage-linen', label: 'Sage Linen', category: 'professional', bg: '#F2F0E8', accent: '#6B8F71', text: '#2A3A2E', textMuted: '#7A8A7A', qrDark: '#2A3A2E', qrLight: '#F2F0E8', decorations: true, borderStyle: 'thin',
    patternSvg: `<defs><pattern id="p" width="12" height="12" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="12" y2="0" stroke="#6B8F71" stroke-width="0.4" opacity="0.08"/><line x1="0" y1="4" x2="12" y2="4" stroke="#6B8F71" stroke-width="0.3" opacity="0.05"/><line x1="0" y1="8" x2="12" y2="8" stroke="#6B8F71" stroke-width="0.4" opacity="0.07"/><line x1="0" y1="0" x2="0" y2="12" stroke="#6B8F71" stroke-width="0.3" opacity="0.04"/><line x1="6" y1="0" x2="6" y2="12" stroke="#6B8F71" stroke-width="0.3" opacity="0.05"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  // Modern
  { id: 'neon-pop', label: 'Neon Pop', category: 'modern', bg: '#0A0A0A', accent: '#FF2D95', text: '#FFFFFF', textMuted: '#888888', qrDark: '#FFFFFF', qrLight: '#0A0A0A', decorations: true, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="80" height="80" patternUnits="userSpaceOnUse"><line x1="0" y1="80" x2="80" y2="80" stroke="#FF2D95" stroke-width="0.5" opacity="0.15"/><line x1="80" y1="0" x2="80" y2="80" stroke="#FF2D95" stroke-width="0.5" opacity="0.15"/><line x1="0" y1="40" x2="80" y2="40" stroke="#FF2D95" stroke-width="0.3" opacity="0.06"/><line x1="40" y1="0" x2="40" y2="80" stroke="#FF2D95" stroke-width="0.3" opacity="0.06"/></pattern><radialGradient id="glow" cx="50%" cy="40%"><stop offset="0%" stop-color="#FF2D95" stop-opacity="0.06"/><stop offset="100%" stop-color="#FF2D95" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#p)"/><rect width="100%" height="100%" fill="url(#glow)"/>` },
  { id: 'sunset', label: 'Sunset', category: 'modern', bg: '#1A0D06', accent: '#FF8C42', text: '#FFE0C0', textMuted: '#A07040', qrDark: '#FFE0C0', qrLight: '#1A0D06', decorations: true, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="200" height="300" patternUnits="userSpaceOnUse"><line x1="100" y1="0" x2="0" y2="300" stroke="#FF8C42" stroke-width="0.8" opacity="0.08"/><line x1="100" y1="0" x2="40" y2="300" stroke="#FF8C42" stroke-width="0.6" opacity="0.06"/><line x1="100" y1="0" x2="80" y2="300" stroke="#FF8C42" stroke-width="0.8" opacity="0.08"/><line x1="100" y1="0" x2="120" y2="300" stroke="#FF8C42" stroke-width="0.8" opacity="0.08"/><line x1="100" y1="0" x2="160" y2="300" stroke="#FF8C42" stroke-width="0.6" opacity="0.06"/><line x1="100" y1="0" x2="200" y2="300" stroke="#FF8C42" stroke-width="0.8" opacity="0.08"/></pattern><radialGradient id="sun" cx="50%" cy="0%"><stop offset="0%" stop-color="#FF8C42" stop-opacity="0.1"/><stop offset="60%" stop-color="#FF8C42" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#p)"/><rect width="100%" height="100%" fill="url(#sun)"/>` },
  { id: 'pastel-dream', label: 'Pastel Dream', category: 'modern', bg: '#F8E8F0', accent: '#9B5BA5', text: '#3A2040', textMuted: '#8A6A90', qrDark: '#3A2040', qrLight: '#F8E8F0', decorations: true, borderStyle: 'thin',
    patternSvg: `<defs><pattern id="p" width="200" height="200" patternUnits="userSpaceOnUse"><circle cx="40" cy="45" r="25" fill="#9B5BA5" opacity="0.04"/><circle cx="150" cy="30" r="18" fill="#C48BC8" opacity="0.05"/><circle cx="100" cy="120" r="30" fill="#9B5BA5" opacity="0.03"/><circle cx="30" cy="160" r="15" fill="#B87ABE" opacity="0.05"/><circle cx="170" cy="150" r="22" fill="#9B5BA5" opacity="0.04"/><circle cx="80" cy="60" r="10" fill="#C48BC8" opacity="0.06"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'tropical', label: 'Tropical', category: 'modern', bg: '#E8F5F0', accent: '#FF6B6B', text: '#1A3A30', textMuted: '#5A8A7A', qrDark: '#1A3A30', qrLight: '#E8F5F0', decorations: true, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M30,180 C30,130 60,100 80,80 C60,90 40,95 25,100" stroke="#2E8B57" fill="none" stroke-width="1" opacity="0.1"/><path d="M80,80 C85,60 95,50 110,45" stroke="#2E8B57" fill="none" stroke-width="0.8" opacity="0.08"/><path d="M80,80 C90,85 100,95 105,110" stroke="#2E8B57" fill="none" stroke-width="0.8" opacity="0.08"/><path d="M30,180 C50,170 65,150 80,80" stroke="#2E8B57" fill="none" stroke-width="0.6" opacity="0.06"/><path d="M150,190 C150,150 165,120 180,100 C165,108 150,115 140,120" stroke="#2E8B57" fill="none" stroke-width="0.8" opacity="0.08"/><path d="M180,100 C188,85 195,75 200,70" stroke="#2E8B57" fill="none" stroke-width="0.6" opacity="0.06"/><circle cx="120" cy="20" r="12" fill="#FF6B6B" opacity="0.04"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'cherry-blossom', label: 'Cherry Blossom', category: 'modern', bg: '#FFF0F3', accent: '#D4456A', text: '#3A1A24', textMuted: '#A07080', qrDark: '#3A1A24', qrLight: '#FFF0F3', decorations: true, borderStyle: 'thin',
    patternSvg: `<defs><pattern id="p" width="180" height="200" patternUnits="userSpaceOnUse"><ellipse cx="30" cy="40" rx="6" ry="10" fill="#D4456A" opacity="0.08" transform="rotate(-30,30,40)"/><ellipse cx="90" cy="25" rx="5" ry="8" fill="#E8809A" opacity="0.06" transform="rotate(15,90,25)"/><ellipse cx="150" cy="60" rx="7" ry="11" fill="#D4456A" opacity="0.07" transform="rotate(-45,150,60)"/><ellipse cx="60" cy="110" rx="5" ry="9" fill="#D4456A" opacity="0.06" transform="rotate(25,60,110)"/><ellipse cx="130" cy="140" rx="6" ry="10" fill="#E8809A" opacity="0.08" transform="rotate(-20,130,140)"/><ellipse cx="40" cy="170" rx="4" ry="7" fill="#D4456A" opacity="0.05" transform="rotate(40,40,170)"/><ellipse cx="160" cy="180" rx="5" ry="8" fill="#D4456A" opacity="0.07" transform="rotate(-35,160,180)"/><circle cx="90" cy="75" r="2" fill="#D4456A" opacity="0.06"/><circle cx="20" cy="130" r="1.5" fill="#E8809A" opacity="0.05"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'carbon', label: 'Carbon', category: 'modern', bg: '#1A1A1A', accent: '#FF4444', text: '#F0F0F0', textMuted: '#808080', qrDark: '#F0F0F0', qrLight: '#1A1A1A', decorations: true, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#222222" opacity="0.5"/><rect x="5" y="5" width="5" height="5" fill="#222222" opacity="0.5"/><rect x="5" y="0" width="5" height="5" fill="#1E1E1E" opacity="0.4"/><rect x="0" y="5" width="5" height="5" fill="#1E1E1E" opacity="0.4"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'electric-blue', label: 'Electric Blue', category: 'modern', bg: '#060D18', accent: '#00B4FF', text: '#E0F0FF', textMuted: '#5A8AAA', qrDark: '#E0F0FF', qrLight: '#060D18', decorations: true, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M0,60 L30,60 L30,30 L60,30" stroke="#00B4FF" fill="none" stroke-width="0.8" opacity="0.15"/><path d="M60,30 L60,60 L90,60 L90,90 L120,90" stroke="#00B4FF" fill="none" stroke-width="0.8" opacity="0.12"/><path d="M60,90 L60,120" stroke="#00B4FF" fill="none" stroke-width="0.6" opacity="0.1"/><path d="M30,0 L30,30" stroke="#00B4FF" fill="none" stroke-width="0.6" opacity="0.1"/><circle cx="30" cy="60" r="2" fill="#00B4FF" opacity="0.2"/><circle cx="60" cy="30" r="2" fill="#00B4FF" opacity="0.2"/><circle cx="90" cy="90" r="2" fill="#00B4FF" opacity="0.2"/><circle cx="30" cy="30" r="1.5" fill="#00B4FF" opacity="0.15"/><circle cx="60" cy="60" r="1.5" fill="#00B4FF" opacity="0.12"/></pattern><radialGradient id="glow" cx="30%" cy="30%"><stop offset="0%" stop-color="#00B4FF" stop-opacity="0.05"/><stop offset="100%" stop-color="#00B4FF" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#p)"/><rect width="100%" height="100%" fill="url(#glow)"/>` },
  // Fun (with SVG patterns)
  { id: 'confetti', label: 'Confetti', category: 'fun', bg: '#1A1030', accent: '#FFD166', text: '#FFFFFF', textMuted: '#C0B0D0', qrDark: '#FFFFFF', qrLight: '#1A1030', decorations: false, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="120" height="120" patternUnits="userSpaceOnUse"><circle cx="15" cy="18" r="5" fill="#FF6B6B" opacity="0.5"/><circle cx="55" cy="8" r="4" fill="#FFD166" opacity="0.55"/><circle cx="95" cy="30" r="5" fill="#06D6A0" opacity="0.5"/><circle cx="30" cy="55" r="3.5" fill="#118AB2" opacity="0.55"/><circle cx="75" cy="65" r="5" fill="#EF476F" opacity="0.5"/><circle cx="105" cy="85" r="4" fill="#FFD166" opacity="0.55"/><circle cx="20" cy="95" r="5" fill="#06D6A0" opacity="0.5"/><circle cx="65" cy="100" r="3.5" fill="#FF6B6B" opacity="0.55"/><rect x="40" y="38" width="5" height="5" fill="#FFD166" opacity="0.4" transform="rotate(45,42.5,40.5)"/><rect x="83" y="48" width="5" height="5" fill="#118AB2" opacity="0.4" transform="rotate(30,85.5,50.5)"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'polka-dots', label: 'Polka Dots', category: 'fun', bg: '#FFE4EC', accent: '#E91E63', text: '#2A0A18', textMuted: '#9A5070', qrDark: '#2A0A18', qrLight: '#FFE4EC', decorations: false, borderStyle: 'thin',
    patternSvg: `<defs><pattern id="p" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="18" cy="18" r="6" fill="#E91E63" opacity="0.22"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'stripes', label: 'Rayas', category: 'fun', bg: '#FFFDE7', accent: '#F57F17', text: '#3E2723', textMuted: '#8D6E63', qrDark: '#3E2723', qrLight: '#FFFDE7', decorations: false, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(135)"><line x1="0" y1="0" x2="0" y2="20" stroke="#F57F17" stroke-width="3" opacity="0.18"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'waves', label: 'Olas', category: 'fun', bg: '#E3F2FD', accent: '#1565C0', text: '#0D1B2A', textMuted: '#5A7A9A', qrDark: '#0D1B2A', qrLight: '#E3F2FD', decorations: false, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="80" height="28" patternUnits="userSpaceOnUse"><path d="M0 14 Q20 0 40 14 Q60 28 80 14" stroke="#1565C0" fill="none" stroke-width="2.5" opacity="0.2"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'zigzag', label: 'Zigzag', category: 'fun', bg: '#4A148C', accent: '#E040FB', text: '#F3E5F5', textMuted: '#CE93D8', qrDark: '#F3E5F5', qrLight: '#4A148C', decorations: false, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="50" height="24" patternUnits="userSpaceOnUse"><polyline points="0,18 12.5,6 25,18 37.5,6 50,18" stroke="#E040FB" fill="none" stroke-width="2.5" opacity="0.25"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'diamonds', label: 'Diamantes', category: 'fun', bg: '#004D40', accent: '#1DE9B6', text: '#E0F2F1', textMuted: '#80CBC4', qrDark: '#E0F2F1', qrLight: '#004D40', decorations: false, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><polygon points="20,3 37,20 20,37 3,20" stroke="#1DE9B6" fill="#1DE9B6" fill-opacity="0.08" stroke-width="1.5" opacity="0.3"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'bubbles', label: 'Burbujas', category: 'fun', bg: '#FFF3E0', accent: '#FF6D00', text: '#3E2723', textMuted: '#A1887F', qrDark: '#3E2723', qrLight: '#FFF3E0', decorations: false, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="140" height="140" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="16" stroke="#FF6D00" fill="none" stroke-width="2" opacity="0.2"/><circle cx="90" cy="60" r="24" stroke="#FF6D00" fill="none" stroke-width="2" opacity="0.15"/><circle cx="50" cy="110" r="14" stroke="#FF6D00" fill="none" stroke-width="2" opacity="0.22"/><circle cx="120" cy="20" r="10" stroke="#FF6D00" fill="none" stroke-width="2" opacity="0.18"/><circle cx="110" cy="120" r="18" stroke="#FF6D00" fill="none" stroke-width="2" opacity="0.16"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'stars', label: 'Estrellas', category: 'fun', bg: '#1A237E', accent: '#FFD740', text: '#E8EAF6', textMuted: '#9FA8DA', qrDark: '#E8EAF6', qrLight: '#1A237E', decorations: false, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="60" height="60" patternUnits="userSpaceOnUse"><polygon points="30,6 35,22 52,22 38,31 43,48 30,38 17,48 22,31 8,22 25,22" fill="#FFD740" opacity="0.2"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  // Geometric (Low Poly — Delaunay triangulation)
  { id: 'crystal-night', label: 'Crystal Night', category: 'geometric', bg: '#0B0E1A', accent: '#7B8CDE', text: '#E0E4F5', textMuted: '#6A7AAA', qrDark: '#E0E4F5', qrLight: '#0B0E1A', decorations: false, borderStyle: 'none',
    patternViewBox: '0 0 400 600',
    patternSvg: `<polygon points="201.9,323.4 281.7,329.6 234.7,297" fill="#242b67" stroke="#242b67" stroke-width="0.5"/><polygon points="281.7,329.6 284.2,296 234.7,297" fill="#212860" stroke="#212860" stroke-width="0.5"/><polygon points="201.9,323.4 276.1,432 281.7,329.6" fill="#1e255a" stroke="#1e255a" stroke-width="0.5"/><polygon points="281.7,329.6 347.3,339.8 284.2,296" fill="#181e47" stroke="#181e47" stroke-width="0.5"/><polygon points="331.4,422.6 347.3,339.8 281.7,329.6" fill="#191f4c" stroke="#191f4c" stroke-width="0.5"/><polygon points="201.9,323.4 168.9,422.7 276.1,432" fill="#222962" stroke="#222962" stroke-width="0.5"/><polygon points="111.6,309.4 131.2,358.4 201.9,323.4" fill="#212a5d" stroke="#212a5d" stroke-width="0.5"/><polygon points="201.9,323.4 131.2,358.4 168.9,422.7" fill="#242d68" stroke="#242d68" stroke-width="0.5"/><polygon points="276.1,432 331.4,422.6 281.7,329.6" fill="#171c42" stroke="#171c42" stroke-width="0.5"/><polygon points="168.9,422.7 185.6,449.4 276.1,432" fill="#1b2153" stroke="#1b2153" stroke-width="0.5"/><polygon points="276.1,432 368.2,466 331.4,422.6" fill="#151a38" stroke="#151a38" stroke-width="0.5"/><polygon points="154.1,184.9 111.6,309.4 201.9,323.4" fill="#202a5c" stroke="#202a5c" stroke-width="0.5"/><polygon points="347.3,339.8 357.4,270.7 284.2,296" fill="#181d43" stroke="#181d43" stroke-width="0.5"/><polygon points="284.2,296 301.6,207.9 234.7,297" fill="#222a64" stroke="#222a64" stroke-width="0.5"/><polygon points="234.7,297 154.1,184.9 201.9,323.4" fill="#252d69" stroke="#252d69" stroke-width="0.5"/><polygon points="357.4,270.7 301.6,207.9 284.2,296" fill="#191f4c" stroke="#191f4c" stroke-width="0.5"/><polygon points="301.6,207.9 212.3,188 234.7,297" fill="#242c68" stroke="#242c68" stroke-width="0.5"/><polygon points="400,385 400,350 347.3,339.8" fill="#161b3d" stroke="#161b3d" stroke-width="0.5"/><polygon points="347.3,339.8 400,315 357.4,270.7" fill="#171c3e" stroke="#171c3e" stroke-width="0.5"/><polygon points="400,350 400,315 347.3,339.8" fill="#151934" stroke="#151934" stroke-width="0.5"/><polygon points="357.4,270.7 348.3,207 301.6,207.9" fill="#1e2559" stroke="#1e2559" stroke-width="0.5"/><polygon points="331.4,422.6 400,385 347.3,339.8" fill="#151935" stroke="#151935" stroke-width="0.5"/><polygon points="400,315 400,280 357.4,270.7" fill="#151a38" stroke="#151a38" stroke-width="0.5"/><polygon points="400,245 348.3,207 357.4,270.7" fill="#181e47" stroke="#181e47" stroke-width="0.5"/><polygon points="301.6,207.9 261.5,129.5 212.3,188" fill="#232b66" stroke="#232b66" stroke-width="0.5"/><polygon points="151,484 185.6,449.4 168.9,422.7" fill="#242c68" stroke="#242c68" stroke-width="0.5"/><polygon points="151,484 206.4,504.7 185.6,449.4" fill="#1d2357" stroke="#1d2357" stroke-width="0.5"/><polygon points="185.6,449.4 206.4,504.7 276.1,432" fill="#1c2356" stroke="#1c2356" stroke-width="0.5"/><polygon points="331.4,422.6 400,420 400,385" fill="#141830" stroke="#141830" stroke-width="0.5"/><polygon points="99.5,471.6 168.9,422.7 131.2,358.4" fill="#252d69" stroke="#252d69" stroke-width="0.5"/><polygon points="99.5,471.6 151,484 168.9,422.7" fill="#242b67" stroke="#242b67" stroke-width="0.5"/><polygon points="206.4,504.7 260.8,508.5 276.1,432" fill="#1a2050" stroke="#1a2050" stroke-width="0.5"/><polygon points="212.3,188 154.1,184.9 234.7,297" fill="#232b63" stroke="#232b63" stroke-width="0.5"/><polygon points="54.1,251 62.6,336.1 111.6,309.4" fill="#1d2651" stroke="#1d2651" stroke-width="0.5"/><polygon points="111.6,309.4 62.6,336.1 131.2,358.4" fill="#222b61" stroke="#222b61" stroke-width="0.5"/><polygon points="368.2,466 400,420 331.4,422.6" fill="#151a38" stroke="#151a38" stroke-width="0.5"/><polygon points="260.8,508.5 368.2,466 276.1,432" fill="#181d43" stroke="#181d43" stroke-width="0.5"/><polygon points="400,280 400,245 357.4,270.7" fill="#181d45" stroke="#181d45" stroke-width="0.5"/><polygon points="51.7,394.1 99.5,471.6 131.2,358.4" fill="#222b61" stroke="#222b61" stroke-width="0.5"/><polygon points="148.2,552.9 195.1,560.4 206.4,504.7" fill="#1b2152" stroke="#1b2152" stroke-width="0.5"/><polygon points="62.6,336.1 51.7,394.1 131.2,358.4" fill="#1f2958" stroke="#1f2958" stroke-width="0.5"/><polygon points="400,490 400,455 368.2,466" fill="#11152b" stroke="#11152b" stroke-width="0.5"/><polygon points="368.2,466 400,455 400,420" fill="#141830" stroke="#141830" stroke-width="0.5"/><polygon points="400,175 326.4,158.3 348.3,207" fill="#191e48" stroke="#191e48" stroke-width="0.5"/><polygon points="348.3,207 326.4,158.3 301.6,207.9" fill="#1b2152" stroke="#1b2152" stroke-width="0.5"/><polygon points="212.3,188 163.8,137.1 154.1,184.9" fill="#212a5e" stroke="#212a5e" stroke-width="0.5"/><polygon points="154.1,184.9 72,230.5 111.6,309.4" fill="#1c254f" stroke="#1c254f" stroke-width="0.5"/><polygon points="62.6,336.1 0,350 51.7,394.1" fill="#1e2855" stroke="#1e2855" stroke-width="0.5"/><polygon points="195.1,560.4 281.3,536.4 260.8,508.5" fill="#191f4b" stroke="#191f4b" stroke-width="0.5"/><polygon points="260.8,508.5 281.3,536.4 368.2,466" fill="#151934" stroke="#151934" stroke-width="0.5"/><polygon points="195.1,560.4 260.8,508.5 206.4,504.7" fill="#191e4a" stroke="#191e4a" stroke-width="0.5"/><polygon points="400,245 400,210 348.3,207" fill="#171c40" stroke="#171c40" stroke-width="0.5"/><polygon points="72,230.5 54.1,251 111.6,309.4" fill="#1d2753" stroke="#1d2753" stroke-width="0.5"/><polygon points="326.4,158.3 261.5,129.5 301.6,207.9" fill="#222962" stroke="#222962" stroke-width="0.5"/><polygon points="154.1,184.9 46.6,158.8 72,230.5" fill="#192147" stroke="#192147" stroke-width="0.5"/><polygon points="194.9,125 163.8,137.1 212.3,188" fill="#202a5c" stroke="#202a5c" stroke-width="0.5"/><polygon points="261.5,129.5 194.9,125 212.3,188" fill="#242c67" stroke="#242c67" stroke-width="0.5"/><polygon points="400,525 400,490 368.2,466" fill="#12162d" stroke="#12162d" stroke-width="0.5"/><polygon points="148.2,552.9 206.4,504.7 151,484" fill="#1f265d" stroke="#1f265d" stroke-width="0.5"/><polygon points="400,210 400,175 348.3,207" fill="#1a2050" stroke="#1a2050" stroke-width="0.5"/><polygon points="326.4,158.3 308.3,70.7 261.5,129.5" fill="#222a63" stroke="#222a63" stroke-width="0.5"/><polygon points="140,600 148.2,552.9 105,600" fill="#1e2559" stroke="#1e2559" stroke-width="0.5"/><polygon points="99.5,471.6 148.2,552.9 151,484" fill="#20275d" stroke="#20275d" stroke-width="0.5"/><polygon points="0,315 0,350 62.6,336.1" fill="#192147" stroke="#192147" stroke-width="0.5"/><polygon points="51.7,394.1 0,455 99.5,471.6" fill="#1e2854" stroke="#1e2854" stroke-width="0.5"/><polygon points="0,280 0,315 62.6,336.1" fill="#1a2249" stroke="#1a2249" stroke-width="0.5"/><polygon points="378.8,551 400,525 368.2,466" fill="#12162d" stroke="#12162d" stroke-width="0.5"/><polygon points="378.8,551 368.2,466 281.3,536.4" fill="#13172f" stroke="#13172f" stroke-width="0.5"/><polygon points="0,350 0,385 51.7,394.1" fill="#1b244d" stroke="#1b244d" stroke-width="0.5"/><polygon points="0,245 0,280 54.1,251" fill="#192045" stroke="#192045" stroke-width="0.5"/><polygon points="54.1,251 0,280 62.6,336.1" fill="#1b234c" stroke="#1b234c" stroke-width="0.5"/><polygon points="0,245 54.1,251 0,210" fill="#151b39" stroke="#151b39" stroke-width="0.5"/><polygon points="315,600 378.8,551 281.3,536.4" fill="#12162e" stroke="#12162e" stroke-width="0.5"/><polygon points="400,175 400,140 326.4,158.3" fill="#1c2254" stroke="#1c2254" stroke-width="0.5"/><polygon points="0,385 0,420 51.7,394.1" fill="#1e2856" stroke="#1e2856" stroke-width="0.5"/><polygon points="0,210 54.1,251 72,230.5" fill="#1a2249" stroke="#1a2249" stroke-width="0.5"/><polygon points="210,600 245,600 195.1,560.4" fill="#181e46" stroke="#181e46" stroke-width="0.5"/><polygon points="195.1,560.4 245,600 281.3,536.4" fill="#191e48" stroke="#191e48" stroke-width="0.5"/><polygon points="175,600 210,600 195.1,560.4" fill="#191f4d" stroke="#191f4d" stroke-width="0.5"/><polygon points="40.3,71.5 46.6,158.8 163.8,137.1" fill="#171f41" stroke="#171f41" stroke-width="0.5"/><polygon points="163.8,137.1 46.6,158.8 154.1,184.9" fill="#1c254f" stroke="#1c254f" stroke-width="0.5"/><polygon points="245,600 280,600 281.3,536.4" fill="#151936" stroke="#151936" stroke-width="0.5"/><polygon points="0,420 0,455 51.7,394.1" fill="#1d2651" stroke="#1d2651" stroke-width="0.5"/><polygon points="148.2,552.9 175,600 195.1,560.4" fill="#1d2356" stroke="#1d2356" stroke-width="0.5"/><polygon points="140,600 175,600 148.2,552.9" fill="#1c2254" stroke="#1c2254" stroke-width="0.5"/><polygon points="280,600 315,600 281.3,536.4" fill="#13172e" stroke="#13172e" stroke-width="0.5"/><polygon points="46.6,158.8 0,210 72,230.5" fill="#141a38" stroke="#141a38" stroke-width="0.5"/><polygon points="385,600 400,560 378.8,551" fill="#0f1228" stroke="#0f1228" stroke-width="0.5"/><polygon points="378.8,551 400,560 400,525" fill="#11142b" stroke="#11142b" stroke-width="0.5"/><polygon points="351.8,55.5 308.3,70.7 326.4,158.3" fill="#1f265b" stroke="#1f265b" stroke-width="0.5"/><polygon points="261.5,129.5 202.6,51.9 194.9,125" fill="#232b63" stroke="#232b63" stroke-width="0.5"/><polygon points="194.9,125 154,55.9 163.8,137.1" fill="#1c254f" stroke="#1c254f" stroke-width="0.5"/><polygon points="42,538.2 148.2,552.9 99.5,471.6" fill="#242c67" stroke="#242c67" stroke-width="0.5"/><polygon points="0,490 42,538.2 99.5,471.6" fill="#222b62" stroke="#222b62" stroke-width="0.5"/><polygon points="400,140 400,105 326.4,158.3" fill="#191f4a" stroke="#191f4a" stroke-width="0.5"/><polygon points="315,600 350,600 378.8,551" fill="#12152c" stroke="#12152c" stroke-width="0.5"/><polygon points="0,455 0,490 99.5,471.6" fill="#1f2958" stroke="#1f2958" stroke-width="0.5"/><polygon points="308.3,70.7 202.6,51.9 261.5,129.5" fill="#242c67" stroke="#242c67" stroke-width="0.5"/><polygon points="0,140 0,175 46.6,158.8" fill="#131935" stroke="#131935" stroke-width="0.5"/><polygon points="46.6,158.8 0,175 0,210" fill="#161c3c" stroke="#161c3c" stroke-width="0.5"/><polygon points="42,538.2 105,600 148.2,552.9" fill="#212861" stroke="#212861" stroke-width="0.5"/><polygon points="202.6,51.9 154,55.9 194.9,125" fill="#1e2855" stroke="#1e2855" stroke-width="0.5"/><polygon points="350,600 385,600 378.8,551" fill="#11152c" stroke="#11152c" stroke-width="0.5"/><polygon points="385,600 400,595 400,560" fill="#0f1228" stroke="#0f1228" stroke-width="0.5"/><polygon points="400,105 351.8,55.5 326.4,158.3" fill="#20275e" stroke="#20275e" stroke-width="0.5"/><polygon points="308.3,70.7 245,0 202.6,51.9" fill="#222b60" stroke="#222b60" stroke-width="0.5"/><polygon points="0,490 0,525 42,538.2" fill="#1e2754" stroke="#1e2754" stroke-width="0.5"/><polygon points="42,538.2 70,600 105,600" fill="#252d69" stroke="#252d69" stroke-width="0.5"/><polygon points="385,600 400,600 400,595" fill="#0f1228" stroke="#0f1228" stroke-width="0.5"/><polygon points="400,105 400,70 351.8,55.5" fill="#1d2457" stroke="#1d2457" stroke-width="0.5"/><polygon points="0,105 0,140 46.6,158.8" fill="#12172f" stroke="#12172f" stroke-width="0.5"/><polygon points="35,600 70,600 42,538.2" fill="#242c68" stroke="#242c68" stroke-width="0.5"/><polygon points="0,525 0,560 42,538.2" fill="#222b60" stroke="#222b60" stroke-width="0.5"/><polygon points="0,560 35,600 42,538.2" fill="#20295b" stroke="#20295b" stroke-width="0.5"/><polygon points="154,55.9 40.3,71.5 163.8,137.1" fill="#171d3f" stroke="#171d3f" stroke-width="0.5"/><polygon points="40.3,71.5 0,105 46.6,158.8" fill="#12162f" stroke="#12162f" stroke-width="0.5"/><polygon points="202.6,51.9 175,0 154,55.9" fill="#1c244e" stroke="#1c244e" stroke-width="0.5"/><polygon points="154,55.9 105,0 40.3,71.5" fill="#171d3f" stroke="#171d3f" stroke-width="0.5"/><polygon points="280,0 245,0 308.3,70.7" fill="#232c64" stroke="#232c64" stroke-width="0.5"/><polygon points="280,0 308.3,70.7 315,0" fill="#242c69" stroke="#242c69" stroke-width="0.5"/><polygon points="245,0 210,0 202.6,51.9" fill="#20295a" stroke="#20295a" stroke-width="0.5"/><polygon points="315,0 308.3,70.7 351.8,55.5" fill="#242c67" stroke="#242c67" stroke-width="0.5"/><polygon points="400,70 400,35 351.8,55.5" fill="#20275e" stroke="#20275e" stroke-width="0.5"/><polygon points="210,0 175,0 202.6,51.9" fill="#1e2754" stroke="#1e2754" stroke-width="0.5"/><polygon points="350,0 315,0 351.8,55.5" fill="#242c66" stroke="#242c66" stroke-width="0.5"/><polygon points="0,560 0,595 35,600" fill="#222b60" stroke="#222b60" stroke-width="0.5"/><polygon points="175,0 140,0 154,55.9" fill="#182044" stroke="#182044" stroke-width="0.5"/><polygon points="385,0 350,0 351.8,55.5" fill="#1e255a" stroke="#1e255a" stroke-width="0.5"/><polygon points="0,595 0,600 35,600" fill="#212a5f" stroke="#212a5f" stroke-width="0.5"/><polygon points="0,35 0,70 40.3,71.5" fill="#11162d" stroke="#11162d" stroke-width="0.5"/><polygon points="40.3,71.5 0,70 0,105" fill="#0e1223" stroke="#0e1223" stroke-width="0.5"/><polygon points="140,0 105,0 154,55.9" fill="#171e40" stroke="#171e40" stroke-width="0.5"/><polygon points="400,35 385,0 351.8,55.5" fill="#1e255a" stroke="#1e255a" stroke-width="0.5"/><polygon points="400,35 400,0 385,0" fill="#1b2253" stroke="#1b2253" stroke-width="0.5"/><polygon points="105,0 70,0 40.3,71.5" fill="#101428" stroke="#101428" stroke-width="0.5"/><polygon points="35,0 0,35 40.3,71.5" fill="#0c0f1c" stroke="#0c0f1c" stroke-width="0.5"/><polygon points="70,0 35,0 40.3,71.5" fill="#12172f" stroke="#12172f" stroke-width="0.5"/><polygon points="35,0 0,0 0,35" fill="#0e1223" stroke="#0e1223" stroke-width="0.5"/>` },
  { id: 'amber-geo', label: 'Amber Geo', category: 'geometric', bg: '#1A1008', accent: '#D4A03C', text: '#F5ECD8', textMuted: '#A09070', qrDark: '#F5ECD8', qrLight: '#1A1008', decorations: false, borderStyle: 'none',
    patternViewBox: '0 0 400 600',
    patternSvg: `<polygon points="165.6,324.9 103.8,302.6 105.5,400.1" fill="#342410" stroke="#342410" stroke-width="0.5"/><polygon points="105.5,400.1 179.2,426.2 165.6,324.9" fill="#32220e" stroke="#32220e" stroke-width="0.5"/><polygon points="105.5,400.1 132.3,463.7 179.2,426.2" fill="#2b1b09" stroke="#2b1b09" stroke-width="0.5"/><polygon points="103.8,302.6 0,360 105.5,400.1" fill="#1b1108" stroke="#1b1108" stroke-width="0.5"/><polygon points="105.5,400.1 99.3,486.1 132.3,463.7" fill="#1d1208" stroke="#1d1208" stroke-width="0.5"/><polygon points="103.8,302.6 0,320 0,360" fill="#291908" stroke="#291908" stroke-width="0.5"/><polygon points="0,360 0,400 105.5,400.1" fill="#2b1a09" stroke="#2b1a09" stroke-width="0.5"/><polygon points="223,216.9 161.6,220.8 165.6,324.9" fill="#443016" stroke="#443016" stroke-width="0.5"/><polygon points="165.6,324.9 161.6,220.8 103.8,302.6" fill="#3d2b13" stroke="#3d2b13" stroke-width="0.5"/><polygon points="103.8,302.6 0,280 0,320" fill="#2c1b09" stroke="#2c1b09" stroke-width="0.5"/><polygon points="0,440 99.3,486.1 105.5,400.1" fill="#251609" stroke="#251609" stroke-width="0.5"/><polygon points="161.6,220.8 105.1,215.1 103.8,302.6" fill="#2f1f0b" stroke="#2f1f0b" stroke-width="0.5"/><polygon points="226.5,505.6 249.6,407.2 179.2,426.2" fill="#271808" stroke="#271808" stroke-width="0.5"/><polygon points="179.2,426.2 249.6,407.2 165.6,324.9" fill="#3e2c13" stroke="#3e2c13" stroke-width="0.5"/><polygon points="226.5,505.6 179.2,426.2 132.3,463.7" fill="#211408" stroke="#211408" stroke-width="0.5"/><polygon points="0,240 0,280 103.8,302.6" fill="#2a1a0a" stroke="#2a1a0a" stroke-width="0.5"/><polygon points="0,400 0,440 105.5,400.1" fill="#2c1b09" stroke="#2c1b09" stroke-width="0.5"/><polygon points="249.6,407.2 267.5,295.5 165.6,324.9" fill="#422f15" stroke="#422f15" stroke-width="0.5"/><polygon points="105.1,215.1 0,240 103.8,302.6" fill="#211409" stroke="#211409" stroke-width="0.5"/><polygon points="267.5,295.5 223,216.9 165.6,324.9" fill="#493418" stroke="#493418" stroke-width="0.5"/><polygon points="161.6,220.8 162.2,141 105.1,215.1" fill="#2b1b09" stroke="#2b1b09" stroke-width="0.5"/><polygon points="0,440 0,480 99.3,486.1" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="132.5,557.2 132.3,463.7 99.3,486.1" fill="#2a1a0a" stroke="#2a1a0a" stroke-width="0.5"/><polygon points="132.5,557.2 226.5,505.6 132.3,463.7" fill="#261709" stroke="#261709" stroke-width="0.5"/><polygon points="105.1,215.1 0,200 0,240" fill="#2c1b0a" stroke="#2c1b0a" stroke-width="0.5"/><polygon points="55.6,135 0,200 105.1,215.1" fill="#281809" stroke="#281809" stroke-width="0.5"/><polygon points="72.2,576.1 132.5,557.2 99.3,486.1" fill="#241507" stroke="#241507" stroke-width="0.5"/><polygon points="0,480 0,520 99.3,486.1" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="335.2,374.9 332,315.6 267.5,295.5" fill="#1e1308" stroke="#1e1308" stroke-width="0.5"/><polygon points="330.6,238.3 259.2,173.2 223,216.9" fill="#2e1e0b" stroke="#2e1e0b" stroke-width="0.5"/><polygon points="335.2,374.9 267.5,295.5 249.6,407.2" fill="#30200c" stroke="#30200c" stroke-width="0.5"/><polygon points="259.2,173.2 162.2,141 223,216.9" fill="#2f1f0b" stroke="#2f1f0b" stroke-width="0.5"/><polygon points="223,216.9 162.2,141 161.6,220.8" fill="#33230f" stroke="#33230f" stroke-width="0.5"/><polygon points="321.9,463.5 335.2,374.9 249.6,407.2" fill="#1d1208" stroke="#1d1208" stroke-width="0.5"/><polygon points="330.6,238.3 223,216.9 267.5,295.5" fill="#2d1d0a" stroke="#2d1d0a" stroke-width="0.5"/><polygon points="162.2,141 55.6,135 105.1,215.1" fill="#1f1308" stroke="#1f1308" stroke-width="0.5"/><polygon points="55.6,135 0,160 0,200" fill="#211306" stroke="#211306" stroke-width="0.5"/><polygon points="226.5,505.6 321.9,463.5 249.6,407.2" fill="#231608" stroke="#231608" stroke-width="0.5"/><polygon points="304.3,577.4 321.9,463.5 226.5,505.6" fill="#2b1a09" stroke="#2b1a09" stroke-width="0.5"/><polygon points="0,520 72.2,576.1 99.3,486.1" fill="#201305" stroke="#201305" stroke-width="0.5"/><polygon points="400,280 330.6,238.3 332,315.6" fill="#2c1b0a" stroke="#2c1b0a" stroke-width="0.5"/><polygon points="332,315.6 330.6,238.3 267.5,295.5" fill="#291908" stroke="#291908" stroke-width="0.5"/><polygon points="0,520 0,560 72.2,576.1" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="80,600 120,600 72.2,576.1" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="72.2,576.1 120,600 132.5,557.2" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="200,600 244.2,569.1 226.5,505.6" fill="#291908" stroke="#291908" stroke-width="0.5"/><polygon points="200,600 226.5,505.6 132.5,557.2" fill="#2b1a0a" stroke="#2b1a0a" stroke-width="0.5"/><polygon points="120,600 160,600 132.5,557.2" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="40,600 80,600 72.2,576.1" fill="#241507" stroke="#241507" stroke-width="0.5"/><polygon points="267.4,107.9 161,98.8 162.2,141" fill="#231508" stroke="#231508" stroke-width="0.5"/><polygon points="162.2,141 161,98.8 55.6,135" fill="#1d1208" stroke="#1d1208" stroke-width="0.5"/><polygon points="0,80 0,120 55.6,135" fill="#221406" stroke="#221406" stroke-width="0.5"/><polygon points="55.6,135 0,120 0,160" fill="#211306" stroke="#211306" stroke-width="0.5"/><polygon points="160,600 200,600 132.5,557.2" fill="#211306" stroke="#211306" stroke-width="0.5"/><polygon points="0,560 40,600 72.2,576.1" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="330.6,238.3 310.2,163.9 259.2,173.2" fill="#211408" stroke="#211408" stroke-width="0.5"/><polygon points="259.2,173.2 267.4,107.9 162.2,141" fill="#291908" stroke="#291908" stroke-width="0.5"/><polygon points="200,600 240,600 244.2,569.1" fill="#201205" stroke="#201205" stroke-width="0.5"/><polygon points="244.2,569.1 304.3,577.4 226.5,505.6" fill="#261707" stroke="#261707" stroke-width="0.5"/><polygon points="0,560 0,600 40,600" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="400,400 400,360 335.2,374.9" fill="#241607" stroke="#241607" stroke-width="0.5"/><polygon points="335.2,374.9 400,360 332,315.6" fill="#2c1b0a" stroke="#2c1b0a" stroke-width="0.5"/><polygon points="330.6,238.3 400,200 310.2,163.9" fill="#241609" stroke="#241609" stroke-width="0.5"/><polygon points="400,400 335.2,374.9 400,440" fill="#201305" stroke="#201305" stroke-width="0.5"/><polygon points="400,360 400,320 332,315.6" fill="#251607" stroke="#251607" stroke-width="0.5"/><polygon points="400,440 335.2,374.9 321.9,463.5" fill="#291908" stroke="#291908" stroke-width="0.5"/><polygon points="310.2,163.9 267.4,107.9 259.2,173.2" fill="#1b1108" stroke="#1b1108" stroke-width="0.5"/><polygon points="400,320 400,280 332,315.6" fill="#2d1b0a" stroke="#2d1b0a" stroke-width="0.5"/><polygon points="310.2,163.9 316.9,52.3 267.4,107.9" fill="#2c1b0a" stroke="#2c1b0a" stroke-width="0.5"/><polygon points="280,600 304.3,577.4 244.2,569.1" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="400,480 400,440 321.9,463.5" fill="#211306" stroke="#211306" stroke-width="0.5"/><polygon points="240,600 280,600 244.2,569.1" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="52.1,53.2 0,80 55.6,135" fill="#241507" stroke="#241507" stroke-width="0.5"/><polygon points="52.1,53.2 55.6,135 161,98.8" fill="#2c1b0a" stroke="#2c1b0a" stroke-width="0.5"/><polygon points="400,280 400,240 330.6,238.3" fill="#2a1909" stroke="#2a1909" stroke-width="0.5"/><polygon points="120,0 52.1,53.2 161,98.8" fill="#291908" stroke="#291908" stroke-width="0.5"/><polygon points="400,520 400,480 321.9,463.5" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="400,240 400,200 330.6,238.3" fill="#221406" stroke="#221406" stroke-width="0.5"/><polygon points="280,600 320,600 304.3,577.4" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="304.3,577.4 400,520 321.9,463.5" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="400,560 400,520 304.3,577.4" fill="#221406" stroke="#221406" stroke-width="0.5"/><polygon points="52.1,53.2 0,40 0,80" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="400,200 400,160 310.2,163.9" fill="#291808" stroke="#291808" stroke-width="0.5"/><polygon points="320,600 360,600 304.3,577.4" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="360,600 400,560 304.3,577.4" fill="#221406" stroke="#221406" stroke-width="0.5"/><polygon points="160,0 120,0 161,98.8" fill="#221406" stroke="#221406" stroke-width="0.5"/><polygon points="52.1,53.2 40,0 0,40" fill="#231506" stroke="#231506" stroke-width="0.5"/><polygon points="160,0 161,98.8 200,0" fill="#251607" stroke="#251607" stroke-width="0.5"/><polygon points="200,0 161,98.8 267.4,107.9" fill="#251709" stroke="#251709" stroke-width="0.5"/><polygon points="120,0 80,0 52.1,53.2" fill="#211306" stroke="#211306" stroke-width="0.5"/><polygon points="400,120 316.9,52.3 310.2,163.9" fill="#281808" stroke="#281808" stroke-width="0.5"/><polygon points="240,0 200,0 267.4,107.9" fill="#2a1a09" stroke="#2a1a09" stroke-width="0.5"/><polygon points="80,0 40,0 52.1,53.2" fill="#231506" stroke="#231506" stroke-width="0.5"/><polygon points="400,160 400,120 310.2,163.9" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="280,0 240,0 267.4,107.9" fill="#291908" stroke="#291908" stroke-width="0.5"/><polygon points="40,0 0,0 0,40" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="360,600 400,600 400,560" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="320,0 280,0 316.9,52.3" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="316.9,52.3 280,0 267.4,107.9" fill="#281808" stroke="#281808" stroke-width="0.5"/><polygon points="400,120 400,80 316.9,52.3" fill="#211306" stroke="#211306" stroke-width="0.5"/><polygon points="360,0 320,0 316.9,52.3" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="400,80 400,40 316.9,52.3" fill="#241507" stroke="#241507" stroke-width="0.5"/><polygon points="400,40 360,0 316.9,52.3" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/><polygon points="400,40 400,0 360,0" fill="#1f1205" stroke="#1f1205" stroke-width="0.5"/>` },
  { id: 'emerald-facets', label: 'Emerald Facets', category: 'geometric', bg: '#081A10', accent: '#50C878', text: '#D8F0E0', textMuted: '#5A9A70', qrDark: '#D8F0E0', qrLight: '#081A10', decorations: false, borderStyle: 'none',
    patternViewBox: '0 0 400 600',
    patternSvg: `<polygon points="213.3,312.9 227.3,276.7 177.1,257.9" fill="#174028" stroke="#174028" stroke-width="0.5"/><polygon points="177.1,257.9 112,308.4 213.3,312.9" fill="#19442c" stroke="#19442c" stroke-width="0.5"/><polygon points="139.8,257.5 112,308.4 177.1,257.9" fill="#174028" stroke="#174028" stroke-width="0.5"/><polygon points="196.6,381.6 234.9,368.3 213.3,312.9" fill="#1b4d32" stroke="#1b4d32" stroke-width="0.5"/><polygon points="213.3,312.9 283.2,327.2 227.3,276.7" fill="#19462e" stroke="#19462e" stroke-width="0.5"/><polygon points="227.3,276.7 191.8,192.3 177.1,257.9" fill="#153a22" stroke="#153a22" stroke-width="0.5"/><polygon points="177.1,257.9 191.8,192.3 139.8,257.5" fill="#153a22" stroke="#153a22" stroke-width="0.5"/><polygon points="112,308.4 196.6,381.6 213.3,312.9" fill="#1c4f33" stroke="#1c4f33" stroke-width="0.5"/><polygon points="234.9,368.3 283.2,327.2 213.3,312.9" fill="#1b4b31" stroke="#1b4b31" stroke-width="0.5"/><polygon points="227.3,276.7 229.6,170.3 191.8,192.3" fill="#163f27" stroke="#163f27" stroke-width="0.5"/><polygon points="70.8,214.7 90.2,264.1 139.8,257.5" fill="#174129" stroke="#174129" stroke-width="0.5"/><polygon points="139.8,257.5 90.2,264.1 112,308.4" fill="#18432b" stroke="#18432b" stroke-width="0.5"/><polygon points="191.8,192.3 130.5,186.4 139.8,257.5" fill="#153c24" stroke="#153c24" stroke-width="0.5"/><polygon points="302,171.9 229.6,170.3 227.3,276.7" fill="#143820" stroke="#143820" stroke-width="0.5"/><polygon points="191.8,192.3 138.7,133.9 130.5,186.4" fill="#11301c" stroke="#11301c" stroke-width="0.5"/><polygon points="90.2,264.1 82.1,332.7 112,308.4" fill="#19462e" stroke="#19462e" stroke-width="0.5"/><polygon points="112,308.4 109,393.9 196.6,381.6" fill="#1e5637" stroke="#1e5637" stroke-width="0.5"/><polygon points="229.6,170.3 210.1,155.1 191.8,192.3" fill="#13351f" stroke="#13351f" stroke-width="0.5"/><polygon points="327.4,405.9 322.8,337.3 283.2,327.2" fill="#1c5235" stroke="#1c5235" stroke-width="0.5"/><polygon points="283.2,327.2 336.6,262.2 227.3,276.7" fill="#1b4b31" stroke="#1b4b31" stroke-width="0.5"/><polygon points="82.1,332.7 109,393.9 112,308.4" fill="#1b4e33" stroke="#1b4e33" stroke-width="0.5"/><polygon points="322.8,337.3 336.6,262.2 283.2,327.2" fill="#1b4a31" stroke="#1b4a31" stroke-width="0.5"/><polygon points="130.5,186.4 70.8,214.7 139.8,257.5" fill="#163e26" stroke="#163e26" stroke-width="0.5"/><polygon points="90.2,264.1 0,288 82.1,332.7" fill="#1a4830" stroke="#1a4830" stroke-width="0.5"/><polygon points="82.1,332.7 69.3,364.3 109,393.9" fill="#1d5536" stroke="#1d5536" stroke-width="0.5"/><polygon points="0,320 69.3,364.3 82.1,332.7" fill="#1c5135" stroke="#1c5135" stroke-width="0.5"/><polygon points="336.6,262.2 302,171.9 227.3,276.7" fill="#163e26" stroke="#163e26" stroke-width="0.5"/><polygon points="229.6,170.3 236.1,105.6 210.1,155.1" fill="#102d1b" stroke="#102d1b" stroke-width="0.5"/><polygon points="210.1,155.1 138.7,133.9 191.8,192.3" fill="#12321d" stroke="#12321d" stroke-width="0.5"/><polygon points="130.5,186.4 77.1,148.2 70.8,214.7" fill="#143720" stroke="#143720" stroke-width="0.5"/><polygon points="236.1,105.6 138.7,133.9 210.1,155.1" fill="#0f2c1a" stroke="#0f2c1a" stroke-width="0.5"/><polygon points="214.5,466.5 281.8,429.1 234.9,368.3" fill="#1d5536" stroke="#1d5536" stroke-width="0.5"/><polygon points="234.9,368.3 327.4,405.9 283.2,327.2" fill="#1d5436" stroke="#1d5436" stroke-width="0.5"/><polygon points="214.5,466.5 234.9,368.3 196.6,381.6" fill="#1d5435" stroke="#1d5435" stroke-width="0.5"/><polygon points="281.8,429.1 327.4,405.9 234.9,368.3" fill="#1e5738" stroke="#1e5738" stroke-width="0.5"/><polygon points="400,288 395.4,255.1 336.6,262.2" fill="#174129" stroke="#174129" stroke-width="0.5"/><polygon points="138.7,133.9 77.1,148.2 130.5,186.4" fill="#12321d" stroke="#12321d" stroke-width="0.5"/><polygon points="134.6,470.9 214.5,466.5 196.6,381.6" fill="#1d5435" stroke="#1d5435" stroke-width="0.5"/><polygon points="281.8,429.1 344.3,424.6 327.4,405.9" fill="#1b4d30" stroke="#1b4d30" stroke-width="0.5"/><polygon points="302,171.9 236.1,105.6 229.6,170.3" fill="#12331e" stroke="#12331e" stroke-width="0.5"/><polygon points="138.7,133.9 124.3,59.1 77.1,148.2" fill="#0e2818" stroke="#0e2818" stroke-width="0.5"/><polygon points="327.4,405.9 365.6,374.8 322.8,337.3" fill="#1c5034" stroke="#1c5034" stroke-width="0.5"/><polygon points="88.9,473.2 134.6,470.9 109,393.9" fill="#18462c" stroke="#18462c" stroke-width="0.5"/><polygon points="109,393.9 134.6,470.9 196.6,381.6" fill="#1e5838" stroke="#1e5838" stroke-width="0.5"/><polygon points="0,256 90.2,264.1 70.8,214.7" fill="#163d25" stroke="#163d25" stroke-width="0.5"/><polygon points="0,256 0,288 90.2,264.1" fill="#174129" stroke="#174129" stroke-width="0.5"/><polygon points="0,416 88.9,473.2 109,393.9" fill="#1c5234" stroke="#1c5234" stroke-width="0.5"/><polygon points="0,224 0,256 70.8,214.7" fill="#153a22" stroke="#153a22" stroke-width="0.5"/><polygon points="0,288 0,320 82.1,332.7" fill="#1b4a31" stroke="#1b4a31" stroke-width="0.5"/><polygon points="380.4,164.8 341.7,146.1 302,171.9" fill="#102e1b" stroke="#102e1b" stroke-width="0.5"/><polygon points="302,171.9 341.7,146.1 236.1,105.6" fill="#11311c" stroke="#11311c" stroke-width="0.5"/><polygon points="380.4,164.8 302,171.9 336.6,262.2" fill="#12331e" stroke="#12331e" stroke-width="0.5"/><polygon points="400,288 336.6,262.2 398.8,320.3" fill="#1a4830" stroke="#1a4830" stroke-width="0.5"/><polygon points="327.4,405.9 344.3,424.6 365.6,374.8" fill="#1e5637" stroke="#1e5637" stroke-width="0.5"/><polygon points="358.8,433.3 344.3,424.6 340.7,506.1" fill="#1a4c2f" stroke="#1a4c2f" stroke-width="0.5"/><polygon points="398.8,320.3 336.6,262.2 322.8,337.3" fill="#19462e" stroke="#19462e" stroke-width="0.5"/><polygon points="0,192 0,224 70.8,214.7" fill="#13351f" stroke="#13351f" stroke-width="0.5"/><polygon points="365.6,374.8 398.8,320.3 322.8,337.3" fill="#1c4f33" stroke="#1c4f33" stroke-width="0.5"/><polygon points="400,320 398.8,320.3 400,352" fill="#1c5135" stroke="#1c5135" stroke-width="0.5"/><polygon points="400,288 400,256 395.4,255.1" fill="#163e26" stroke="#163e26" stroke-width="0.5"/><polygon points="395.4,255.1 400,224 336.6,262.2" fill="#163d25" stroke="#163d25" stroke-width="0.5"/><polygon points="0,320 0,352 69.3,364.3" fill="#1c5135" stroke="#1c5135" stroke-width="0.5"/><polygon points="343,51.4 229.7,80.7 236.1,105.6" fill="#0d2617" stroke="#0d2617" stroke-width="0.5"/><polygon points="236.1,105.6 229.7,80.7 138.7,133.9" fill="#0f2b1a" stroke="#0f2b1a" stroke-width="0.5"/><polygon points="398.8,320.3 400,320 400,288" fill="#1a472f" stroke="#1a472f" stroke-width="0.5"/><polygon points="400,352 398.8,320.3 365.6,374.8" fill="#1c4f34" stroke="#1c4f34" stroke-width="0.5"/><polygon points="400,256 400,224 395.4,255.1" fill="#163d25" stroke="#163d25" stroke-width="0.5"/><polygon points="400,384 400,352 365.6,374.8" fill="#1e5838" stroke="#1e5838" stroke-width="0.5"/><polygon points="0,416 109,393.9 69.3,364.3" fill="#1d5637" stroke="#1d5637" stroke-width="0.5"/><polygon points="77.1,148.2 0,192 70.8,214.7" fill="#14371f" stroke="#14371f" stroke-width="0.5"/><polygon points="0,352 0,384 69.3,364.3" fill="#1e5637" stroke="#1e5637" stroke-width="0.5"/><polygon points="340.7,506.1 344.3,424.6 281.8,429.1" fill="#19472d" stroke="#19472d" stroke-width="0.5"/><polygon points="344.3,424.6 358.8,433.3 365.6,374.8" fill="#1d5537" stroke="#1d5537" stroke-width="0.5"/><polygon points="400,224 380.4,164.8 336.6,262.2" fill="#163d25" stroke="#163d25" stroke-width="0.5"/><polygon points="341.7,146.1 343,51.4 236.1,105.6" fill="#0e2718" stroke="#0e2718" stroke-width="0.5"/><polygon points="400,224 400,192 380.4,164.8" fill="#13351f" stroke="#13351f" stroke-width="0.5"/><polygon points="126.5,523.8 212.8,510.5 134.6,470.9" fill="#123520" stroke="#123520" stroke-width="0.5"/><polygon points="134.6,470.9 212.8,510.5 214.5,466.5" fill="#133721" stroke="#133721" stroke-width="0.5"/><polygon points="214.5,466.5 267.4,507.3 281.8,429.1" fill="#17432a" stroke="#17432a" stroke-width="0.5"/><polygon points="400,416 400,384 365.6,374.8" fill="#1d5537" stroke="#1d5537" stroke-width="0.5"/><polygon points="0,128 0,160 77.1,148.2" fill="#12321d" stroke="#12321d" stroke-width="0.5"/><polygon points="77.1,148.2 0,160 0,192" fill="#12321d" stroke="#12321d" stroke-width="0.5"/><polygon points="212.8,510.5 267.4,507.3 214.5,466.5" fill="#123520" stroke="#123520" stroke-width="0.5"/><polygon points="0,384 0,416 69.3,364.3" fill="#1e5838" stroke="#1e5838" stroke-width="0.5"/><polygon points="185.6,38.3 124.3,59.1 138.7,133.9" fill="#0d2617" stroke="#0d2617" stroke-width="0.5"/><polygon points="400,192 400,160 380.4,164.8" fill="#13361f" stroke="#13361f" stroke-width="0.5"/><polygon points="380.4,164.8 400,128 341.7,146.1" fill="#11311d" stroke="#11311d" stroke-width="0.5"/><polygon points="400,448 400,416 358.8,433.3" fill="#1d5536" stroke="#1d5536" stroke-width="0.5"/><polygon points="358.8,433.3 400,416 365.6,374.8" fill="#1e5838" stroke="#1e5838" stroke-width="0.5"/><polygon points="229.7,80.7 185.6,38.3 138.7,133.9" fill="#0c2516" stroke="#0c2516" stroke-width="0.5"/><polygon points="192,0 185.6,38.3 224,0" fill="#0b2315" stroke="#0b2315" stroke-width="0.5"/><polygon points="88.9,473.2 126.5,523.8 134.6,470.9" fill="#143722" stroke="#143722" stroke-width="0.5"/><polygon points="257.5,584.7 311.5,567 267.4,507.3" fill="#0e2d1a" stroke="#0e2d1a" stroke-width="0.5"/><polygon points="50.8,492.6 126.5,523.8 88.9,473.2" fill="#133721" stroke="#133721" stroke-width="0.5"/><polygon points="35.3,74 0,128 77.1,148.2" fill="#0f2a19" stroke="#0f2a19" stroke-width="0.5"/><polygon points="0,448 50.8,492.6 88.9,473.2" fill="#174028" stroke="#174028" stroke-width="0.5"/><polygon points="0,416 0,448 88.9,473.2" fill="#19482d" stroke="#19482d" stroke-width="0.5"/><polygon points="400,160 400,128 380.4,164.8" fill="#13341e" stroke="#13341e" stroke-width="0.5"/><polygon points="400,128 365.4,91.1 341.7,146.1" fill="#0e2919" stroke="#0e2919" stroke-width="0.5"/><polygon points="400,480 400,448 358.8,433.3" fill="#174229" stroke="#174229" stroke-width="0.5"/><polygon points="373.9,516.1 340.7,506.1 311.5,567" fill="#10311d" stroke="#10311d" stroke-width="0.5"/><polygon points="267.4,507.3 340.7,506.1 281.8,429.1" fill="#153a24" stroke="#153a24" stroke-width="0.5"/><polygon points="124.3,59.1 35.3,74 77.1,148.2" fill="#0e2919" stroke="#0e2919" stroke-width="0.5"/><polygon points="64,0 35.3,74 124.3,59.1" fill="#0d2617" stroke="#0d2617" stroke-width="0.5"/><polygon points="400,128 399,110.2 365.4,91.1" fill="#0d2717" stroke="#0d2717" stroke-width="0.5"/><polygon points="35.3,74 0,96 0,128" fill="#102d1a" stroke="#102d1a" stroke-width="0.5"/><polygon points="0,448 0,480 50.8,492.6" fill="#153a24" stroke="#153a24" stroke-width="0.5"/><polygon points="128,600 153.6,566.8 126.5,523.8" fill="#0f2f1c" stroke="#0f2f1c" stroke-width="0.5"/><polygon points="400,64 343,51.4 365.4,91.1" fill="#0c2416" stroke="#0c2416" stroke-width="0.5"/><polygon points="365.4,91.1 343,51.4 341.7,146.1" fill="#0d2617" stroke="#0d2617" stroke-width="0.5"/><polygon points="400,128 400,96 399,110.2" fill="#102e1b" stroke="#102e1b" stroke-width="0.5"/><polygon points="399,110.2 400,96 365.4,91.1" fill="#0f2b1a" stroke="#0f2b1a" stroke-width="0.5"/><polygon points="340.7,506.1 400,480 358.8,433.3" fill="#163f27" stroke="#163f27" stroke-width="0.5"/><polygon points="63.6,571.8 126.5,523.8 50.8,492.6" fill="#10321d" stroke="#10321d" stroke-width="0.5"/><polygon points="126.5,523.8 153.6,566.8 212.8,510.5" fill="#10311d" stroke="#10311d" stroke-width="0.5"/><polygon points="224,0 185.6,38.3 229.7,80.7" fill="#0c2416" stroke="#0c2416" stroke-width="0.5"/><polygon points="185.6,38.3 160,0 124.3,59.1" fill="#0c2316" stroke="#0c2316" stroke-width="0.5"/><polygon points="256,0 224,0 229.7,80.7" fill="#0a2114" stroke="#0a2114" stroke-width="0.5"/><polygon points="192,0 160,0 185.6,38.3" fill="#0b2215" stroke="#0b2215" stroke-width="0.5"/><polygon points="288,0 256,0 229.7,80.7" fill="#0c2416" stroke="#0c2416" stroke-width="0.5"/><polygon points="311.5,567 340.7,506.1 267.4,507.3" fill="#133621" stroke="#133621" stroke-width="0.5"/><polygon points="340.7,506.1 373.9,516.1 400,480" fill="#123520" stroke="#123520" stroke-width="0.5"/><polygon points="160,0 128,0 124.3,59.1" fill="#0b2315" stroke="#0b2315" stroke-width="0.5"/><polygon points="35.3,74 0,64 0,96" fill="#0d2617" stroke="#0d2617" stroke-width="0.5"/><polygon points="0,32 0,64 35.3,74" fill="#0d2617" stroke="#0d2617" stroke-width="0.5"/><polygon points="0,480 0,512 50.8,492.6" fill="#143923" stroke="#143923" stroke-width="0.5"/><polygon points="320,0 288,0 343,51.4" fill="#0c2416" stroke="#0c2416" stroke-width="0.5"/><polygon points="343,51.4 288,0 229.7,80.7" fill="#0b2315" stroke="#0b2315" stroke-width="0.5"/><polygon points="400,96 400,64 365.4,91.1" fill="#0d2517" stroke="#0d2517" stroke-width="0.5"/><polygon points="128,0 96,0 124.3,59.1" fill="#0c2316" stroke="#0c2316" stroke-width="0.5"/><polygon points="257.5,584.7 267.4,507.3 212.8,510.5" fill="#133721" stroke="#133721" stroke-width="0.5"/><polygon points="373.9,516.1 400,512 400,480" fill="#11341f" stroke="#11341f" stroke-width="0.5"/><polygon points="400,544 400,512 373.9,516.1" fill="#11321e" stroke="#11321e" stroke-width="0.5"/><polygon points="224,600 257.5,584.7 212.8,510.5" fill="#0d2d1a" stroke="#0d2d1a" stroke-width="0.5"/><polygon points="192,600 194.9,592.5 160,600" fill="#0c2a18" stroke="#0c2a18" stroke-width="0.5"/><polygon points="153.6,566.8 194.9,592.5 212.8,510.5" fill="#0d2c19" stroke="#0d2c19" stroke-width="0.5"/><polygon points="352,0 320,0 343,51.4" fill="#0b2215" stroke="#0b2215" stroke-width="0.5"/><polygon points="96,0 64,0 124.3,59.1" fill="#0a2114" stroke="#0a2114" stroke-width="0.5"/><polygon points="160,600 194.9,592.5 153.6,566.8" fill="#0d2c19" stroke="#0d2c19" stroke-width="0.5"/><polygon points="194.9,592.5 224,600 212.8,510.5" fill="#11321e" stroke="#11321e" stroke-width="0.5"/><polygon points="0,544 63.6,571.8 50.8,492.6" fill="#133620" stroke="#133620" stroke-width="0.5"/><polygon points="192,600 224,600 194.9,592.5" fill="#0c2a18" stroke="#0c2a18" stroke-width="0.5"/><polygon points="257.5,584.7 288,600 311.5,567" fill="#0d2c19" stroke="#0d2c19" stroke-width="0.5"/><polygon points="128,600 160,600 153.6,566.8" fill="#0f2f1c" stroke="#0f2f1c" stroke-width="0.5"/><polygon points="32,0 0,32 35.3,74" fill="#0a2114" stroke="#0a2114" stroke-width="0.5"/><polygon points="224,600 256,600 257.5,584.7" fill="#0d2b19" stroke="#0d2b19" stroke-width="0.5"/><polygon points="96,600 128,600 126.5,523.8" fill="#10311d" stroke="#10311d" stroke-width="0.5"/><polygon points="0,512 0,544 50.8,492.6" fill="#133620" stroke="#133620" stroke-width="0.5"/><polygon points="63.6,571.8 96,600 126.5,523.8" fill="#0e2d1a" stroke="#0e2d1a" stroke-width="0.5"/><polygon points="400,32 352,0 343,51.4" fill="#0b2315" stroke="#0b2315" stroke-width="0.5"/><polygon points="400,64 400,32 343,51.4" fill="#0d2517" stroke="#0d2517" stroke-width="0.5"/><polygon points="256,600 288,600 257.5,584.7" fill="#0e2e1b" stroke="#0e2e1b" stroke-width="0.5"/><polygon points="379.2,573.8 400,544 373.9,516.1" fill="#11331f" stroke="#11331f" stroke-width="0.5"/><polygon points="64,0 32,0 35.3,74" fill="#0c2416" stroke="#0c2416" stroke-width="0.5"/><polygon points="379.2,573.8 373.9,516.1 311.5,567" fill="#0e2d1a" stroke="#0e2d1a" stroke-width="0.5"/><polygon points="64,600 96,600 63.6,571.8" fill="#0d2c1a" stroke="#0d2c1a" stroke-width="0.5"/><polygon points="288,600 320,600 311.5,567" fill="#0f2e1b" stroke="#0f2e1b" stroke-width="0.5"/><polygon points="32,600 64,600 63.6,571.8" fill="#0c2a18" stroke="#0c2a18" stroke-width="0.5"/><polygon points="400,32 384,0 352,0" fill="#0b2215" stroke="#0b2215" stroke-width="0.5"/><polygon points="352,600 379.2,573.8 311.5,567" fill="#0d2b19" stroke="#0d2b19" stroke-width="0.5"/><polygon points="32,0 0,0 0,32" fill="#0a2014" stroke="#0a2014" stroke-width="0.5"/><polygon points="0,544 0,576 63.6,571.8" fill="#0f301c" stroke="#0f301c" stroke-width="0.5"/><polygon points="400,32 400,0 384,0" fill="#0c2316" stroke="#0c2316" stroke-width="0.5"/><polygon points="320,600 352,600 311.5,567" fill="#0e2d1a" stroke="#0e2d1a" stroke-width="0.5"/><polygon points="0,576 32,600 63.6,571.8" fill="#0d2b19" stroke="#0d2b19" stroke-width="0.5"/><polygon points="384,600 400,576 379.2,573.8" fill="#0d2c1a" stroke="#0d2c1a" stroke-width="0.5"/><polygon points="379.2,573.8 400,576 400,544" fill="#0e2d1a" stroke="#0e2d1a" stroke-width="0.5"/><polygon points="352,600 384,600 379.2,573.8" fill="#0d2c1a" stroke="#0d2c1a" stroke-width="0.5"/><polygon points="0,576 0,600 32,600" fill="#0f2f1c" stroke="#0f2f1c" stroke-width="0.5"/><polygon points="384,600 400,600 400,576" fill="#0d2c1a" stroke="#0d2c1a" stroke-width="0.5"/>` },
  { id: 'rose-quartz', label: 'Rose Quartz', category: 'geometric', bg: '#1A0E14', accent: '#E8A0B8', text: '#F5E0EA', textMuted: '#A07088', qrDark: '#F5E0EA', qrLight: '#1A0E14', decorations: false, borderStyle: 'none',
    patternViewBox: '0 0 400 600',
    patternSvg: `<polygon points="178.4,347.3 176.9,418.2 246.2,345.9" fill="#492437" stroke="#492437" stroke-width="0.5"/><polygon points="176.9,418.2 269.8,432.1 246.2,345.9" fill="#4a2538" stroke="#4a2538" stroke-width="0.5"/><polygon points="269.8,432.1 307.1,415 246.2,345.9" fill="#482336" stroke="#482336" stroke-width="0.5"/><polygon points="307.1,415 327.5,356.9 246.2,345.9" fill="#482336" stroke="#482336" stroke-width="0.5"/><polygon points="327.5,356.9 266.3,274.3 246.2,345.9" fill="#462335" stroke="#462335" stroke-width="0.5"/><polygon points="246.2,345.9 266.3,274.3 178.4,347.3" fill="#472336" stroke="#472336" stroke-width="0.5"/><polygon points="176.9,418.2 255.1,506.8 269.8,432.1" fill="#3f1f2f" stroke="#3f1f2f" stroke-width="0.5"/><polygon points="269.8,432.1 360.7,511.6 307.1,415" fill="#472336" stroke="#472336" stroke-width="0.5"/><polygon points="114.3,273.2 77.5,362 178.4,347.3" fill="#391c2b" stroke="#391c2b" stroke-width="0.5"/><polygon points="178.4,347.3 77.5,362 176.9,418.2" fill="#361b29" stroke="#361b29" stroke-width="0.5"/><polygon points="176.9,418.2 182,534.2 255.1,506.8" fill="#422132" stroke="#422132" stroke-width="0.5"/><polygon points="166.3,242.9 114.3,273.2 178.4,347.3" fill="#402030" stroke="#402030" stroke-width="0.5"/><polygon points="266.3,274.3 166.3,242.9 178.4,347.3" fill="#462335" stroke="#462335" stroke-width="0.5"/><polygon points="75.8,504.3 182,534.2 176.9,418.2" fill="#341a28" stroke="#341a28" stroke-width="0.5"/><polygon points="0,378 56.2,397.9 77.5,362" fill="#2b1824" stroke="#2b1824" stroke-width="0.5"/><polygon points="77.5,362 56.2,397.9 176.9,418.2" fill="#361b29" stroke="#361b29" stroke-width="0.5"/><polygon points="327.5,356.9 305.2,234.8 266.3,274.3" fill="#3e1d2e" stroke="#3e1d2e" stroke-width="0.5"/><polygon points="266.3,274.3 277,180.6 166.3,242.9" fill="#442133" stroke="#442133" stroke-width="0.5"/><polygon points="182,534.2 229.6,563.9 255.1,506.8" fill="#351a28" stroke="#351a28" stroke-width="0.5"/><polygon points="400,420 327.5,356.9 307.1,415" fill="#3f1d2f" stroke="#3f1d2f" stroke-width="0.5"/><polygon points="56.2,397.9 75.8,504.3 176.9,418.2" fill="#331a27" stroke="#331a27" stroke-width="0.5"/><polygon points="182,534.2 177.3,570.7 229.6,563.9" fill="#341a27" stroke="#341a27" stroke-width="0.5"/><polygon points="400,420 400,378 327.5,356.9" fill="#411f31" stroke="#411f31" stroke-width="0.5"/><polygon points="327.5,356.9 400,294 305.2,234.8" fill="#3e1d2e" stroke="#3e1d2e" stroke-width="0.5"/><polygon points="400,420 307.1,415 400,462" fill="#411e30" stroke="#411e30" stroke-width="0.5"/><polygon points="360.7,511.6 269.8,432.1 255.1,506.8" fill="#472436" stroke="#472436" stroke-width="0.5"/><polygon points="126,600 177.3,570.7 182,534.2" fill="#301926" stroke="#301926" stroke-width="0.5"/><polygon points="400,378 400,336 327.5,356.9" fill="#3d1c2e" stroke="#3d1c2e" stroke-width="0.5"/><polygon points="306.2,599 360.7,511.6 255.1,506.8" fill="#492437" stroke="#492437" stroke-width="0.5"/><polygon points="360.7,511.6 400,462 307.1,415" fill="#452134" stroke="#452134" stroke-width="0.5"/><polygon points="400,336 400,294 327.5,356.9" fill="#3c1c2d" stroke="#3c1c2d" stroke-width="0.5"/><polygon points="334.4,160 277,180.6 305.2,234.8" fill="#381a2a" stroke="#381a2a" stroke-width="0.5"/><polygon points="305.2,234.8 277,180.6 266.3,274.3" fill="#401e30" stroke="#401e30" stroke-width="0.5"/><polygon points="0,336 0,378 77.5,362" fill="#2d1824" stroke="#2d1824" stroke-width="0.5"/><polygon points="56.2,397.9 0,462 75.8,504.3" fill="#291621" stroke="#291621" stroke-width="0.5"/><polygon points="0,378 0,420 56.2,397.9" fill="#291621" stroke="#291621" stroke-width="0.5"/><polygon points="177.3,570.7 210,600 229.6,563.9" fill="#351a28" stroke="#351a28" stroke-width="0.5"/><polygon points="229.6,563.9 294,600 255.1,506.8" fill="#462335" stroke="#462335" stroke-width="0.5"/><polygon points="168,600 210,600 177.3,570.7" fill="#351a28" stroke="#351a28" stroke-width="0.5"/><polygon points="0,294 0,336 77.5,362" fill="#2d1824" stroke="#2d1824" stroke-width="0.5"/><polygon points="0,294 77.5,362 114.3,273.2" fill="#331a27" stroke="#331a27" stroke-width="0.5"/><polygon points="0,294 114.3,273.2 0,252" fill="#351a28" stroke="#351a28" stroke-width="0.5"/><polygon points="210,600 252,600 229.6,563.9" fill="#391c2b" stroke="#391c2b" stroke-width="0.5"/><polygon points="126,600 168,600 177.3,570.7" fill="#311926" stroke="#311926" stroke-width="0.5"/><polygon points="400,546 400,504 360.7,511.6" fill="#3f1d2f" stroke="#3f1d2f" stroke-width="0.5"/><polygon points="360.7,511.6 400,504 400,462" fill="#3f1d2f" stroke="#3f1d2f" stroke-width="0.5"/><polygon points="0,420 0,462 56.2,397.9" fill="#291621" stroke="#291621" stroke-width="0.5"/><polygon points="75.8,504.3 126,600 182,534.2" fill="#301926" stroke="#301926" stroke-width="0.5"/><polygon points="400,294 400,252 305.2,234.8" fill="#3c1c2d" stroke="#3c1c2d" stroke-width="0.5"/><polygon points="66.1,137 114.3,273.2 166.3,242.9" fill="#3a1d2c" stroke="#3a1d2c" stroke-width="0.5"/><polygon points="252,600 294,600 229.6,563.9" fill="#422132" stroke="#422132" stroke-width="0.5"/><polygon points="84,600 126,600 75.8,504.3" fill="#26151e" stroke="#26151e" stroke-width="0.5"/><polygon points="294,600 306.2,599 255.1,506.8" fill="#3d1e2e" stroke="#3d1e2e" stroke-width="0.5"/><polygon points="277,180.6 171.1,151.7 166.3,242.9" fill="#421f31" stroke="#421f31" stroke-width="0.5"/><polygon points="0,462 0,504 75.8,504.3" fill="#291621" stroke="#291621" stroke-width="0.5"/><polygon points="336,600 400,546 360.7,511.6" fill="#442133" stroke="#442133" stroke-width="0.5"/><polygon points="306.2,599 336,600 360.7,511.6" fill="#492437" stroke="#492437" stroke-width="0.5"/><polygon points="294,600 336,600 306.2,599" fill="#422132" stroke="#422132" stroke-width="0.5"/><polygon points="0,210 0,252 114.3,273.2" fill="#321927" stroke="#321927" stroke-width="0.5"/><polygon points="63,590.1 84,600 75.8,504.3" fill="#2b1723" stroke="#2b1723" stroke-width="0.5"/><polygon points="400,210 334.4,160 305.2,234.8" fill="#3c1c2d" stroke="#3c1c2d" stroke-width="0.5"/><polygon points="277,180.6 226.6,80 171.1,151.7" fill="#421f31" stroke="#421f31" stroke-width="0.5"/><polygon points="400,252 400,210 305.2,234.8" fill="#391a2b" stroke="#391a2b" stroke-width="0.5"/><polygon points="0,546 63,590.1 75.8,504.3" fill="#271520" stroke="#271520" stroke-width="0.5"/><polygon points="0,504 0,546 75.8,504.3" fill="#20121a" stroke="#20121a" stroke-width="0.5"/><polygon points="336,600 378,600 400,546" fill="#472335" stroke="#472335" stroke-width="0.5"/><polygon points="66.1,137 0,210 114.3,273.2" fill="#381b2a" stroke="#381b2a" stroke-width="0.5"/><polygon points="0,546 42,600 63,590.1" fill="#24131d" stroke="#24131d" stroke-width="0.5"/><polygon points="63,590.1 42,600 84,600" fill="#26151f" stroke="#26151f" stroke-width="0.5"/><polygon points="378,600 400,588 400,546" fill="#421f32" stroke="#421f32" stroke-width="0.5"/><polygon points="400,210 400,168 334.4,160" fill="#331726" stroke="#331726" stroke-width="0.5"/><polygon points="378,600 400,600 400,588" fill="#432032" stroke="#432032" stroke-width="0.5"/><polygon points="52.9,103.3 66.1,137 171.1,151.7" fill="#4a2538" stroke="#4a2538" stroke-width="0.5"/><polygon points="171.1,151.7 66.1,137 166.3,242.9" fill="#492538" stroke="#492538" stroke-width="0.5"/><polygon points="0,546 0,588 42,600" fill="#22131b" stroke="#22131b" stroke-width="0.5"/><polygon points="66.1,137 0,168 0,210" fill="#321927" stroke="#321927" stroke-width="0.5"/><polygon points="0,588 0,600 42,600" fill="#1c0f15" stroke="#1c0f15" stroke-width="0.5"/><polygon points="353.4,104.9 226.6,80 334.4,160" fill="#391a2b" stroke="#391a2b" stroke-width="0.5"/><polygon points="334.4,160 226.6,80 277,180.6" fill="#3e1d2f" stroke="#3e1d2f" stroke-width="0.5"/><polygon points="400,126 353.4,104.9 334.4,160" fill="#311625" stroke="#311625" stroke-width="0.5"/><polygon points="210,0 198.1,70.2 226.6,80" fill="#421f32" stroke="#421f32" stroke-width="0.5"/><polygon points="226.6,80 198.1,70.2 171.1,151.7" fill="#442033" stroke="#442033" stroke-width="0.5"/><polygon points="66.1,137 0,126 0,168" fill="#321927" stroke="#321927" stroke-width="0.5"/><polygon points="400,168 400,126 334.4,160" fill="#351828" stroke="#351828" stroke-width="0.5"/><polygon points="198.1,70.2 52.9,103.3 171.1,151.7" fill="#462235" stroke="#462235" stroke-width="0.5"/><polygon points="52.9,103.3 0,126 66.1,137" fill="#391c2b" stroke="#391c2b" stroke-width="0.5"/><polygon points="400,126 400,84 353.4,104.9" fill="#341827" stroke="#341827" stroke-width="0.5"/><polygon points="252,0 210,0 226.6,80" fill="#3d1c2e" stroke="#3d1c2e" stroke-width="0.5"/><polygon points="0,42 0,84 52.9,103.3" fill="#341a28" stroke="#341a28" stroke-width="0.5"/><polygon points="52.9,103.3 0,84 0,126" fill="#361b29" stroke="#361b29" stroke-width="0.5"/><polygon points="252,0 226.6,80 294,0" fill="#37192a" stroke="#37192a" stroke-width="0.5"/><polygon points="198.1,70.2 126,0 52.9,103.3" fill="#462235" stroke="#462235" stroke-width="0.5"/><polygon points="294,0 226.6,80 353.4,104.9" fill="#391a2b" stroke="#391a2b" stroke-width="0.5"/><polygon points="210,0 168,0 198.1,70.2" fill="#3c1c2d" stroke="#3c1c2d" stroke-width="0.5"/><polygon points="400,84 400,42 353.4,104.9" fill="#2b1421" stroke="#2b1421" stroke-width="0.5"/><polygon points="336,0 294,0 353.4,104.9" fill="#301625" stroke="#301625" stroke-width="0.5"/><polygon points="168,0 126,0 198.1,70.2" fill="#3e1d2f" stroke="#3e1d2f" stroke-width="0.5"/><polygon points="42,0 0,42 52.9,103.3" fill="#3b1d2d" stroke="#3b1d2d" stroke-width="0.5"/><polygon points="400,42 336,0 353.4,104.9" fill="#301624" stroke="#301624" stroke-width="0.5"/><polygon points="126,0 84,0 52.9,103.3" fill="#482336" stroke="#482336" stroke-width="0.5"/><polygon points="400,42 378,0 336,0" fill="#2d1522" stroke="#2d1522" stroke-width="0.5"/><polygon points="84,0 42,0 52.9,103.3" fill="#472336" stroke="#472336" stroke-width="0.5"/><polygon points="400,42 400,0 378,0" fill="#2a1420" stroke="#2a1420" stroke-width="0.5"/><polygon points="42,0 0,0 0,42" fill="#3c1e2d" stroke="#3c1e2d" stroke-width="0.5"/>` },
  { id: 'ice-crystal', label: 'Ice Crystal', category: 'geometric', bg: '#E8F0F8', accent: '#4A8AB5', text: '#0A1A2A', textMuted: '#5A7A9A', qrDark: '#0A1A2A', qrLight: '#E8F0F8', decorations: false, borderStyle: 'none',
    patternViewBox: '0 0 400 600',
    patternSvg: `<polygon points="217.5,269 261.5,240.5 223.1,212.9" fill="#cee8f9" stroke="#cee8f9" stroke-width="0.5"/><polygon points="261.5,240.5 225.9,171.9 223.1,212.9" fill="#d2ebf9" stroke="#d2ebf9" stroke-width="0.5"/><polygon points="223.1,212.9 166,209.8 217.5,269" fill="#cce6f8" stroke="#cce6f8" stroke-width="0.5"/><polygon points="217.5,269 265.8,305.7 261.5,240.5" fill="#d3ebf9" stroke="#d3ebf9" stroke-width="0.5"/><polygon points="225.9,171.9 166,209.8 223.1,212.9" fill="#c9e5f8" stroke="#c9e5f8" stroke-width="0.5"/><polygon points="166,209.8 153.3,278.9 217.5,269" fill="#c3e1f5" stroke="#c3e1f5" stroke-width="0.5"/><polygon points="217.5,269 221.3,350.8 265.8,305.7" fill="#cfe9f9" stroke="#cfe9f9" stroke-width="0.5"/><polygon points="221.3,350.8 291.3,331.9 265.8,305.7" fill="#d9effa" stroke="#d9effa" stroke-width="0.5"/><polygon points="265.8,305.7 332.7,303.1 261.5,240.5" fill="#d3eaf7" stroke="#d3eaf7" stroke-width="0.5"/><polygon points="153.3,278.9 221.3,350.8 217.5,269" fill="#c7e4f8" stroke="#c7e4f8" stroke-width="0.5"/><polygon points="291.3,331.9 332.7,303.1 265.8,305.7" fill="#cee7f5" stroke="#cee7f5" stroke-width="0.5"/><polygon points="261.5,240.5 287.3,130.9 225.9,171.9" fill="#d9effa" stroke="#d9effa" stroke-width="0.5"/><polygon points="381.9,196.5 287.3,130.9 261.5,240.5" fill="#cae3f4" stroke="#cae3f4" stroke-width="0.5"/><polygon points="125.9,126 83.8,196.4 166,209.8" fill="#b9dcf0" stroke="#b9dcf0" stroke-width="0.5"/><polygon points="56.3,260.3 119.6,337.7 153.3,278.9" fill="#c4e2f2" stroke="#c4e2f2" stroke-width="0.5"/><polygon points="153.3,278.9 119.6,337.7 221.3,350.8" fill="#c1e0f4" stroke="#c1e0f4" stroke-width="0.5"/><polygon points="125.9,126 166,209.8 225.9,171.9" fill="#c2e1f5" stroke="#c2e1f5" stroke-width="0.5"/><polygon points="166,209.8 83.8,196.4 153.3,278.9" fill="#bbddf1" stroke="#bbddf1" stroke-width="0.5"/><polygon points="226.7,73.3 125.9,126 225.9,171.9" fill="#c5e2f6" stroke="#c5e2f6" stroke-width="0.5"/><polygon points="260.2,414.7 351.6,343.2 291.3,331.9" fill="#c6e0f2" stroke="#c6e0f2" stroke-width="0.5"/><polygon points="291.3,331.9 351.6,343.2 332.7,303.1" fill="#c3def1" stroke="#c3def1" stroke-width="0.5"/><polygon points="332.7,303.1 381.9,196.5 261.5,240.5" fill="#bdd9ee" stroke="#bdd9ee" stroke-width="0.5"/><polygon points="400,252 381.9,196.5 332.7,303.1" fill="#cee6f5" stroke="#cee6f5" stroke-width="0.5"/><polygon points="331.7,86.7 265.5,87.5 287.3,130.9" fill="#cae3f4" stroke="#cae3f4" stroke-width="0.5"/><polygon points="287.3,130.9 265.5,87.5 225.9,171.9" fill="#daf0fa" stroke="#daf0fa" stroke-width="0.5"/><polygon points="265.5,87.5 226.7,73.3 225.9,171.9" fill="#d2ebf9" stroke="#d2ebf9" stroke-width="0.5"/><polygon points="400,288 400,252 332.7,303.1" fill="#c8e2f3" stroke="#c8e2f3" stroke-width="0.5"/><polygon points="400,252 400,216 381.9,196.5" fill="#d5ecf8" stroke="#d5ecf8" stroke-width="0.5"/><polygon points="400,324 400,288 332.7,303.1" fill="#d0e8f6" stroke="#d0e8f6" stroke-width="0.5"/><polygon points="209.8,426.9 260.2,414.7 221.3,350.8" fill="#cfe9f9" stroke="#cfe9f9" stroke-width="0.5"/><polygon points="221.3,350.8 260.2,414.7 291.3,331.9" fill="#d8effa" stroke="#d8effa" stroke-width="0.5"/><polygon points="83.8,196.4 56.3,260.3 153.3,278.9" fill="#c7e4f3" stroke="#c7e4f3" stroke-width="0.5"/><polygon points="136,74.9 91.8,131.1 125.9,126" fill="#c1e0f2" stroke="#c1e0f2" stroke-width="0.5"/><polygon points="125.9,126 91.8,131.1 83.8,196.4" fill="#c1e1f2" stroke="#c1e1f2" stroke-width="0.5"/><polygon points="0,216 0,252 56.3,260.3" fill="#e0f0f8" stroke="#e0f0f8" stroke-width="0.5"/><polygon points="400,216 400,180 381.9,196.5" fill="#d2eaf7" stroke="#d2eaf7" stroke-width="0.5"/><polygon points="377,120.8 331.7,86.7 287.3,130.9" fill="#bed9ef" stroke="#bed9ef" stroke-width="0.5"/><polygon points="377,120.8 287.3,130.9 381.9,196.5" fill="#bfdbef" stroke="#bfdbef" stroke-width="0.5"/><polygon points="252,0 216,0 226.7,73.3" fill="#cee8f9" stroke="#cee8f9" stroke-width="0.5"/><polygon points="170.8,436.2 209.8,426.9 221.3,350.8" fill="#c6e3f7" stroke="#c6e3f7" stroke-width="0.5"/><polygon points="351.6,343.2 400,324 332.7,303.1" fill="#c3def1" stroke="#c3def1" stroke-width="0.5"/><polygon points="400,360 400,324 351.6,343.2" fill="#d2eaf7" stroke="#d2eaf7" stroke-width="0.5"/><polygon points="400,144 377,120.8 381.9,196.5" fill="#d2eaf7" stroke="#d2eaf7" stroke-width="0.5"/><polygon points="226.7,73.3 136,74.9 125.9,126" fill="#bfdff3" stroke="#bfdff3" stroke-width="0.5"/><polygon points="400,180 400,144 381.9,196.5" fill="#cfe7f6" stroke="#cfe7f6" stroke-width="0.5"/><polygon points="66.5,411.3 170.8,436.2 119.6,337.7" fill="#c1e1f2" stroke="#c1e1f2" stroke-width="0.5"/><polygon points="119.6,337.7 170.8,436.2 221.3,350.8" fill="#bfe0f4" stroke="#bfe0f4" stroke-width="0.5"/><polygon points="400,396 400,360 351.6,343.2" fill="#d1e9f6" stroke="#d1e9f6" stroke-width="0.5"/><polygon points="56.3,260.3 49.3,349.4 119.6,337.7" fill="#d1e8f5" stroke="#d1e8f5" stroke-width="0.5"/><polygon points="400,144 400,108 377,120.8" fill="#d3ebf7" stroke="#d3ebf7" stroke-width="0.5"/><polygon points="377,120.8 400,72 331.7,86.7" fill="#cde6f5" stroke="#cde6f5" stroke-width="0.5"/><polygon points="366.4,438.5 400,396 351.6,343.2" fill="#cee6f5" stroke="#cee6f5" stroke-width="0.5"/><polygon points="366.4,438.5 351.6,343.2 260.2,414.7" fill="#bdd9ee" stroke="#bdd9ee" stroke-width="0.5"/><polygon points="366.4,438.5 260.2,414.7 300.1,495.7" fill="#c7e1f2" stroke="#c7e1f2" stroke-width="0.5"/><polygon points="0,216 56.3,260.3 83.8,196.4" fill="#d6ebf6" stroke="#d6ebf6" stroke-width="0.5"/><polygon points="56.3,260.3 0,288 49.3,349.4" fill="#d8ecf7" stroke="#d8ecf7" stroke-width="0.5"/><polygon points="0,180 83.8,196.4 0,144" fill="#deeff8" stroke="#deeff8" stroke-width="0.5"/><polygon points="0,180 0,216 83.8,196.4" fill="#dbedf7" stroke="#dbedf7" stroke-width="0.5"/><polygon points="0,252 0,288 56.3,260.3" fill="#deeff8" stroke="#deeff8" stroke-width="0.5"/><polygon points="49.3,349.4 66.5,411.3 119.6,337.7" fill="#cfe7f5" stroke="#cfe7f5" stroke-width="0.5"/><polygon points="0,396 66.5,411.3 49.3,349.4" fill="#d8ecf7" stroke="#d8ecf7" stroke-width="0.5"/><polygon points="221,484.2 260.2,414.7 209.8,426.9" fill="#d0eaf9" stroke="#d0eaf9" stroke-width="0.5"/><polygon points="0,144 83.8,196.4 91.8,131.1" fill="#d0e8f5" stroke="#d0e8f5" stroke-width="0.5"/><polygon points="400,108 400,72 377,120.8" fill="#cee7f5" stroke="#cee7f5" stroke-width="0.5"/><polygon points="252,0 226.7,73.3 265.5,87.5" fill="#d3ebf9" stroke="#d3ebf9" stroke-width="0.5"/><polygon points="146.4,478.8 221,484.2 170.8,436.2" fill="#c1e0f4" stroke="#c1e0f4" stroke-width="0.5"/><polygon points="170.8,436.2 221,484.2 209.8,426.9" fill="#cae6f8" stroke="#cae6f8" stroke-width="0.5"/><polygon points="252,0 265.5,87.5 288,0" fill="#d8effa" stroke="#d8effa" stroke-width="0.5"/><polygon points="226.7,73.3 180,0 136,74.9" fill="#c5e2f6" stroke="#c5e2f6" stroke-width="0.5"/><polygon points="0,108 0,144 91.8,131.1" fill="#dbeef7" stroke="#dbeef7" stroke-width="0.5"/><polygon points="288,0 265.5,87.5 331.7,86.7" fill="#cce5f4" stroke="#cce5f4" stroke-width="0.5"/><polygon points="0,288 0,324 49.3,349.4" fill="#e3f2f9" stroke="#e3f2f9" stroke-width="0.5"/><polygon points="216,0 180,0 226.7,73.3" fill="#cce7f8" stroke="#cce7f8" stroke-width="0.5"/><polygon points="324,0 288,0 331.7,86.7" fill="#bfdbef" stroke="#bfdbef" stroke-width="0.5"/><polygon points="0,108 91.8,131.1 43.5,43.4" fill="#d6ebf6" stroke="#d6ebf6" stroke-width="0.5"/><polygon points="66.5,411.3 146.4,478.8 170.8,436.2" fill="#bcdef1" stroke="#bcdef1" stroke-width="0.5"/><polygon points="400,468 400,432 366.4,438.5" fill="#cee7f5" stroke="#cee7f5" stroke-width="0.5"/><polygon points="366.4,438.5 400,432 400,396" fill="#d4ebf8" stroke="#d4ebf8" stroke-width="0.5"/><polygon points="180,0 144,0 136,74.9" fill="#bbddf1" stroke="#bbddf1" stroke-width="0.5"/><polygon points="360,0 324,0 331.7,86.7" fill="#bfdbef" stroke="#bfdbef" stroke-width="0.5"/><polygon points="0,324 0,360 49.3,349.4" fill="#e4f2f9" stroke="#e4f2f9" stroke-width="0.5"/><polygon points="66.5,411.3 48,475.8 146.4,478.8" fill="#c5e2f3" stroke="#c5e2f3" stroke-width="0.5"/><polygon points="221,484.2 300.1,495.7 260.2,414.7" fill="#d9f0fa" stroke="#d9f0fa" stroke-width="0.5"/><polygon points="331.7,528.8 300.1,495.7 273.2,593.1" fill="#cae3f3" stroke="#cae3f3" stroke-width="0.5"/><polygon points="400,72 400,36 331.7,86.7" fill="#c9e2f3" stroke="#c9e2f3" stroke-width="0.5"/><polygon points="43.5,43.4 91.8,131.1 136,74.9" fill="#c4e2f2" stroke="#c4e2f2" stroke-width="0.5"/><polygon points="144,0 108,0 136,74.9" fill="#b9dcf0" stroke="#b9dcf0" stroke-width="0.5"/><polygon points="108,0 43.5,43.4 136,74.9" fill="#cae5f4" stroke="#cae5f4" stroke-width="0.5"/><polygon points="400,36 360,0 331.7,86.7" fill="#c4dff1" stroke="#c4dff1" stroke-width="0.5"/><polygon points="0,360 0,396 49.3,349.4" fill="#e0f0f8" stroke="#e0f0f8" stroke-width="0.5"/><polygon points="331.7,528.8 400,468 366.4,438.5" fill="#c9e3f3" stroke="#c9e3f3" stroke-width="0.5"/><polygon points="0,36 0,72 43.5,43.4" fill="#e4f2f9" stroke="#e4f2f9" stroke-width="0.5"/><polygon points="43.5,43.4 0,72 0,108" fill="#e0f0f8" stroke="#e0f0f8" stroke-width="0.5"/><polygon points="108,0 72,0 43.5,43.4" fill="#d0e8f5" stroke="#d0e8f5" stroke-width="0.5"/><polygon points="400,36 396,0 360,0" fill="#cde5f5" stroke="#cde5f5" stroke-width="0.5"/><polygon points="400,36 400,0 396,0" fill="#d5ecf8" stroke="#d5ecf8" stroke-width="0.5"/><polygon points="0,432 48,475.8 66.5,411.3" fill="#d8ecf7" stroke="#d8ecf7" stroke-width="0.5"/><polygon points="273.2,593.1 300.1,495.7 221,484.2" fill="#daf0fa" stroke="#daf0fa" stroke-width="0.5"/><polygon points="0,396 0,432 66.5,411.3" fill="#deeff8" stroke="#deeff8" stroke-width="0.5"/><polygon points="160.2,556.9 221,484.2 146.4,478.8" fill="#c5e2f6" stroke="#c5e2f6" stroke-width="0.5"/><polygon points="300.1,495.7 331.7,528.8 366.4,438.5" fill="#bcd8ee" stroke="#bcd8ee" stroke-width="0.5"/><polygon points="36,0 0,36 43.5,43.4" fill="#ddeff8" stroke="#ddeff8" stroke-width="0.5"/><polygon points="72,0 36,0 43.5,43.4" fill="#d5eaf6" stroke="#d5eaf6" stroke-width="0.5"/><polygon points="331.7,528.8 400,504 400,468" fill="#cbe4f4" stroke="#cbe4f4" stroke-width="0.5"/><polygon points="94.6,558.7 160.2,556.9 146.4,478.8" fill="#bcdef1" stroke="#bcdef1" stroke-width="0.5"/><polygon points="0,432 0,468 48,475.8" fill="#dfeff8" stroke="#dfeff8" stroke-width="0.5"/><polygon points="48,475.8 94.6,558.7 146.4,478.8" fill="#c3e2f2" stroke="#c3e2f2" stroke-width="0.5"/><polygon points="36,0 0,0 0,36" fill="#e5f2f9" stroke="#e5f2f9" stroke-width="0.5"/><polygon points="368.1,573.9 400,540 331.7,528.8" fill="#c5dff1" stroke="#c5dff1" stroke-width="0.5"/><polygon points="331.7,528.8 400,540 400,504" fill="#c9e3f3" stroke="#c9e3f3" stroke-width="0.5"/><polygon points="0,540 94.6,558.7 48,475.8" fill="#d6ebf6" stroke="#d6ebf6" stroke-width="0.5"/><polygon points="0,468 0,504 48,475.8" fill="#e1f1f9" stroke="#e1f1f9" stroke-width="0.5"/><polygon points="180,600 187.8,591.4 160.2,556.9" fill="#c2e1f5" stroke="#c2e1f5" stroke-width="0.5"/><polygon points="160.2,556.9 187.8,591.4 221,484.2" fill="#c3e2f6" stroke="#c3e2f6" stroke-width="0.5"/><polygon points="252,600 273.2,593.1 221,484.2" fill="#d6edfa" stroke="#d6edfa" stroke-width="0.5"/><polygon points="187.8,591.4 216,600 221,484.2" fill="#c9e5f8" stroke="#c9e5f8" stroke-width="0.5"/><polygon points="216,600 252,600 221,484.2" fill="#d0e9f9" stroke="#d0e9f9" stroke-width="0.5"/><polygon points="324,600 368.1,573.9 331.7,528.8" fill="#c2ddf0" stroke="#c2ddf0" stroke-width="0.5"/><polygon points="288,600 331.7,528.8 273.2,593.1" fill="#cde6f5" stroke="#cde6f5" stroke-width="0.5"/><polygon points="144,600 180,600 160.2,556.9" fill="#c1e0f4" stroke="#c1e0f4" stroke-width="0.5"/><polygon points="187.8,591.4 180,600 216,600" fill="#c7e3f7" stroke="#c7e3f7" stroke-width="0.5"/><polygon points="252,600 288,600 273.2,593.1" fill="#d3eaf7" stroke="#d3eaf7" stroke-width="0.5"/><polygon points="108,600 144,600 94.6,558.7" fill="#bddef1" stroke="#bddef1" stroke-width="0.5"/><polygon points="94.6,558.7 144,600 160.2,556.9" fill="#bbddf1" stroke="#bbddf1" stroke-width="0.5"/><polygon points="288,600 324,600 331.7,528.8" fill="#c1dcf0" stroke="#c1dcf0" stroke-width="0.5"/><polygon points="396,600 400,576 368.1,573.9" fill="#d3eaf7" stroke="#d3eaf7" stroke-width="0.5"/><polygon points="368.1,573.9 400,576 400,540" fill="#d0e8f6" stroke="#d0e8f6" stroke-width="0.5"/><polygon points="0,504 0,540 48,475.8" fill="#e6f3fa" stroke="#e6f3fa" stroke-width="0.5"/><polygon points="72,600 108,600 94.6,558.7" fill="#c9e4f4" stroke="#c9e4f4" stroke-width="0.5"/><polygon points="324,600 360,600 368.1,573.9" fill="#c5dff2" stroke="#c5dff2" stroke-width="0.5"/><polygon points="36,600 72,600 94.6,558.7" fill="#d2e9f5" stroke="#d2e9f5" stroke-width="0.5"/><polygon points="360,600 396,600 368.1,573.9" fill="#d0e8f6" stroke="#d0e8f6" stroke-width="0.5"/><polygon points="396,600 400,600 400,576" fill="#d5ecf8" stroke="#d5ecf8" stroke-width="0.5"/><polygon points="0,540 36,600 94.6,558.7" fill="#d8ecf7" stroke="#d8ecf7" stroke-width="0.5"/><polygon points="0,576 36,600 0,540" fill="#e0f0f8" stroke="#e0f0f8" stroke-width="0.5"/><polygon points="0,576 0,600 36,600" fill="#e0f0f8" stroke="#e0f0f8" stroke-width="0.5"/>` },
  { id: 'volcanic', label: 'Volcanic', category: 'geometric', bg: '#1A0A06', accent: '#FF6B35', text: '#F5DCD0', textMuted: '#A07050', qrDark: '#F5DCD0', qrLight: '#1A0A06', decorations: false, borderStyle: 'none',
    patternViewBox: '0 0 400 600',
    patternSvg: `<polygon points="184.6,326.5 213.8,366 234.2,328.3" fill="#4a1a12" stroke="#4a1a12" stroke-width="0.5"/><polygon points="213.8,366 262.4,360.3 234.2,328.3" fill="#4c1b13" stroke="#4c1b13" stroke-width="0.5"/><polygon points="262.4,360.3 258.9,306 234.2,328.3" fill="#511c14" stroke="#511c14" stroke-width="0.5"/><polygon points="234.2,328.3 242.6,278.7 184.6,326.5" fill="#471912" stroke="#471912" stroke-width="0.5"/><polygon points="258.9,306 242.6,278.7 234.2,328.3" fill="#4b1a12" stroke="#4b1a12" stroke-width="0.5"/><polygon points="184.6,326.5 175.4,407.4 213.8,366" fill="#541e15" stroke="#541e15" stroke-width="0.5"/><polygon points="213.8,366 274.8,422.1 262.4,360.3" fill="#521d14" stroke="#521d14" stroke-width="0.5"/><polygon points="242.6,278.7 167.9,254.1 184.6,326.5" fill="#4d1b13" stroke="#4d1b13" stroke-width="0.5"/><polygon points="184.6,326.5 113.9,341.4 175.4,407.4" fill="#521d14" stroke="#521d14" stroke-width="0.5"/><polygon points="113.7,271.3 113.9,341.4 184.6,326.5" fill="#481912" stroke="#481912" stroke-width="0.5"/><polygon points="217.5,459.8 274.8,422.1 213.8,366" fill="#47170e" stroke="#47170e" stroke-width="0.5"/><polygon points="262.4,360.3 326.8,335.6 258.9,306" fill="#4c1b13" stroke="#4c1b13" stroke-width="0.5"/><polygon points="279.2,206.4 230.6,232 242.6,278.7" fill="#3f1611" stroke="#3f1611" stroke-width="0.5"/><polygon points="242.6,278.7 230.6,232 167.9,254.1" fill="#441811" stroke="#441811" stroke-width="0.5"/><polygon points="113.9,341.4 102.7,372 175.4,407.4" fill="#4e1b13" stroke="#4e1b13" stroke-width="0.5"/><polygon points="274.8,422.1 294.7,410.1 262.4,360.3" fill="#551e15" stroke="#551e15" stroke-width="0.5"/><polygon points="133.9,219.1 113.7,271.3 167.9,254.1" fill="#3d1610" stroke="#3d1610" stroke-width="0.5"/><polygon points="167.9,254.1 113.7,271.3 184.6,326.5" fill="#4b1a12" stroke="#4b1a12" stroke-width="0.5"/><polygon points="113.9,341.4 54.5,354 102.7,372" fill="#531d14" stroke="#531d14" stroke-width="0.5"/><polygon points="294.7,410.1 326.8,335.6 262.4,360.3" fill="#501c14" stroke="#501c14" stroke-width="0.5"/><polygon points="258.9,306 322.8,276.2 242.6,278.7" fill="#481912" stroke="#481912" stroke-width="0.5"/><polygon points="156.5,462.2 217.5,459.8 175.4,407.4" fill="#511c13" stroke="#511c13" stroke-width="0.5"/><polygon points="175.4,407.4 217.5,459.8 213.8,366" fill="#541e15" stroke="#541e15" stroke-width="0.5"/><polygon points="389.1,389.1 345.7,387.9 379.8,440.7" fill="#521d14" stroke="#521d14" stroke-width="0.5"/><polygon points="326.8,335.6 322.8,276.2 258.9,306" fill="#4d1b13" stroke="#4d1b13" stroke-width="0.5"/><polygon points="130.3,455.1 156.5,462.2 175.4,407.4" fill="#42140c" stroke="#42140c" stroke-width="0.5"/><polygon points="230.6,232 177,208.8 167.9,254.1" fill="#3b1510" stroke="#3b1510" stroke-width="0.5"/><polygon points="102.7,372 130.3,455.1 175.4,407.4" fill="#541d14" stroke="#541d14" stroke-width="0.5"/><polygon points="177,208.8 133.9,219.1 167.9,254.1" fill="#38140f" stroke="#38140f" stroke-width="0.5"/><polygon points="389.1,389.1 400,420 400,392" fill="#521d14" stroke="#521d14" stroke-width="0.5"/><polygon points="294.7,410.1 345.7,387.9 326.8,335.6" fill="#531d15" stroke="#531d15" stroke-width="0.5"/><polygon points="400,308 376.6,259.6 322.8,276.2" fill="#4b1a12" stroke="#4b1a12" stroke-width="0.5"/><polygon points="322.8,276.2 279.2,206.4 242.6,278.7" fill="#3f1711" stroke="#3f1711" stroke-width="0.5"/><polygon points="230.6,232 209.7,173.5 177,208.8" fill="#35130e" stroke="#35130e" stroke-width="0.5"/><polygon points="30.5,298 54.5,354 113.9,341.4" fill="#4c1b12" stroke="#4c1b12" stroke-width="0.5"/><polygon points="102.7,372 48.8,456.1 130.3,455.1" fill="#46160e" stroke="#46160e" stroke-width="0.5"/><polygon points="30.5,298 113.9,341.4 113.7,271.3" fill="#4f1c13" stroke="#4f1c13" stroke-width="0.5"/><polygon points="271.3,182.3 209.7,173.5 230.6,232" fill="#35130e" stroke="#35130e" stroke-width="0.5"/><polygon points="177,208.8 183.6,173.9 133.9,219.1" fill="#34130d" stroke="#34130d" stroke-width="0.5"/><polygon points="209.7,173.5 183.6,173.9 177,208.8" fill="#3a1510" stroke="#3a1510" stroke-width="0.5"/><polygon points="311,158.2 271.3,182.3 279.2,206.4" fill="#38140f" stroke="#38140f" stroke-width="0.5"/><polygon points="279.2,206.4 271.3,182.3 230.6,232" fill="#411711" stroke="#411711" stroke-width="0.5"/><polygon points="54.5,354 42.8,380.1 102.7,372" fill="#531d14" stroke="#531d14" stroke-width="0.5"/><polygon points="130.3,455.1 163,514.2 156.5,462.2" fill="#49180f" stroke="#49180f" stroke-width="0.5"/><polygon points="156.5,462.2 163,514.2 217.5,459.8" fill="#41140c" stroke="#41140c" stroke-width="0.5"/><polygon points="379.8,440.7 294.7,410.1 359.6,473.9" fill="#531d14" stroke="#531d14" stroke-width="0.5"/><polygon points="93.4,519.9 163,514.2 130.3,455.1" fill="#3f130b" stroke="#3f130b" stroke-width="0.5"/><polygon points="322.8,276.2 328.4,202.1 279.2,206.4" fill="#441811" stroke="#441811" stroke-width="0.5"/><polygon points="379.8,244.9 328.4,202.1 322.8,276.2" fill="#3e1611" stroke="#3e1611" stroke-width="0.5"/><polygon points="44.9,236.5 113.7,271.3 133.9,219.1" fill="#3b1510" stroke="#3b1510" stroke-width="0.5"/><polygon points="44.9,236.5 30.5,298 113.7,271.3" fill="#4b1a12" stroke="#4b1a12" stroke-width="0.5"/><polygon points="54.5,354 0,364 42.8,380.1" fill="#551e15" stroke="#551e15" stroke-width="0.5"/><polygon points="400,308 322.8,276.2 326.8,335.6" fill="#461912" stroke="#461912" stroke-width="0.5"/><polygon points="345.7,387.9 395.6,336.6 326.8,335.6" fill="#541e15" stroke="#541e15" stroke-width="0.5"/><polygon points="250.4,523.4 274.8,422.1 217.5,459.8" fill="#42140c" stroke="#42140c" stroke-width="0.5"/><polygon points="345.7,387.9 400,364 395.6,336.6" fill="#501c14" stroke="#501c14" stroke-width="0.5"/><polygon points="163,514.2 250.4,523.4 217.5,459.8" fill="#391008" stroke="#391008" stroke-width="0.5"/><polygon points="400,364 400,336 395.6,336.6" fill="#4f1c13" stroke="#4f1c13" stroke-width="0.5"/><polygon points="395.6,336.6 400,308 326.8,335.6" fill="#4f1c13" stroke="#4f1c13" stroke-width="0.5"/><polygon points="389.1,389.1 400,364 345.7,387.9" fill="#511c13" stroke="#511c13" stroke-width="0.5"/><polygon points="100,174.6 44.9,236.5 133.9,219.1" fill="#37140e" stroke="#37140e" stroke-width="0.5"/><polygon points="400,336 400,308 395.6,336.6" fill="#4d1b13" stroke="#4d1b13" stroke-width="0.5"/><polygon points="400,252 379.8,244.9 376.6,259.6" fill="#3e1610" stroke="#3e1610" stroke-width="0.5"/><polygon points="376.6,259.6 379.8,244.9 322.8,276.2" fill="#441811" stroke="#441811" stroke-width="0.5"/><polygon points="183.6,173.9 100,174.6 133.9,219.1" fill="#3c1510" stroke="#3c1510" stroke-width="0.5"/><polygon points="160.3,112.9 100,174.6 183.6,173.9" fill="#39150f" stroke="#39150f" stroke-width="0.5"/><polygon points="379.8,440.7 345.7,387.9 294.7,410.1" fill="#541d14" stroke="#541d14" stroke-width="0.5"/><polygon points="389.1,389.1 400,392 400,364" fill="#501c14" stroke="#501c14" stroke-width="0.5"/><polygon points="0,420 48.8,456.1 42.8,380.1" fill="#45160d" stroke="#45160d" stroke-width="0.5"/><polygon points="42.8,380.1 48.8,456.1 102.7,372" fill="#4c1911" stroke="#4c1911" stroke-width="0.5"/><polygon points="359.6,473.9 294.7,410.1 274.8,422.1" fill="#531d14" stroke="#531d14" stroke-width="0.5"/><polygon points="400,308 400,280 376.6,259.6" fill="#4d1b13" stroke="#4d1b13" stroke-width="0.5"/><polygon points="250.4,523.4 285.3,524 274.8,422.1" fill="#3a1008" stroke="#3a1008" stroke-width="0.5"/><polygon points="285.3,524 359.6,473.9 274.8,422.1" fill="#43150c" stroke="#43150c" stroke-width="0.5"/><polygon points="400,448 400,420 379.8,440.7" fill="#4a1810" stroke="#4a1810" stroke-width="0.5"/><polygon points="379.8,440.7 400,420 389.1,389.1" fill="#4a1910" stroke="#4a1910" stroke-width="0.5"/><polygon points="338.5,135.1 311,158.2 328.4,202.1" fill="#37140e" stroke="#37140e" stroke-width="0.5"/><polygon points="328.4,202.1 311,158.2 279.2,206.4" fill="#37140f" stroke="#37140f" stroke-width="0.5"/><polygon points="271.3,182.3 267.1,121.1 209.7,173.5" fill="#36130e" stroke="#36130e" stroke-width="0.5"/><polygon points="199.8,106.2 160.3,112.9 183.6,173.9" fill="#2a0e08" stroke="#2a0e08" stroke-width="0.5"/><polygon points="0,308 0,336 30.5,298" fill="#471912" stroke="#471912" stroke-width="0.5"/><polygon points="30.5,298 0,336 54.5,354" fill="#511c14" stroke="#511c14" stroke-width="0.5"/><polygon points="400,280 400,252 376.6,259.6" fill="#431811" stroke="#431811" stroke-width="0.5"/><polygon points="379.8,244.9 400,224 328.4,202.1" fill="#441811" stroke="#441811" stroke-width="0.5"/><polygon points="0,336 0,364 54.5,354" fill="#501c14" stroke="#501c14" stroke-width="0.5"/><polygon points="110.8,559 180.5,547.8 163,514.2" fill="#270c07" stroke="#270c07" stroke-width="0.5"/><polygon points="163,514.2 180.5,547.8 250.4,523.4" fill="#310e07" stroke="#310e07" stroke-width="0.5"/><polygon points="250.4,523.4 304.1,545.4 285.3,524" fill="#300e07" stroke="#300e07" stroke-width="0.5"/><polygon points="0,280 0,308 30.5,298" fill="#441811" stroke="#441811" stroke-width="0.5"/><polygon points="48.2,489.7 93.4,519.9 130.3,455.1" fill="#40130b" stroke="#40130b" stroke-width="0.5"/><polygon points="0,364 0,392 42.8,380.1" fill="#531d14" stroke="#531d14" stroke-width="0.5"/><polygon points="48.8,456.1 48.2,489.7 130.3,455.1" fill="#47170e" stroke="#47170e" stroke-width="0.5"/><polygon points="0,252 0,280 30.5,298" fill="#4a1a12" stroke="#4a1a12" stroke-width="0.5"/><polygon points="0,252 30.5,298 44.9,236.5" fill="#3f1611" stroke="#3f1611" stroke-width="0.5"/><polygon points="400,476 400,448 379.8,440.7" fill="#3f130b" stroke="#3f130b" stroke-width="0.5"/><polygon points="400,476 379.8,440.7 359.6,473.9" fill="#46160e" stroke="#46160e" stroke-width="0.5"/><polygon points="0,476 48.2,489.7 48.8,456.1" fill="#40130b" stroke="#40130b" stroke-width="0.5"/><polygon points="400,252 400,224 379.8,244.9" fill="#471912" stroke="#471912" stroke-width="0.5"/><polygon points="0,392 0,420 42.8,380.1" fill="#521c13" stroke="#521c13" stroke-width="0.5"/><polygon points="338.5,135.1 267.1,121.1 311,158.2" fill="#2a0e08" stroke="#2a0e08" stroke-width="0.5"/><polygon points="311,158.2 267.1,121.1 271.3,182.3" fill="#2e100a" stroke="#2e100a" stroke-width="0.5"/><polygon points="0,224 0,252 44.9,236.5" fill="#411711" stroke="#411711" stroke-width="0.5"/><polygon points="280,600 304.1,545.4 250.4,523.4" fill="#2a0d07" stroke="#2a0d07" stroke-width="0.5"/><polygon points="285.3,524 362.5,526.3 359.6,473.9" fill="#41140b" stroke="#41140b" stroke-width="0.5"/><polygon points="61.6,126.9 32.4,194.2 100,174.6" fill="#2f100b" stroke="#2f100b" stroke-width="0.5"/><polygon points="100,174.6 32.4,194.2 44.9,236.5" fill="#39140f" stroke="#39140f" stroke-width="0.5"/><polygon points="199.8,106.2 183.6,173.9 209.7,173.5" fill="#36130e" stroke="#36130e" stroke-width="0.5"/><polygon points="267.1,121.1 199.8,106.2 209.7,173.5" fill="#290e08" stroke="#290e08" stroke-width="0.5"/><polygon points="400,504 400,476 359.6,473.9" fill="#41130b" stroke="#41130b" stroke-width="0.5"/><polygon points="0,420 0,448 48.8,456.1" fill="#4b1910" stroke="#4b1910" stroke-width="0.5"/><polygon points="196,600 204,574.7 168,600" fill="#1e0a06" stroke="#1e0a06" stroke-width="0.5"/><polygon points="180.5,547.8 204,574.7 250.4,523.4" fill="#290c07" stroke="#290c07" stroke-width="0.5"/><polygon points="32.4,194.2 0,224 44.9,236.5" fill="#431811" stroke="#431811" stroke-width="0.5"/><polygon points="400,224 400,196 328.4,202.1" fill="#411711" stroke="#411711" stroke-width="0.5"/><polygon points="63.4,574.9 110.8,559 93.4,519.9" fill="#200a06" stroke="#200a06" stroke-width="0.5"/><polygon points="93.4,519.9 110.8,559 163,514.2" fill="#290c07" stroke="#290c07" stroke-width="0.5"/><polygon points="63.4,574.9 93.4,519.9 48.2,489.7" fill="#3a1008" stroke="#3a1008" stroke-width="0.5"/><polygon points="393.5,161.5 338.5,135.1 328.4,202.1" fill="#34120d" stroke="#34120d" stroke-width="0.5"/><polygon points="215,36 185.2,73.4 199.8,106.2" fill="#270d08" stroke="#270d08" stroke-width="0.5"/><polygon points="304.1,545.4 362.5,526.3 285.3,524" fill="#360f08" stroke="#360f08" stroke-width="0.5"/><polygon points="0,448 0,476 48.8,456.1" fill="#43150c" stroke="#43150c" stroke-width="0.5"/><polygon points="362.5,526.3 400,504 359.6,473.9" fill="#3a1008" stroke="#3a1008" stroke-width="0.5"/><polygon points="0,168 0,196 32.4,194.2" fill="#3e1611" stroke="#3e1611" stroke-width="0.5"/><polygon points="32.4,194.2 0,196 0,224" fill="#37140e" stroke="#37140e" stroke-width="0.5"/><polygon points="304.1,545.4 353.4,547.1 362.5,526.3" fill="#280c07" stroke="#280c07" stroke-width="0.5"/><polygon points="362.5,526.3 399,516.8 400,504" fill="#340f08" stroke="#340f08" stroke-width="0.5"/><polygon points="336,600 353.4,547.1 304.1,545.4" fill="#270c07" stroke="#270c07" stroke-width="0.5"/><polygon points="400,196 393.5,161.5 328.4,202.1" fill="#3a1510" stroke="#3a1510" stroke-width="0.5"/><polygon points="400,196 400,168 393.5,161.5" fill="#34130d" stroke="#34130d" stroke-width="0.5"/><polygon points="185.2,73.4 137.8,92.2 160.3,112.9" fill="#1f0b08" stroke="#1f0b08" stroke-width="0.5"/><polygon points="160.3,112.9 137.8,92.2 100,174.6" fill="#31110c" stroke="#31110c" stroke-width="0.5"/><polygon points="185.2,73.4 160.3,112.9 199.8,106.2" fill="#260d08" stroke="#260d08" stroke-width="0.5"/><polygon points="353.4,547.1 368.9,541.6 362.5,526.3" fill="#300e07" stroke="#300e07" stroke-width="0.5"/><polygon points="137.8,92.2 61.6,126.9 100,174.6" fill="#2a0e08" stroke="#2a0e08" stroke-width="0.5"/><polygon points="400,532 399,516.8 362.5,526.3" fill="#2d0d07" stroke="#2d0d07" stroke-width="0.5"/><polygon points="168,600 204,574.7 180.5,547.8" fill="#1e0a06" stroke="#1e0a06" stroke-width="0.5"/><polygon points="204,574.7 252,600 250.4,523.4" fill="#260c07" stroke="#260c07" stroke-width="0.5"/><polygon points="196,600 224,600 204,574.7" fill="#1e0a06" stroke="#1e0a06" stroke-width="0.5"/><polygon points="364,600 400,560 368.9,541.6" fill="#2d0d07" stroke="#2d0d07" stroke-width="0.5"/><polygon points="140,600 168,600 180.5,547.8" fill="#1e0a06" stroke="#1e0a06" stroke-width="0.5"/><polygon points="224,600 252,600 204,574.7" fill="#290c07" stroke="#290c07" stroke-width="0.5"/><polygon points="0,476 0,504 48.2,489.7" fill="#381008" stroke="#381008" stroke-width="0.5"/><polygon points="110.8,559 140,600 180.5,547.8" fill="#260c07" stroke="#260c07" stroke-width="0.5"/><polygon points="275.3,56.3 199.8,106.2 267.1,121.1" fill="#2d100a" stroke="#2d100a" stroke-width="0.5"/><polygon points="112,600 140,600 110.8,559" fill="#290c07" stroke="#290c07" stroke-width="0.5"/><polygon points="61.6,126.9 0,168 32.4,194.2" fill="#2d100a" stroke="#2d100a" stroke-width="0.5"/><polygon points="252,600 280,600 250.4,523.4" fill="#2b0d07" stroke="#2b0d07" stroke-width="0.5"/><polygon points="400,560 400,532 368.9,541.6" fill="#360f08" stroke="#360f08" stroke-width="0.5"/><polygon points="368.9,541.6 400,532 362.5,526.3" fill="#3b1109" stroke="#3b1109" stroke-width="0.5"/><polygon points="399,516.8 400,532 400,504" fill="#2c0d07" stroke="#2c0d07" stroke-width="0.5"/><polygon points="393.5,161.5 400,140 338.5,135.1" fill="#2c0f09" stroke="#2c0f09" stroke-width="0.5"/><polygon points="338.5,135.1 331.3,78.9 267.1,121.1" fill="#260d08" stroke="#260d08" stroke-width="0.5"/><polygon points="400,168 400,140 393.5,161.5" fill="#391510" stroke="#391510" stroke-width="0.5"/><polygon points="0,532 63.4,574.9 48.2,489.7" fill="#2a0d07" stroke="#2a0d07" stroke-width="0.5"/><polygon points="84,600 112,600 110.8,559" fill="#1e0a06" stroke="#1e0a06" stroke-width="0.5"/><polygon points="280,600 308,600 304.1,545.4" fill="#260c07" stroke="#260c07" stroke-width="0.5"/><polygon points="400,140 378.6,112.5 338.5,135.1" fill="#290e08" stroke="#290e08" stroke-width="0.5"/><polygon points="0,504 0,532 48.2,489.7" fill="#2c0d07" stroke="#2c0d07" stroke-width="0.5"/><polygon points="378.6,112.5 331.3,78.9 338.5,135.1" fill="#2d0f0a" stroke="#2d0f0a" stroke-width="0.5"/><polygon points="0,112 0,140 61.6,126.9" fill="#34120d" stroke="#34120d" stroke-width="0.5"/><polygon points="61.6,126.9 0,140 0,168" fill="#37140e" stroke="#37140e" stroke-width="0.5"/><polygon points="97.8,53.9 61.6,126.9 137.8,92.2" fill="#2c0f09" stroke="#2c0f09" stroke-width="0.5"/><polygon points="56,600 84,600 63.4,574.9" fill="#1e0a06" stroke="#1e0a06" stroke-width="0.5"/><polygon points="63.4,574.9 84,600 110.8,559" fill="#210b06" stroke="#210b06" stroke-width="0.5"/><polygon points="308,600 336,600 304.1,545.4" fill="#280c07" stroke="#280c07" stroke-width="0.5"/><polygon points="331.3,78.9 275.3,56.3 267.1,121.1" fill="#200c08" stroke="#200c08" stroke-width="0.5"/><polygon points="364,600 368.9,541.6 353.4,547.1" fill="#270c07" stroke="#270c07" stroke-width="0.5"/><polygon points="378.6,112.5 400,84 331.3,78.9" fill="#2a0e08" stroke="#2a0e08" stroke-width="0.5"/><polygon points="400,140 400,112 378.6,112.5" fill="#2e100a" stroke="#2e100a" stroke-width="0.5"/><polygon points="28,600 56,600 63.4,574.9" fill="#1e0a06" stroke="#1e0a06" stroke-width="0.5"/><polygon points="275.3,56.3 215,36 199.8,106.2" fill="#230c08" stroke="#230c08" stroke-width="0.5"/><polygon points="140,0 97.8,53.9 137.8,92.2" fill="#1d0b08" stroke="#1d0b08" stroke-width="0.5"/><polygon points="336,600 364,600 353.4,547.1" fill="#210b06" stroke="#210b06" stroke-width="0.5"/><polygon points="0,532 0,560 63.4,574.9" fill="#310e07" stroke="#310e07" stroke-width="0.5"/><polygon points="140,0 137.8,92.2 185.2,73.4" fill="#1d0b08" stroke="#1d0b08" stroke-width="0.5"/><polygon points="0,84 0,112 29.7,61.5" fill="#2a0e08" stroke="#2a0e08" stroke-width="0.5"/><polygon points="364,600 400,588 400,560" fill="#210b06" stroke="#210b06" stroke-width="0.5"/><polygon points="0,560 28,600 63.4,574.9" fill="#2e0d07" stroke="#2e0d07" stroke-width="0.5"/><polygon points="400,112 400,84 378.6,112.5" fill="#2e100a" stroke="#2e100a" stroke-width="0.5"/><polygon points="252,0 215,36 275.3,56.3" fill="#1a0a08" stroke="#1a0a08" stroke-width="0.5"/><polygon points="224,0 196,0 215,36" fill="#120808" stroke="#120808" stroke-width="0.5"/><polygon points="364,600 392,600 400,588" fill="#1e0a06" stroke="#1e0a06" stroke-width="0.5"/><polygon points="392,600 400,600 400,588" fill="#1e0a06" stroke="#1e0a06" stroke-width="0.5"/><polygon points="0,560 0,588 28,600" fill="#2b0d07" stroke="#2b0d07" stroke-width="0.5"/><polygon points="29.7,61.5 0,112 61.6,126.9" fill="#2c0f09" stroke="#2c0f09" stroke-width="0.5"/><polygon points="97.8,53.9 29.7,61.5 61.6,126.9" fill="#270d08" stroke="#270d08" stroke-width="0.5"/><polygon points="56,0 29.7,61.5 97.8,53.9" fill="#150908" stroke="#150908" stroke-width="0.5"/><polygon points="0,588 0,600 28,600" fill="#250b06" stroke="#250b06" stroke-width="0.5"/><polygon points="224,0 215,36 252,0" fill="#190a08" stroke="#190a08" stroke-width="0.5"/><polygon points="215,36 168,0 185.2,73.4" fill="#150908" stroke="#150908" stroke-width="0.5"/><polygon points="252,0 275.3,56.3 280,0" fill="#120808" stroke="#120808" stroke-width="0.5"/><polygon points="400,84 400,56 331.3,78.9" fill="#2b0f09" stroke="#2b0f09" stroke-width="0.5"/><polygon points="196,0 168,0 215,36" fill="#120808" stroke="#120808" stroke-width="0.5"/><polygon points="280,0 275.3,56.3 308,0" fill="#120808" stroke="#120808" stroke-width="0.5"/><polygon points="168,0 140,0 185.2,73.4" fill="#130808" stroke="#130808" stroke-width="0.5"/><polygon points="308,0 275.3,56.3 331.3,78.9" fill="#150908" stroke="#150908" stroke-width="0.5"/><polygon points="0,28 0,56 29.7,61.5" fill="#270d08" stroke="#270d08" stroke-width="0.5"/><polygon points="29.7,61.5 0,56 0,84" fill="#1b0a08" stroke="#1b0a08" stroke-width="0.5"/><polygon points="140,0 112,0 97.8,53.9" fill="#1f0b08" stroke="#1f0b08" stroke-width="0.5"/><polygon points="336,0 308,0 331.3,78.9" fill="#210c08" stroke="#210c08" stroke-width="0.5"/><polygon points="400,56 387.9,30.7 331.3,78.9" fill="#260d08" stroke="#260d08" stroke-width="0.5"/><polygon points="112,0 84,0 97.8,53.9" fill="#1e0b08" stroke="#1e0b08" stroke-width="0.5"/><polygon points="387.9,30.7 336,0 331.3,78.9" fill="#1c0b08" stroke="#1c0b08" stroke-width="0.5"/><polygon points="400,56 400,28 387.9,30.7" fill="#120808" stroke="#120808" stroke-width="0.5"/><polygon points="387.9,30.7 364,0 336,0" fill="#120808" stroke="#120808" stroke-width="0.5"/><polygon points="84,0 56,0 97.8,53.9" fill="#120808" stroke="#120808" stroke-width="0.5"/><polygon points="392,0 364,0 387.9,30.7" fill="#120808" stroke="#120808" stroke-width="0.5"/><polygon points="28,0 0,28 29.7,61.5" fill="#120808" stroke="#120808" stroke-width="0.5"/><polygon points="56,0 28,0 29.7,61.5" fill="#130808" stroke="#130808" stroke-width="0.5"/><polygon points="400,28 392,0 387.9,30.7" fill="#1c0b08" stroke="#1c0b08" stroke-width="0.5"/><polygon points="400,28 400,0 392,0" fill="#1a0a08" stroke="#1a0a08" stroke-width="0.5"/><polygon points="28,0 0,0 0,28" fill="#120808" stroke="#120808" stroke-width="0.5"/>` },
  // Minimal
  { id: 'minimal-dark', label: 'Minimal Dark', category: 'minimal', bg: '#0A0A0A', accent: '#FFFFFF', text: '#FFFFFF', textMuted: '#666666', qrDark: '#FFFFFF', qrLight: '#0A0A0A', decorations: false, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="12" cy="18" r="0.4" fill="#FFFFFF" opacity="0.04"/><circle cx="45" cy="8" r="0.3" fill="#FFFFFF" opacity="0.03"/><circle cx="78" cy="33" r="0.4" fill="#FFFFFF" opacity="0.04"/><circle cx="30" cy="55" r="0.3" fill="#FFFFFF" opacity="0.03"/><circle cx="65" cy="72" r="0.4" fill="#FFFFFF" opacity="0.04"/><circle cx="88" cy="90" r="0.3" fill="#FFFFFF" opacity="0.03"/><circle cx="5" cy="85" r="0.4" fill="#FFFFFF" opacity="0.04"/><circle cx="52" cy="45" r="0.3" fill="#FFFFFF" opacity="0.03"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'minimal-light', label: 'Minimal Light', category: 'minimal', bg: '#FFFFFF', accent: '#0A0A0A', text: '#0A0A0A', textMuted: '#888888', qrDark: '#0A0A0A', qrLight: '#FFFFFF', decorations: false, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><line x1="40" y1="0" x2="40" y2="40" stroke="#0A0A0A" stroke-width="0.3" opacity="0.04"/><line x1="0" y1="40" x2="40" y2="40" stroke="#0A0A0A" stroke-width="0.3" opacity="0.04"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'warm-cream', label: 'Warm Cream', category: 'minimal', bg: '#FDF6EC', accent: '#A67C52', text: '#3A2A1A', textMuted: '#8A7A6A', qrDark: '#3A2A1A', qrLight: '#FDF6EC', decorations: false, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="80" height="80" patternUnits="userSpaceOnUse"><line x1="0" y1="15" x2="80" y2="16" stroke="#A67C52" stroke-width="0.2" opacity="0.06"/><line x1="0" y1="38" x2="80" y2="37" stroke="#A67C52" stroke-width="0.3" opacity="0.05"/><line x1="0" y1="55" x2="80" y2="56" stroke="#A67C52" stroke-width="0.2" opacity="0.06"/><line x1="0" y1="72" x2="80" y2="71" stroke="#A67C52" stroke-width="0.2" opacity="0.04"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'terracotta', label: 'Terracotta', category: 'minimal', bg: '#1C1210', accent: '#C4704A', text: '#F0DCD0', textMuted: '#9A7A6A', qrDark: '#F0DCD0', qrLight: '#1C1210', decorations: false, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M0,60 L45,55 L60,0" stroke="#C4704A" fill="none" stroke-width="0.4" opacity="0.08"/><path d="M45,55 L50,120" stroke="#C4704A" fill="none" stroke-width="0.4" opacity="0.07"/><path d="M45,55 L120,65" stroke="#C4704A" fill="none" stroke-width="0.3" opacity="0.06"/><path d="M120,65 L115,0" stroke="#C4704A" fill="none" stroke-width="0.3" opacity="0.05"/><path d="M120,65 L110,120" stroke="#C4704A" fill="none" stroke-width="0.3" opacity="0.05"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
  { id: 'lavender-mist', label: 'Lavender Mist', category: 'minimal', bg: '#F0E8F5', accent: '#7B5EA7', text: '#2A1A3A', textMuted: '#8A7A9A', qrDark: '#2A1A3A', qrLight: '#F0E8F5', decorations: false, borderStyle: 'none',
    patternSvg: `<defs><pattern id="p" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="15" cy="20" r="8" fill="#7B5EA7" opacity="0.03"/><circle cx="60" cy="10" r="5" fill="#7B5EA7" opacity="0.04"/><circle cx="85" cy="45" r="10" fill="#7B5EA7" opacity="0.025"/><circle cx="30" cy="65" r="6" fill="#7B5EA7" opacity="0.035"/><circle cx="70" cy="80" r="8" fill="#7B5EA7" opacity="0.03"/><circle cx="10" cy="90" r="4" fill="#7B5EA7" opacity="0.04"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` },
];

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  elegant: 'Elegantes',
  professional: 'Profesionales',
  modern: 'Modernas',
  fun: 'Divertidas',
  geometric: 'Geométricas',
  minimal: 'Mínimas',
};

// ─── Fonts ──────────────────────────────────────────

const FONTS: FontDef[] = [
  { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", category: 'Elegante', type: 'serif' },
  { id: 'cormorant', label: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", category: 'Elegante', type: 'serif' },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", category: 'Profesional', type: 'sans' },
  { id: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif", category: 'Profesional', type: 'sans' },
  { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif", category: 'Moderna', type: 'sans' },
  { id: 'inter', label: 'Inter', family: "'Inter', sans-serif", category: 'Moderna', type: 'sans' },
];

// ─── Props ──────────────────────────────────────────

interface QRDesignerProps {
  tableId: string;
  tableNumber: number;
  menuUrl: string;
  onClose: () => void;
  totalTables?: number;
}

// ─── Component ──────────────────────────────────────

export default function QRDesigner({ tableId, tableNumber, menuUrl, onClose, totalTables = 1 }: QRDesignerProps) {
  // Data
  const [loading, setLoading] = useState(true);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState('');

  // Design state
  const [template, setTemplate] = useState('classic-gold');
  const [font, setFont] = useState('playfair');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [callToAction, setCallToAction] = useState('Escanea para ver el menú');
  const [showTableNum, setShowTableNum] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  const [logoSize, setLogoSize] = useState(30);
  const [logoPosition, setLogoPosition] = useState<'top' | 'center' | 'bottom'>('top');
  const [logoShape, setLogoShape] = useState<'original' | 'circle' | 'rounded'>('original');
  const [qrSize, setQrSize] = useState(45);
  const [qrStyle, setQrStyle] = useState<'square' | 'rounded' | 'dots'>('square');
  const [showDecorations, setShowDecorations] = useState(true);
  const [format, setFormat] = useState<'png' | 'pdf'>('png');
  const [categoryTab, setCategoryTab] = useState<TemplateCategory>('elegant');

  // Download state
  const [downloading, setDownloading] = useState(false);
  const [downloadingBatch, setDownloadingBatch] = useState(false);

  const tpl = TEMPLATES.find(t => t.id === template) ?? TEMPLATES[0];
  const fnt = FONTS.find(f => f.id === font) ?? FONTS[0];

  // ─── Load data ────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tenant, qrData] = await Promise.all([
          apiFetch<Restaurant>('/tenants/me', { auth: true }),
          apiFetch<QRData>(`/tables/${tableId}/qr`, { auth: true }),
        ]);
        if (cancelled) return;
        setLogoUrl(tenant.logoUrl);
        setRestaurantName(tenant.name);
        setTitle(tenant.name);
        setQrPreview(qrData.qrCode);
      } catch {
        toast.error('Error cargando datos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tableId]);

  // ─── Load Google Fonts ────────────────────────────

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Cormorant+Garamond:wght@400;600&family=Montserrat:wght@400;600&family=Raleway:wght@400;600&family=Poppins:wght@400;600&family=Inter:wght@400;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // ─── Minimal template auto-disable decorations ────

  useEffect(() => {
    const t = TEMPLATES.find(tp => tp.id === template);
    if (t?.category === 'minimal') {
      setShowDecorations(false);
    }
  }, [template]);

  // ─── Reset to defaults ────────────────────────────

  const resetDefaults = useCallback(() => {
    setTemplate('classic-gold');
    setFont('playfair');
    setTitle(restaurantName);
    setSubtitle('');
    setCallToAction('Escanea para ver el menú');
    setShowTableNum(true);
    setShowLogo(true);
    setLogoSize(30);
    setLogoPosition('top');
    setLogoShape('original');
    setQrSize(45);
    setQrStyle('square');
    setShowDecorations(true);
    setFormat('png');
    setCategoryTab('elegant');
  }, [restaurantName]);

  // ─── Download handlers ────────────────────────────

  const buildPayload = () => ({
    template,
    font,
    title: title.trim(),
    subtitle: subtitle.trim(),
    callToAction: callToAction.trim(),
    showTableNumber: showTableNum,
    logoSize,
    logoPosition,
    logoShape,
    qrSize,
    qrStyle,
    showDecorations,
    format,
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await apiFetchBlob(`/tables/${tableId}/qr-branded`, {
        method: 'POST',
        body: buildPayload(),
        auth: true,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mesa-${tableNumber}-qr.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`QR Mesa ${tableNumber} descargado`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al descargar');
    } finally {
      setDownloading(false);
    }
  };

  const handleBatchDownload = async () => {
    setDownloadingBatch(true);
    try {
      const { format: _f, ...rest } = buildPayload();
      const blob = await apiFetchBlob('/tables/batch-qr', {
        method: 'POST',
        body: rest,
        auth: true,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qr-mesas.zip';
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${totalTables} QR descargados`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al descargar');
    } finally {
      setDownloadingBatch(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────

  const filteredTemplates = TEMPLATES.filter(t => t.category === categoryTab);

  // ─── Render ───────────────────────────────────────

  if (loading) {
    return (
      <Modal title={`Diseñar QR — Mesa ${tableNumber}`} onClose={onClose}>
        <div className="py-16 text-center">
          <Loader2 className="h-8 w-8 text-gold animate-spin mx-auto mb-3" />
          <p className="text-silver-muted text-sm">Cargando diseñador...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Diseñar QR — Mesa ${tableNumber}`} onClose={onClose} maxWidth="max-w-5xl">
      <div className="flex flex-col lg:flex-row gap-5">
        {/* ─── Left: Live Preview ─────────────────── */}
        <div className="lg:w-[45%] shrink-0 flex flex-col items-center">
          <div className="w-full max-w-[320px] sticky top-0">
            <PreviewCard
              tpl={tpl}
              fnt={fnt}
              title={title}
              subtitle={subtitle}
              callToAction={callToAction}
              showTableNum={showTableNum}
              tableNumber={tableNumber}
              showLogo={showLogo}
              logoUrl={logoUrl}
              logoSize={logoSize}
              logoPosition={logoPosition}
              logoShape={logoShape}
              qrPreview={qrPreview}
              qrSize={qrSize}
              qrStyle={qrStyle}
              showDecorations={showDecorations}
            />
            <p className="text-center text-silver-dark text-[10px] mt-2 truncate">{menuUrl}</p>
          </div>
        </div>

        {/* ─── Right: Controls ────────────────────── */}
        <div className="lg:w-[55%] space-y-5 overflow-y-auto max-h-[65vh] pr-1 custom-scrollbar">

          {/* PLANTILLA */}
          <Section title="PLANTILLA">
            <div className="flex gap-1 mb-3">
              {(Object.keys(CATEGORY_LABELS) as TemplateCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryTab(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                    categoryTab === cat
                      ? 'bg-gold/15 text-gold border border-gold/30'
                      : 'text-silver-dark hover:text-silver border border-transparent'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {filteredTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTemplate(t.id);
                    setCategoryTab(t.category);
                  }}
                  className={`relative rounded-lg overflow-hidden transition-all ${
                    template === t.id
                      ? 'ring-2 ring-gold ring-offset-1 ring-offset-tonalli-black'
                      : 'ring-1 ring-light-border hover:ring-silver-dark'
                  }`}
                >
                  {/* Mini preview thumbnail */}
                  <div
                    className="aspect-[2/3] relative flex flex-col items-center justify-center gap-1 p-2"
                    style={{ backgroundColor: t.bg }}
                  >
                    {t.patternSvg && (
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        xmlns="http://www.w3.org/2000/svg"
                        preserveAspectRatio="none"
                        dangerouslySetInnerHTML={{ __html: t.patternSvg }}
                      />
                    )}
                    {t.borderStyle !== 'none' && (
                      <div
                        className="absolute inset-[3px] rounded pointer-events-none"
                        style={{ border: `1px solid ${t.accent}40` }}
                      />
                    )}
                    <div className="w-3 h-0.5 rounded-full relative z-10" style={{ backgroundColor: t.accent }} />
                    <div className="w-6 h-1 rounded-sm relative z-10" style={{ backgroundColor: t.text, opacity: 0.6 }} />
                    <div className="w-5 h-5 rounded-sm mt-0.5 relative z-10" style={{ backgroundColor: t.qrDark, opacity: 0.3 }} />
                    <div className="w-4 h-0.5 rounded-full mt-0.5 relative z-10" style={{ backgroundColor: t.accent, opacity: 0.5 }} />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm px-1 py-0.5">
                    <p className="text-[8px] text-white/80 text-center truncate">{t.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* LOGO */}
          {logoUrl && (
            <Section title="LOGO">
              <label className="flex items-center gap-2 text-xs text-silver cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={showLogo}
                  onChange={e => setShowLogo(e.target.checked)}
                  className="accent-gold w-3.5 h-3.5 rounded"
                />
                Mostrar logo
              </label>
              {showLogo && (
                <div className="space-y-3">
                  <SliderControl label="Tamaño" value={logoSize} min={10} max={50} unit="%" onChange={setLogoSize} />
                  <div>
                    <p className="text-silver-dark text-[11px] mb-1.5">Posición</p>
                    <div className="flex gap-1.5">
                      {(['top', 'center', 'bottom'] as const).map(pos => (
                        <ToggleBtn key={pos} active={logoPosition === pos} onClick={() => setLogoPosition(pos)}>
                          {pos === 'top' ? 'Arriba' : pos === 'center' ? 'Centro' : 'Abajo'}
                        </ToggleBtn>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-silver-dark text-[11px] mb-1.5">Forma</p>
                    <div className="flex gap-1.5">
                      {(['original', 'circle', 'rounded'] as const).map(sh => (
                        <ToggleBtn key={sh} active={logoShape === sh} onClick={() => setLogoShape(sh)}>
                          {sh === 'original' ? 'Original' : sh === 'circle' ? 'Circular' : 'Redondeada'}
                        </ToggleBtn>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* TEXTOS */}
          <Section title="TEXTOS">
            <TextInput label="Título principal" value={title} max={60} onChange={setTitle} />
            <TextInput label="Subtítulo" value={subtitle} max={80} onChange={setSubtitle} placeholder="Ej: Restaurante & Bar" />
            <TextInput label="Instrucción" value={callToAction} max={80} onChange={setCallToAction} />
          </Section>

          {/* TIPOGRAFÍA */}
          <Section title="TIPOGRAFÍA">
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFont(f.id)}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    font === f.id
                      ? 'border-gold bg-gold/10 text-white'
                      : 'border-light-border bg-tonalli-black text-silver-dark hover:border-silver-dark hover:text-silver'
                  }`}
                >
                  <span className="text-sm block leading-tight" style={{ fontFamily: f.family }}>
                    {f.label}
                  </span>
                  <span className="text-[10px] text-silver-dark mt-0.5 block">{f.category}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* QR */}
          <Section title="QR">
            <SliderControl label="Tamaño" value={qrSize} min={30} max={70} unit="%" onChange={setQrSize} />
            <div>
              <p className="text-silver-dark text-[11px] mb-1.5">Estilo</p>
              <div className="flex gap-1.5">
                {(['square', 'rounded', 'dots'] as const).map(s => (
                  <ToggleBtn key={s} active={qrStyle === s} onClick={() => setQrStyle(s)}>
                    {s === 'square' ? 'Cuadrado' : s === 'rounded' ? 'Redondeado' : 'Puntos'}
                  </ToggleBtn>
                ))}
              </div>
            </div>
          </Section>

          {/* OPCIONES */}
          <Section title="OPCIONES">
            <label className="flex items-center gap-2 text-xs text-silver cursor-pointer">
              <input type="checkbox" checked={showTableNum} onChange={e => setShowTableNum(e.target.checked)} className="accent-gold w-3.5 h-3.5 rounded" />
              Mostrar número de mesa
            </label>
            <label className="flex items-center gap-2 text-xs text-silver cursor-pointer">
              <input
                type="checkbox"
                checked={showDecorations}
                onChange={e => setShowDecorations(e.target.checked)}
                disabled={tpl.category === 'minimal'}
                className="accent-gold w-3.5 h-3.5 rounded disabled:opacity-40"
              />
              <span className={tpl.category === 'minimal' ? 'opacity-40' : ''}>Mostrar decoraciones</span>
            </label>
            <div>
              <p className="text-silver-dark text-[11px] mb-1.5">Formato de descarga</p>
              <div className="flex gap-1.5">
                <ToggleBtn active={format === 'png'} onClick={() => setFormat('png')}>PNG</ToggleBtn>
                <ToggleBtn active={format === 'pdf'} onClick={() => setFormat('pdf')}>PDF</ToggleBtn>
              </div>
            </div>
            <button
              onClick={resetDefaults}
              className="flex items-center gap-1.5 text-[11px] text-silver-dark hover:text-silver transition-colors mt-1"
            >
              <RotateCcw size={11} />
              Restaurar predeterminados
            </button>
          </Section>

          {/* ACTION BUTTONS */}
          <div className="space-y-2 pt-2 border-t border-light-border">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gold text-tonalli-black font-semibold text-sm hover:bg-gold/90 transition-colors disabled:opacity-60"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {downloading ? 'Generando...' : `Descargar Mesa ${tableNumber}`}
            </button>
            <button
              onClick={handleBatchDownload}
              disabled={downloadingBatch}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gold text-gold font-medium text-sm hover:bg-gold/10 transition-colors disabled:opacity-60"
            >
              {downloadingBatch ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
              {downloadingBatch ? 'Generando ZIP...' : `Descargar ${totalTables} Mesas (ZIP)`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Sub-components ─────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-2">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors border ${
        active
          ? 'bg-gold/15 text-gold border-gold/30'
          : 'bg-tonalli-black text-silver-dark border-light-border hover:text-silver hover:border-silver-dark'
      }`}
    >
      {children}
    </button>
  );
}

function SliderControl({ label, value, min, max, unit, onChange }: {
  label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-silver-dark text-[11px]">{label}</p>
        <span className="text-gold text-[11px] font-medium tabular-nums">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 appearance-none bg-light-border rounded-full cursor-pointer accent-gold [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}

function TextInput({ label, value, max, onChange, placeholder }: {
  label: string; value: string; max: number; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-silver-dark text-[11px]">{label}</p>
        <span className="text-silver-dark text-[10px] tabular-nums">{value.length}/{max}</span>
      </div>
      <input
        type="text"
        value={value}
        maxLength={max}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-tonalli-black border border-light-border rounded-lg px-3 py-2 text-white text-xs focus:border-gold/50 focus:outline-none transition-colors placeholder:text-silver-dark/50"
      />
    </div>
  );
}

// ─── Live Preview Card ──────────────────────────────

interface PreviewCardProps {
  tpl: TemplateDef;
  fnt: FontDef;
  title: string;
  subtitle: string;
  callToAction: string;
  showTableNum: boolean;
  tableNumber: number;
  showLogo: boolean;
  logoUrl: string | null;
  logoSize: number;
  logoPosition: 'top' | 'center' | 'bottom';
  logoShape: 'original' | 'circle' | 'rounded';
  qrPreview: string | null;
  qrSize: number;
  qrStyle: 'square' | 'rounded' | 'dots';
  showDecorations: boolean;
}

function PreviewCard({
  tpl, fnt, title, subtitle, callToAction, showTableNum, tableNumber,
  showLogo, logoUrl, logoSize, logoPosition, logoShape,
  qrPreview, qrSize, qrStyle, showDecorations,
}: PreviewCardProps) {
  const cornerSize = 14;
  const hasBorder = tpl.borderStyle !== 'none' && showDecorations;
  const hasCorners = showDecorations && tpl.decorations;
  const isMinimal = tpl.category === 'minimal';

  const logoClasses =
    logoShape === 'circle' ? 'rounded-full overflow-hidden' :
    logoShape === 'rounded' ? 'rounded-xl overflow-hidden' : '';

  const qrClasses =
    qrStyle === 'rounded' ? 'rounded-lg' :
    qrStyle === 'dots' ? 'rounded-2xl' : '';

  const renderLogo = () => {
    if (!showLogo || !logoUrl) return null;
    return (
      <div className="flex justify-center" style={{ width: '100%' }}>
        <div
          className={`${logoClasses}`}
          style={{ width: `${logoSize}%`, maxWidth: `${logoSize}%` }}
        >
          <img
            src={logoUrl}
            alt="Logo"
            className="w-full h-auto object-contain"
            draggable={false}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden shadow-2xl transition-colors duration-300"
      style={{
        aspectRatio: '2 / 3',
        backgroundColor: tpl.bg,
      }}
    >
      {/* Pattern overlay */}
      {tpl.patternSvg && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          {...(tpl.patternViewBox ? { viewBox: tpl.patternViewBox } : {})}
          dangerouslySetInnerHTML={{ __html: tpl.patternSvg }}
        />
      )}

      {/* Border inset */}
      {hasBorder && (
        <div
          className="absolute pointer-events-none rounded-lg"
          style={{
            inset: '5%',
            border: `1px solid ${tpl.accent}${tpl.borderStyle === 'ornate' ? '60' : '35'}`,
          }}
        />
      )}

      {/* Corner decorations */}
      {hasCorners && (
        <>
          {/* Top-left */}
          <div className="absolute" style={{ top: '4%', left: '4%', width: cornerSize, height: cornerSize, borderTop: `2px solid ${tpl.accent}`, borderLeft: `2px solid ${tpl.accent}` }} />
          {/* Top-right */}
          <div className="absolute" style={{ top: '4%', right: '4%', width: cornerSize, height: cornerSize, borderTop: `2px solid ${tpl.accent}`, borderRight: `2px solid ${tpl.accent}` }} />
          {/* Bottom-left */}
          <div className="absolute" style={{ bottom: '4%', left: '4%', width: cornerSize, height: cornerSize, borderBottom: `2px solid ${tpl.accent}`, borderLeft: `2px solid ${tpl.accent}` }} />
          {/* Bottom-right */}
          <div className="absolute" style={{ bottom: '4%', right: '4%', width: cornerSize, height: cornerSize, borderBottom: `2px solid ${tpl.accent}`, borderRight: `2px solid ${tpl.accent}` }} />
        </>
      )}

      {/* Content */}
      <div
        className="absolute flex flex-col items-center text-center"
        style={{
          inset: isMinimal ? '8%' : '6%',
          fontFamily: fnt.family,
        }}
      >
        {/* Logo top */}
        {logoPosition === 'top' && renderLogo()}

        {/* Decorative line */}
        {showDecorations && tpl.decorations && (
          <div className="w-8 mx-auto my-2" style={{ height: 1, backgroundColor: `${tpl.accent}60` }} />
        )}

        {/* Title */}
        {title && (
          <h3
            className="font-semibold leading-tight transition-all duration-300"
            style={{
              color: tpl.text,
              fontSize: isMinimal ? '0.85rem' : '0.9rem',
              letterSpacing: '0.08em',
              marginTop: isMinimal ? '0.5rem' : '0.25rem',
            }}
          >
            {title.toUpperCase()}
          </h3>
        )}

        {/* Subtitle */}
        {subtitle && (
          <p
            className="mt-1 tracking-widest uppercase transition-all duration-300"
            style={{
              color: tpl.textMuted,
              fontSize: '0.55rem',
              letterSpacing: '0.15em',
            }}
          >
            {subtitle}
          </p>
        )}

        {/* Logo center */}
        {logoPosition === 'center' && <div className="mt-2">{renderLogo()}</div>}

        {/* Spacer before QR */}
        <div className="flex-1 min-h-1" />

        {/* QR Code */}
        {qrPreview && (
          <div
            className={`mx-auto bg-white p-[6%] transition-all duration-300 ${qrClasses}`}
            style={{ width: `${qrSize}%` }}
          >
            <img
              src={qrPreview}
              alt="QR Code"
              className={`w-full h-auto ${qrClasses}`}
              draggable={false}
            />
          </div>
        )}

        {/* Table number */}
        {showTableNum && (
          <p
            className="mt-2 font-semibold tracking-[0.2em] transition-all duration-300"
            style={{
              color: tpl.accent,
              fontSize: '0.7rem',
            }}
          >
            MESA {tableNumber}
          </p>
        )}

        {/* Call to action */}
        {callToAction && (
          <p
            className="mt-1 transition-all duration-300"
            style={{
              color: tpl.textMuted,
              fontSize: '0.5rem',
              letterSpacing: '0.05em',
            }}
          >
            {callToAction}
          </p>
        )}

        {/* Logo bottom */}
        {logoPosition === 'bottom' && <div className="mt-2">{renderLogo()}</div>}

        {/* Spacer */}
        <div className="flex-1 min-h-1" />

        {/* Bottom branding */}
        <div className="flex flex-col items-center gap-0.5 mt-auto" style={{ opacity: 0.35 }}>
          {showDecorations && tpl.decorations && (
            <div className="w-6 mx-auto mb-1" style={{ height: 1, backgroundColor: `${tpl.accent}40` }} />
          )}
          <div className="flex items-center gap-1">
            <img src="/tonalli-logo.svg" alt="" className="w-2.5 h-2.5" draggable={false} style={{ opacity: 0.7 }} />
            <span style={{ color: tpl.textMuted, fontSize: '0.4rem', letterSpacing: '0.15em', fontFamily: "'Inter', sans-serif" }}>
              TONALLI
            </span>
          </div>
          <span style={{ color: tpl.textMuted, fontSize: '0.35rem', fontFamily: "'Inter', sans-serif", opacity: 0.7 }}>
            tonalli.app
          </span>
        </div>
      </div>
    </div>
  );
}
