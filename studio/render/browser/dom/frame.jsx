import {createContext, useContext} from 'react';
import {frameIndex, localWindow} from './timing.js';

// Remotion-shaped primitives. They read the t the capture loop just set.
// They do not subscribe to a display refresh. Sequence keeps its children
// mounted for the whole shot so a paused GSAP timeline can target them,
// and hides them outside [from, from + duration).

const FrameContext = createContext({t: 0, fps: 30});

export function FrameClock({t, fps = 30, children}) {
  return <FrameContext.Provider value={{t: Number(t), fps}}>{children}</FrameContext.Provider>;
}

export function useFrame() {
  return useContext(FrameContext).t;
}

export function useCurrentFrame() {
  const {t, fps} = useContext(FrameContext);
  return frameIndex(t, fps);
}

export function Sequence({from = 0, duration = null, name, children}) {
  const parent = useContext(FrameContext);
  const window = localWindow(parent.t, from, duration);
  return (
    <FrameContext.Provider value={{t: window.local, fps: parent.fps}}>
      <div
        data-sequence={name || ''}
        data-active={window.active ? '1' : '0'}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          visibility: window.active ? 'visible' : 'hidden',
        }}
      >
        {children}
      </div>
    </FrameContext.Provider>
  );
}

export function AbsoluteFill({children, style}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
