import {installCaptureClock} from './gsap_clock.js';
import {createStageController} from './stage.js';

installCaptureClock();

const controller = createStageController();

globalThis.SWKinetic = {
  mount(element, spec) {
    return controller.mount(element, spec);
  },
  seek(t) {
    return controller.seek(t);
  },
};
