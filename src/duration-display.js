/** Display conversions only; schedule storage and exports remain in hours. */
export function durationHoursPerDay(model,task,fallback=8){
 const project=model.find('PROJECT','proj_id',String(task.proj_id));
 const calendar=model.find('CALENDAR','clndr_id',String(task.clndr_id||project?.clndr_id||''));
 const hours=Number(calendar?.day_hr_cnt);
 return Number.isFinite(hours)&&hours>0?hours:(Number(fallback)>0?Number(fallback):8);
}
export function durationHoursPerUnit(model,task,unit,fallback=8){
 if(unit==='hours')return 1;
 const day=durationHoursPerDay(model,task,fallback),project=model.find('PROJECT','proj_id',String(task.proj_id));
 const calendar=model.find('CALENDAR','clndr_id',String(task.clndr_id||project?.clndr_id||''));
 const period=Number(calendar?.[unit==='weeks'?'week_hr_cnt':'month_hr_cnt']);
 return unit==='days'?day:(Number.isFinite(period)&&period>0?period:day*(unit==='weeks'?5:21.5));
}
export function displayOriginalDuration(hours,unit,hoursPerUnit){return Number(hours||0)/(unit==='hours'?1:hoursPerUnit)}
export function originalDurationHours(value,unit,hoursPerUnit){
 if(String(value).trim()===''||!Number.isFinite(Number(value))||Number(value)<0)throw new Error('Duration must be a non-negative number.');
 return Number(value)*(unit==='hours'?1:hoursPerUnit);
}
