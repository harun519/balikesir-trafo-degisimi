// Contract between the native selection panel and the existing history/new-record adapters.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname,'../app/TrafoHarita.tsx'),'utf8');
const helpers = source.slice(source.indexOf('type GeoFeature'), source.indexOf('export default function TrafoHarita'));
const context = {module:{exports:{}}};
vm.runInNewContext(ts.transpileModule(helpers+'\nmodule.exports={noktaPopup,noktaKoordinati};',{
  compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}
}).outputText,context);
const {noktaPopup,noktaKoordinati} = context.module.exports;
const html = noktaPopup({ADI:'TEST TRAFO',ILCE:'BALYA',MAHALLE:'ÖRNEK MAHALLE',LOKASYON_I:'LK-1',ID:'101',GUC:160,__HARITA_SINIFI:'BINA'},[
  {id:1,degisim_nedeni:'ARIZA',tarih:'2026-10-01'}
]);
const text = html.replace(/<\/(?:div|summary|details)>/g,'\n').replace(/<[^>]*>/g,'');
const field = label=>text.match(new RegExp('(?:^|\\n)'+label+':\\s*([^\\n]+)','i'))?.[1]?.trim();
assert.equal(text.split('\n')[0],'TEST TRAFO');
assert.equal(field('Lokasyon ID'),'LK-1');
assert.equal(field('Trafo ID'),'101');
assert.equal(field('İlçe'),'BALYA');
assert.equal(field('Mahalle'),'ÖRNEK MAHALLE');
assert.equal(field('Montaj Tipi'),'Bina Tipi');
assert.match(text,/1 değişim kaydı/);
assert.match(html,/<details class="map-technical-details">/);
assert(!html.includes('min-width:250px'));
const unsafe = noktaPopup({ADI:'<img src=x onerror=alert(1)>',LOKASYON_I:'<script>x</script>'},[]);
assert(!unsafe.includes('<img')&&!unsafe.includes('<script>'));
assert.match(unsafe,/Değişim kaydı yok/);
assert.deepEqual(Array.from(noktaKoordinati({geometry:{type:'Point',coordinates:[27.56,39.75]}})),[27.56,39.75]);
console.log('PASS: selection fields support history/new-record adapters; technical details collapse; unsafe inventory text escapes; coordinates remain exact.');
