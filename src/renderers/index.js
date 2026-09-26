import {frameSvg} from './svg.js';

export const renderers = {
  svg: {
    id: 'svg',
    renderFrame(spec,time){
      return frameSvg(spec,time);
    }
  }
};

export function getRenderer(id='svg'){
  const renderer=renderers[id];
  if(!renderer) throw new Error('Unknown renderer: '+id);
  return renderer;
}
