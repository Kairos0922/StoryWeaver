import {Aperture, Layers, Timer, Type} from 'lucide-react';
import {AbsoluteFill, Sequence, useCurrentFrame, useFrame} from './frame.jsx';
import {createSeekTimeline} from './gsap_clock.js';

const PAPER = '#EFE7DA';
const INK = '#101820';
const STAMP = '#FF4D2E';
const QUIET = '#6E675F';

const ICONS = {
  clock: Timer,
  type: Type,
  stack: Layers,
  post: Aperture,
};

const ROW_TOP = {
  clock: 392,
  type: 480,
  stack: 568,
  post: 656,
};

function shotData() {
  const shot = globalThis.__shot;
  if (!shot?.copy || !shot.events) throw new Error('title-card shot.json was not loaded');
  return shot;
}

function eventAt(shot, id) {
  const event = shot.events.find(item => item.id === id);
  if (!event) throw new Error(`title-card shot is missing event ${id}`);
  return event.t;
}

function KineticWord({id, text, size, color}) {
  const chars = [...text];
  return (
    <div
      data-word={id}
      style={{
        display: 'flex',
        height: Math.round(size * 1.05),
        color,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: '-0.045em',
        lineHeight: 1,
      }}
    >
      {chars.map((ch, index) => (
        <span key={`${id}-${index}`} data-mask="1" style={{display: 'inline-block', overflow: 'hidden', height: '100%'}}>
          <span data-ch="1" style={{display: 'inline-block'}}>{ch === ' ' ? '\u00A0' : ch}</span>
        </span>
      ))}
    </div>
  );
}

function Flourish({span, frames}) {
  const local = useFrame();
  const current = useCurrentFrame();
  const progress = Math.max(0, Math.min(1, local / span));
  const frame = Math.round(progress * frames);
  return (
    <div
      data-lottie="flourish"
      data-frame={frame}
      data-current-frame={current}
      style={{position: 'absolute', left: 96, top: 470, width: 520, height: 48}}
    />
  );
}

function IndexRow({id, label}) {
  const Icon = ICONS[id];
  if (!Icon) throw new Error(`title-card has no icon for ${id}`);
  return (
    <div
      data-k={id}
      style={{
        position: 'absolute',
        left: 1188,
        top: ROW_TOP[id],
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        color: INK,
        fontWeight: 500,
        fontSize: 28,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
      }}
    >
      <Icon size={32} strokeWidth={1.75} color={INK} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function TitleCard() {
  const shot = shotData();
  const {copy, flourish} = shot;
  const time = eventAt(shot, 'time');
  const frame = eventAt(shot, 'frame');
  const stack = eventAt(shot, 'stack');
  const lockup = eventAt(shot, 'lockup');
  const end = shot.duration_s;
  return (
    <AbsoluteFill style={{background: PAPER, color: INK, fontFamily: '"SW CJK", sans-serif'}}>
      <div
        data-k="panel"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1120,
          height: '100%',
          background: INK,
          transformOrigin: 'left center',
        }}
      />
      <div
        data-k="eyebrow"
        style={{
          position: 'absolute',
          left: 88,
          top: 128,
          color: PAPER,
          fontWeight: 500,
          fontSize: 22,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
        }}
      >
        {copy.eyebrow}
      </div>
      <div style={{position: 'absolute', left: 88, top: 214}}>
        <KineticWord id="seek" text={copy.seek} size={248} color={PAPER} />
      </div>
      <Sequence from={flourish.from} duration={end - flourish.from} name="flourish">
        <Flourish span={flourish.span} frames={flourish.frames} />
      </Sequence>
      <Sequence from={time} duration={end - time} name="time">
        <div style={{position: 'absolute', left: 1188, top: 148}}>
          <KineticWord id="time" text={copy.time} size={92} color={STAMP} />
        </div>
        <div
          data-k="rule"
          style={{
            position: 'absolute',
            left: 1188,
            top: 268,
            width: 280,
            height: 4,
            background: STAMP,
            transformOrigin: 'left center',
          }}
        />
      </Sequence>
      <Sequence from={time} duration={end - time} name="clock">
        <IndexRow id="clock" label={copy.rows.find(row => row.id === 'clock').label} />
      </Sequence>
      <Sequence from={frame} duration={end - frame} name="frame">
        <div style={{position: 'absolute', left: 88, top: 590}}>
          <KineticWord id="frame" text={copy.frame} size={132} color={PAPER} />
        </div>
        <IndexRow id="type" label={copy.rows.find(row => row.id === 'type').label} />
      </Sequence>
      <Sequence from={stack} duration={end - stack} name="stack">
        <IndexRow id="stack" label={copy.rows.find(row => row.id === 'stack').label} />
      </Sequence>
      <Sequence from={lockup} duration={end - lockup} name="lockup">
        <IndexRow id="post" label={copy.rows.find(row => row.id === 'post').label} />
        <div
          data-k="lockup"
          style={{
            position: 'absolute',
            left: 88,
            top: 860,
            color: PAPER,
            fontWeight: 500,
            fontSize: 36,
            letterSpacing: '0.01em',
          }}
        >
          {copy.lockup}
        </div>
        <div
          data-k="ai"
          style={{
            position: 'absolute',
            left: 1188,
            top: 860,
            color: QUIET,
            fontWeight: 500,
            fontSize: 18,
            letterSpacing: '0.08em',
          }}
        >
          {copy.ai}
        </div>
      </Sequence>
    </AbsoluteFill>
  );
}

