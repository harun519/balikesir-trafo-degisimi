export const MONTHS=['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
export function normalizeTrafoRecord(input:Record<string,unknown>){
 const value={...input};const errors:string[]=[];
 for(const [key,v] of Object.entries(value))if(typeof v==='string')value[key]=v.trim()||null;
 if(value.tarih){const date=String(value.tarih).slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)errors.push('Geçerli tarih girin.');else{value.tarih=date;value.yil=Number(date.slice(0,4));value.ay=MONTHS[Number(date.slice(5,7))-1];}}
 if(!Number.isInteger(Number(value.yil))||Number(value.yil)<2017||Number(value.yil)>new Date().getFullYear()+2)errors.push('Geçerli yıl gerekli.');
 if(!MONTHS.includes(String(value.ay||'')))errors.push('Geçerli ay gerekli.');
 if(!value.ilce)errors.push('İlçe gerekli.');
 if(!value.degisim_nedeni)errors.push('Değişim nedeni gerekli.');
 if(!value.trafo_id&&!value.lokasyon_id&&!value.tr)errors.push('Trafo, lokasyon veya TR kimliği gerekli.');
 return {value,errors};
}
