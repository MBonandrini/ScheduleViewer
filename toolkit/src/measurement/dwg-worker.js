// Optional GPL-3.0 LibreDWG adapter executes in a separate worker, installed by tools/setup-cad.mjs.
self.onmessage=async e=>{
 try{
  const {LibreDwg,Dwg_File_Type}=await import('../../vendor/dwg/dist/libredwg-web.js');
  const reader=await LibreDwg.create(new URL('../../vendor/dwg/wasm/',import.meta.url).href.replace(/\/$/,''));
  const ptr=reader.dwg_read_data(e.data,Dwg_File_Type.DWG);if(!ptr)throw new Error('DWG decoder returned no drawing.');
  try{const db=reader.convert(ptr);const svg=reader.dwg_to_svg(db);if(!svg||!/<(?:path|line|polyline|circle|ellipse|text)\b/.test(svg))throw new Error('No supported 2D entities found. Export the drawing to PDF.');self.postMessage({svg})}finally{reader.dwg_free(ptr)}
 }catch(error){self.postMessage({error:`DWG preview unavailable: ${error.message}. If decoder assets are missing, the site maintainer must rebuild the GitHub Pages deployment. You can also use a PDF export. DWG proxy/3D entities may require the originating CAD application.`})}
};
