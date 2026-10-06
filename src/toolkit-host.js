/** Same-origin module host: schedule snapshots flow out; explicit Open actions flow in. */
export class ToolkitHost {
  constructor({onOpen,onError=console.error}){
    this.onOpen=onOpen;this.onError=onError;this.ready=false;this.sequence=0;
    this.element=document.createElement('section');this.element.id='toolkitHost';this.element.hidden=true;
    this.status=document.createElement('p');this.status.className='muted';this.status.textContent='Loading project tools…';this.status.setAttribute('role','status');
    this.frame=document.createElement('iframe');this.frame.id='toolkitFrame';this.frame.title='AI Studio and schedule assessment';
    this.frame.src='./toolkit/index.html';this.element.append(this.status,this.frame);
    document.querySelector('#view').after(this.element);
    window.addEventListener('message',e=>{
      if(e.source!==this.frame.contentWindow||e.origin!==location.origin||e.data?.channel!=='studio8') return;
      if(e.data.type==='ready'){this.ready=true;if(this.pending)this.send(this.pending);}
      if(e.data.type==='complete'&&e.data.requestId===this.sequence){this.status.textContent='Schedule snapshots synchronised. Choose references explicitly in the repository or report.';this.status.hidden=true;}
      if(e.data.type==='error'){this.status.hidden=false;this.status.textContent='Could not synchronise: '+e.data.message;this.onError(e.data.message);}
      if(e.data.type==='openSchedule')this.onOpen(e.data);
    });
  }
  show(payload){document.querySelector('.p6-main').classList.add('toolkit-active');this.element.hidden=false;this.pending=payload;this.status.hidden=false;this.status.textContent='Synchronising schedules…';if(this.ready)this.send(payload);}
  send(payload){this.frame.contentWindow.postMessage({...payload,channel:'studio8',type:'open',requestId:++this.sequence},location.origin);}
  hide(){this.element.hidden=true;document.querySelector('.p6-main').classList.remove('toolkit-active');}
  print(){this.frame.contentWindow.postMessage({channel:'studio8',type:'print'},location.origin);}
}
export const AI_MODULES={contracts:'Contract Manager',drawing:'Drawing Measurement',manpower:'Manpower Breakout',risk:'Risk Analysis',claims:'Claims & Forensics',builder:'Schedule Builder',settings:'AI Settings'};
export const TOOLKIT_REPORTS={'progress-integrity':'Progress Integrity',floatpaths:'Float Paths',dcma:'DCMA 14-Point',whymove:'Why Date Moved',delay:'Delay Analysis',forensic:'Forensic Review',windows:'Window Analysis',calendar:'Calendar Analyser',forecast:'Forecast Confidence',timemachine:'Time Machine',milestones:'Milestone Control',resourceforensics:'Resource Forensics'};