export function buildTitleTimeline(stage, shot) {
  const at = Object.fromEntries(shot.events.map(event => [event.id, event.t]));
  const one = selector => stage.querySelector(selector);
  const many = selector => stage.querySelectorAll(selector);
  return createSeekTimeline(tl => {
    tl.fromTo(one('[data-k=panel]'), {scaleX: 0}, {scaleX: 1, duration: 0.48, ease: 'power3.inOut'}, 0.04);
    tl.fromTo(one('[data-k=eyebrow]'), {opacity: 0, y: 18}, {opacity: 1, y: 0, duration: 0.45, ease: 'power2.out'}, 0.2);
    tl.fromTo(many('[data-word=seek] [data-ch]'), {yPercent: 120}, {yPercent: 0, duration: 0.58, stagger: 0.045, ease: 'power4.out'}, at.seek);
    tl.fromTo(many('[data-word=time] [data-ch]'), {yPercent: 120}, {yPercent: 0, duration: 0.4, stagger: 0.028, ease: 'power4.out'}, at.time);
    tl.fromTo(one('[data-k=rule]'), {scaleX: 0}, {scaleX: 1, duration: 0.35, ease: 'power2.inOut'}, at.time + 0.05);
    tl.fromTo(one('[data-k=clock]'), {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 0.4, ease: 'power3.out'}, at.time + 0.1);
    tl.fromTo(many('[data-word=frame] [data-ch]'), {yPercent: 120}, {yPercent: 0, duration: 0.48, stagger: 0.04, ease: 'power4.out'}, at.frame);
    tl.fromTo(one('[data-k=type]'), {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 0.4, ease: 'power3.out'}, at.frame + 0.12);
    tl.fromTo(one('[data-k=stack]'), {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 0.4, ease: 'power3.out'}, at.stack);
    tl.fromTo(one('[data-k=post]'), {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 0.4, ease: 'power3.out'}, at.lockup);
    tl.fromTo(one('[data-k=lockup]'), {opacity: 0, y: 16}, {opacity: 1, y: 0, duration: 0.42, ease: 'power2.out'}, at.lockup + 0.06);
    tl.fromTo(one('[data-k=ai]'), {opacity: 0}, {opacity: 1, duration: 0.35, ease: 'power1.out'}, at.lockup + 0.12);
    tl.set({}, {}, shot.duration_s);
  });
}
