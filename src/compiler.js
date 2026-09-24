import {validateVideoSpec} from './validate.js';
export function compileContentPlan(plan){
 const spec={schemaVersion:'0.2',width:plan.output?.width??1280,height:plan.output?.height??720,fps:plan.output?.fps??30,duration:plan.duration,background:plan.style?.background??'#F7F2E8',palette:plan.style?.palette??{ink:'#17221E',accent:'#D97745',secondary:'#5A8F8A',paper:'#F7F2E8',captionBg:'#17221E',white:'#fff'},captionStyle:plan.captionStyle??{fontSize:26},scenes:plan.scenes,captions:plan.captions??[]};
 validateVideoSpec(spec); return spec;
}
