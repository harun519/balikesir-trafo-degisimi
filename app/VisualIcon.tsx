import type { ReactNode } from 'react';

const paths:Record<string,ReactNode>={
 lock:<><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/></>,
 logout:<><path d="M9 3H4v18h5M14 7l5 5-5 5M8 12h11"/></>,
 dashboard:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
 power:<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>,
 pin:<><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
 chart:<><path d="M4 3v17h17M8 15l4-5 4 2 5-7"/></>,
 plus:<path d="M12 5v14M5 12h14"/>,
 records:<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
 map:<><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15"/></>,
 tag:<><path d="M20 13 11 22 2 13V3h10l8 10Z"/><circle cx="7" cy="8" r="1"/></>,
 shield:<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6"/>,
 backup:<><path d="M4 8V3m0 5h5M4 8a9 9 0 1 1-1 8"/><path d="M12 7v5l3 2"/></>,
 print:<><path d="M6 9V3h12v6M6 17H3V9h18v8h-3"/><path d="M6 14h12v7H6z"/></>,
 edit:<><path d="m15 4 5 5M4 20l4-1L21 6l-5-5L3 14l1 6Z"/></>,
 layers:<><path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/></>,
 fullscreen:<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>,
 locate:<><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></>,
};
export default function VisualIcon({name,className=''}:{name:string;className?:string}){
 return <svg className={`tv-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]||paths.records}</svg>;
}
const menuIcons:Record<string,string>={'Kontrol Paneli':'dashboard','Neden × Güç Analizi':'power','İlçe Analizi':'pin','Trafo Güç Analizi':'chart','Yeni Kayıt':'plus','Trafo Kayıtları':'records','Trafo Haritası':'map','Trafo Markaları':'tag','Veri Kalitesi':'shield','Yedekleme Merkezi':'backup'};
export function NavigationLabel({children}:{children:ReactNode}){
 const label=typeof children==='string'?children.replace(/^[^\p{L}\p{N}]+/u,'').trim():'';
 return <><VisualIcon name={menuIcons[label]||'records'}/><span>{label||children}</span></>;
}
