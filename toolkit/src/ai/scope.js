/** AI is available only from the visible AI Studio workspace. */
export function assertAIStudioScope(){
 if(typeof window==='undefined')return; // Headless model/transport unit tests.
 let allowed=false;
 try{allowed=window.parent!==window && window.parent.document.querySelector('#nav [data-view="aiStudio"]')?.classList.contains('active') && !window.parent.document.querySelector('#toolkitHost')?.hidden && ['contracts','drawing','manpower','risk','claims','builder','settings'].includes(document.documentElement.dataset.studioView);}catch{}
 if(!allowed)throw new Error('AI is available only in AI Studio. Open AI Studio to use or test a model.');
}
