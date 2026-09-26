import {Resvg} from '@resvg/resvg-js';

export function rasterizeSvg(svg,{width,loadSystemFonts=true}={}){
  return new Resvg(svg,{fitTo:{mode:'width',value:width},font:{loadSystemFonts}}).render().asPng();
}
