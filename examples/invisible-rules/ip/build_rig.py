#!/usr/bin/env python3
"""Build ip/sprites/rig.json from the vendored character sheets in ip/sprites/src/.

The sheets are the source of truth. This script only re-expresses their shapes as
role-tagged primitives so the canvas kit can swap expressions and move arms. It never
invents a shape: every element in rig.json comes from a sheet, and every sheet element
must receive a role or the build fails.

    python3 examples/invisible-rules/ip/build_rig.py          # write rig.json
    python3 examples/invisible-rules/ip/build_rig.py --check  # fail if rig.json is stale
"""
import hashlib
import json
import math
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / 'sprites' / 'src'
OUT = HERE / 'sprites' / 'rig.json'
NS = '{http://www.w3.org/2000/svg}'

SHEETS = {
    'agui': {'file': 'agui.svg', 'name': '阿规'},
    'dengdeng': {'file': 'dengdeng.svg', 'name': '等等'},
    'dida': {'file': 'dida.svg', 'name': '嘀嗒'},
}

# Sheet label -> stable id. Frozen once rig.json is committed; add, never rename.
EXPRESSION_IDS = {
    'agui': {'主图': 'neutral', '得意': 'smug', '惊讶': 'surprised', '较真': 'serious', '眨眼': 'wink'},
    'dengdeng': {'日常': 'daily', '着急': 'anxious', '恍然': 'aha', '开心': 'happy'},
    'dida': {'认真': 'serious', '得意': 'smug', '怀疑': 'doubt', '超时！': 'alarm'},
}

NUM = r'-?\d*\.?\d+(?:e-?\d+)?'


def num(v):
    f = float(v)
    return int(f) if f.is_integer() else round(f, 4)


def parse_transform(t):
    out = {}
    if not t:
        return out
    m = re.search(rf'translate\(({NUM})[ ,]+({NUM})\)', t)
    if m:
        out['translate'] = [num(m.group(1)), num(m.group(2))]
    m = re.search(rf'scale\(({NUM})\)', t)
    if m:
        out['scale'] = num(m.group(1))
    m = re.search(rf'rotate\(({NUM})\)', t)
    if m:
        out['rotate'] = num(m.group(1))
    return out


GEOM = {
    'rect': ['x', 'y', 'width', 'height', 'rx'],
    'circle': ['cx', 'cy', 'r'],
    'ellipse': ['cx', 'cy', 'rx', 'ry'],
    'path': [],
}
SHORT = {'width': 'w', 'height': 'h', 'stroke-width': 'sw', 'opacity': 'op',
         'stroke-linecap': 'cap', 'stroke-linejoin': 'join', 'stroke-dasharray': 'dash'}


def element(node, tf):
    tag = node.tag.replace(NS, '')
    if tag not in GEOM:
        raise SystemExit(f'unsupported sheet element <{tag}>')
    e = {'tag': tag}
    for k in GEOM[tag]:
        if node.get(k) is not None:
            e[SHORT.get(k, k)] = num(node.get(k))
    if tag == 'path':
        e['d'] = node.get('d').strip()
    for k in ['fill', 'stroke', 'stroke-width', 'opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray']:
        v = node.get(k)
        if v is None:
            continue
        key = SHORT.get(k, k)
        if k in ('stroke-width', 'opacity'):
            e[key] = num(v)
        elif k == 'stroke-dasharray':
            e[key] = [num(x) for x in v.replace(',', ' ').split()]
        else:
            e[key] = v
    t = parse_transform(node.get('transform'))
    if 'rotate' in t:
        e['rot'] = t['rotate']
    if tf != (0, 0):
        e['tf'] = [num(tf[0]), num(tf[1])]
    return e


def flatten(group, tf=(0, 0)):
    out = []
    for child in group:
        tag = child.tag.replace(NS, '')
        if tag == 'g':
            t = parse_transform(child.get('transform')).get('translate', [0, 0])
            out.extend(flatten(child, (tf[0] + t[0], tf[1] + t[1])))
        else:
            out.append(element(child, tf))
    return out


META = ('role', 'side', 'c', 'index')


def key(e):
    return json.dumps({k: v for k, v in e.items() if k not in META}, sort_keys=True)


def path_points(d):
    tokens = re.findall(rf'[MmLlHhVvQqCcZz]|{NUM}', d)
    pts, i, cmd = [], 0, None
    x = y = sx = sy = 0.0
    while i < len(tokens):
        if re.match(r'[A-Za-z]', tokens[i]):
            cmd = tokens[i]
            i += 1
            if cmd in 'Zz':
                x, y = sx, sy
                continue
        vals = []
        need = {'M': 2, 'L': 2, 'H': 1, 'V': 1, 'Q': 4, 'C': 6}[cmd.upper()]
        for _ in range(need):
            vals.append(float(tokens[i]))
            i += 1
        rel = cmd.islower()
        up = cmd.upper()
        if up == 'H':
            x = x + vals[0] if rel else vals[0]
            pts.append((x, y))
        elif up == 'V':
            y = y + vals[0] if rel else vals[0]
            pts.append((x, y))
        else:
            pairs = [(vals[k], vals[k + 1]) for k in range(0, need, 2)]
            for px, py in pairs:
                pts.append((x + px, y + py) if rel else (px, py))
            ex, ey = pairs[-1]
            x, y = (x + ex, y + ey) if rel else (ex, ey)
            if up == 'M':
                sx, sy = x, y
                cmd = 'l' if rel else 'L'
    return pts


def bbox(e):
    tx, ty = e.get('tf', [0, 0])
    tag = e['tag']
    if tag == 'rect':
        pts = [(e['x'], e['y']), (e['x'] + e['w'], e['y']), (e['x'], e['y'] + e['h']), (e['x'] + e['w'], e['y'] + e['h'])]
    elif tag == 'circle':
        pts = [(e['cx'] - e['r'], e['cy'] - e['r']), (e['cx'] + e['r'], e['cy'] + e['r'])]
    elif tag == 'ellipse':
        pts = [(e['cx'] - e['rx'], e['cy'] - e['ry']), (e['cx'] + e['rx'], e['cy'] + e['ry'])]
    else:
        pts = path_points(e['d'])
    if 'rot' in e:
        a = math.radians(e['rot'])
        pts = [(px * math.cos(a) - py * math.sin(a), px * math.sin(a) + py * math.cos(a)) for px, py in pts]
    xs = [p[0] + tx for p in pts]
    ys = [p[1] + ty for p in pts]
    return [min(xs), min(ys), max(xs), max(ys)]


def center(e):
    b = bbox(e)
    return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]


def side(x):
    return 'L' if x < 0 else 'R'


# ---------- per-character head roles ----------

def roles_agui(e):
    cx, cy = center(e)
    fill, stroke = e.get('fill'), e.get('stroke')
    if e['tag'] == 'rect' and e.get('w') == 12:
        return 'antenna'
    if e['tag'] == 'path' and fill == '#F2A541' and e['d'].startswith('M0 '):
        return 'arrow'
    if e['tag'] == 'rect' and e.get('w') == 240:
        return 'shell'
    if e['tag'] == 'rect' and e.get('w') == 184:
        return 'screen'
    if e.get('dash') and stroke == '#F6F1E7':
        return 'belt'
    if fill == '#F49A8C':
        return 'blush'
    if 'tf' in e and (fill == '#E9FFF9' or stroke == '#E9FFF9'):
        return 'eye'
    if 'tf' in e and fill == '#0F1E28':
        return 'eye_hi'
    if 'tf' in e and (fill == '#3FC1A5' or stroke == '#3FC1A5'):
        return 'mouth'
    if e.get('dash') and stroke == '#F2A541':
        return 'fx_lines'
    return None


def roles_dengdeng(e):
    cx, cy = center(e)
    fill, stroke = e.get('fill'), e.get('stroke')
    if e['tag'] == 'path' and e['d'].startswith('M-40 -186'):
        return 'hair'
    if e['tag'] == 'ellipse' and e.get('rx') == 112:
        return 'shell'
    if fill == '#F49A8C':
        return 'blush'
    if fill == '#7FD3F2':
        return 'sweat'
    if e['tag'] == 'path' and ' L' in e['d'] and fill is None and cy < -100:
        return 'brow'
    if cy < -60:
        if fill == '#FFFFFF' or (e['tag'] == 'path' and fill in (None, 'none')):
            return 'eye'
        if e['tag'] == 'circle' and fill == '#13232E':
            return 'pupil'
    if cy >= -60:
        return 'mouth'
    return None


def roles_dida(e):
    cx, cy = center(e)
    fill, stroke = e.get('fill'), e.get('stroke')
    if e['tag'] == 'rect' and e.get('y') == -176:
        return 'button_stem'
    if e['tag'] == 'rect' and e.get('y') == -190:
        return 'button_cap'
    if e['tag'] == 'rect' and e.get('rot') == 40 and e.get('x') == 96:
        return 'side_button'
    if e['tag'] == 'circle' and e.get('r') == 146:
        return 'shell'
    if e['tag'] == 'circle' and e.get('r') == 122:
        return 'dial'
    if e['tag'] == 'rect' and e.get('y') == -128:
        return 'tick'
    if fill == '#F49A8C':
        return 'blush'
    if stroke == '#E8685A':
        return 'brow'
    if cy > 15:
        return 'mouth'
    if abs(cy) <= 20 and abs(cx) <= 56:
        if fill == '#FFFFFF' and e['tag'] == 'circle' and e['r'] <= 4:
            return 'eye_hi'
        return 'eye'
    return None


HEAD_ROLES = {'agui': roles_agui, 'dengdeng': roles_dengdeng, 'dida': roles_dida}


def tag_head(cid, elements, where):
    out = []
    for e in elements:
        role = HEAD_ROLES[cid](e)
        if not role:
            raise SystemExit(f'{cid} {where}: no role for {key(e)}')
        e = dict(e, role=role)
        if role in ('eye', 'pupil', 'eye_hi', 'brow', 'blush'):
            e['side'] = side(center(e)[0])
        if role == 'tick':
            e['index'] = int(round(e.get('rot', 0) / 30)) % 12
        e['c'] = [round(v, 2) for v in center(e)]
        out.append(e)
    return out


# ---------- body: legs, feet, arms, hand props ----------

ARM_RE = re.compile(rf'^M({NUM}) ({NUM}) q({NUM}) ({NUM}) ({NUM}) ({NUM})$')


def split_body(cid, body):
    arms, rest, current = {}, [], None
    for e in body:
        m = ARM_RE.match(e.get('d', '')) if e['tag'] == 'path' and e.get('fill') == 'none' else None
        if m:
            sx, sy, qx, qy, ex, ey = (float(v) for v in m.groups())
            current = side(sx)
            arms[current] = {
                'shoulder': [sx, sy], 'ctrl': [sx + qx, sy + qy], 'end': [sx + ex, sy + ey],
                'stroke': e['stroke'], 'sw': e['sw'], 'props': [],
            }
            continue
        if current and e['tag'] == 'circle' and 'hand' not in arms[current]:
            arms[current]['hand'] = {k: e[k] for k in ('r', 'fill', 'stroke', 'sw')}
            arms[current]['hand_at'] = [e['cx'], e['cy']]
            continue
        if current and math.dist(center(e), arms[current]['end']) < 90:
            arms[current]['props'].append(e)
            arms[current].setdefault('after_hand', []).append('hand' in arms[current])
            continue
        rest.append(e)
    legs = {}
    for e in rest:
        s = side(center(e)[0])
        legs.setdefault(s, []).append(e)
    parts = []
    for s, items in legs.items():
        if len(items) != 2:
            raise SystemExit(f'{cid}: expected leg+foot on side {s}, got {len(items)}')
        items.sort(key=lambda e: bbox(e)[3])
        parts.append(dict(items[0], role='leg', side=s, c=[round(v, 2) for v in center(items[0])]))
        parts.append(dict(items[1], role='foot', side=s, c=[round(v, 2) for v in center(items[1])]))
    order = {key(e): i for i, e in enumerate(body)}
    parts.sort(key=lambda e: order[key(e)])
    return arms, parts


def arm_record(a):
    out = {
        'shoulder': [num(v) for v in a['shoulder']],
        'ctrl': [num(v) for v in a['ctrl']],
        'end': [num(v) for v in a['end']],
    }
    return out


def prop_record(a, name):
    hx, hy = a['hand_at']
    angle = math.degrees(math.atan2(a['end'][1] - a['ctrl'][1], a['end'][0] - a['ctrl'][0]))
    els = []
    for e in a['props']:
        tf = e.get('tf', [0, 0])
        els.append(dict(e, tf=[num(tf[0] - hx), num(tf[1] - hy)]))
    return {'name': name, 'rest_angle': round(angle, 3), 'over_hand': all(a['after_hand']), 'elements': els}


def mirror_ok(left, right):
    m = lambda p: [-p[0], p[1]]
    return all(math.dist(m(left[k]), right[k]) < 1e-6 for k in ('shoulder', 'ctrl', 'end'))


# ---------- sheet ----------

def sheet_groups(root):
    kids = list(root)
    groups = []
    for i, node in enumerate(kids):
        if node.tag.replace(NS, '') != 'g':
            continue
        t = parse_transform(node.get('transform'))
        if 'translate' not in t:
            continue
        nxt = kids[i + 1] if i + 1 < len(kids) else None
        prev = next((kids[j] for j in range(i - 1, -1, -1) if kids[j].tag.replace(NS, '') == 'text'), None)
        groups.append({
            'node': node,
            'scale': t.get('scale', 1),
            'after': (nxt.text or '').strip() if nxt is not None and nxt.tag.replace(NS, '') == 'text' else '',
            'before': (prev.text or '').strip() if prev is not None else '',
        })
    return groups


def swatches(root):
    out = []
    for node in root:
        if node.tag.replace(NS, '') == 'rect' and node.get('y') == '992':
            out.append(node.get('fill'))
    return out


def arrow_state(e):
    pts = path_points(e['d'])
    return 'up' if pts[0][1] < pts[1][1] else 'down'


def build_character(cid, meta):
    file = SRC / meta['file']
    raw = file.read_bytes()
    root = ET.fromstring(raw)
    groups = sheet_groups(root)
    if len(groups) != 6:
        raise SystemExit(f'{cid}: expected 6 figure groups (main, 4 expressions, action), got {len(groups)}')
    main, exprs, action = groups[0], groups[1:5], groups[5]
    main_el = flatten(main['node'])
    expr_el = [flatten(g['node']) for g in exprs]
    first = key(expr_el[0][0])
    if any(key(x[0]) != first for x in expr_el):
        raise SystemExit(f'{cid}: expression heads do not share a first element')
    head_start = next(i for i, e in enumerate(main_el) if key(e) == first)
    arms, body = split_body(cid, main_el[:head_start])
    if set(arms) != {'L', 'R'}:
        raise SystemExit(f'{cid}: expected two arms, got {sorted(arms)}')

    ids = EXPRESSION_IDS[cid]
    expressions = {}
    defaults = {}
    canonical_arrow = None
    for g, els in zip(exprs, expr_el):
        label = g['after']
        if label not in ids:
            raise SystemExit(f'{cid}: unknown expression label {label!r}; add it to EXPRESSION_IDS')
        tagged = tag_head(cid, els, label)
        expressions[ids[label]] = {'label': label, 'elements': tagged}
    main_head = tag_head(cid, main_el[head_start:], 'main')

    if cid == 'agui':
        for eid, ex in expressions.items():
            arrows = [e for e in ex['elements'] if e['role'] == 'arrow']
            if arrow_state(arrows[0]) == 'down':
                defaults.setdefault(eid, {})['arrow_flip'] = 1
            ex['elements'] = [e for e in ex['elements'] if e['role'] != 'arrow']
        canonical_arrow = next(e for e in main_head if e['role'] == 'arrow')
        if arrow_state(canonical_arrow) != 'up':
            raise SystemExit('agui: main arrow must point up')
        main_head = [e for e in main_head if e['role'] != 'arrow']

    main_key = [key(e) for e in main_head]
    default_expression = next((eid for eid, ex in expressions.items() if [key(e) for e in ex['elements']] == main_key), None)
    if default_expression is None:
        label = '主图'
        eid = ids[label]
        expressions = {eid: {'label': label, 'elements': main_head}, **expressions}
        default_expression = eid

    act_el = flatten(action['node'])
    act_start = next(i for i, e in enumerate(act_el) if key(e) == first)
    act_arms, act_body = split_body(cid, act_el[:act_start])
    act_head = tag_head(cid, act_el[act_start:], 'action')
    act_info = {'label': action['before'].replace('动作：', '')}
    if cid == 'agui':
        arrows = [e for e in act_head if e['role'] == 'arrow']
        act_info['arrow_flip'] = 1 if arrow_state(arrows[0]) == 'down' else 0
        act_head = [e for e in act_head if e['role'] != 'arrow']
    extras = [e for e in act_head if e['role'] == 'fx_lines']
    act_head = [e for e in act_head if e['role'] != 'fx_lines']
    act_key = [key(e) for e in act_head]
    match = next((eid for eid, ex in expressions.items() if [key(e) for e in ex['elements']] == act_key), None)
    if match is None:
        raise SystemExit(f'{cid}: action head matches no expression')
    act_info['expression'] = match
    if extras:
        act_info['fx'] = extras
    legs_main = {e['side']: e for e in body if e['role'] == 'leg'}
    legs_act = {e['side']: e for e in act_body if e['role'] == 'leg'}
    lift = bbox(legs_main['L'])[1] - bbox(legs_act['L'])[1]
    act_info['leg_stretch'] = num(round(lift, 3))
    if not mirror_ok(act_arms['L'], act_arms['R']):
        raise SystemExit(f'{cid}: action arms are not mirrored; cannot derive the rest pose')
    if not mirror_ok(arms['L'], act_arms['R']):
        raise SystemExit(f'{cid}: main left arm differs from action arms; rest pose ambiguous')

    signature_prop = None
    props = {}
    for s in ('L', 'R'):
        if arms[s]['props']:
            name = {'dengdeng': 'phone', 'dida': 'pointer'}.get(cid)
            if not name:
                raise SystemExit(f'{cid}: unexpected hand prop on {s}')
            props[name] = prop_record(arms[s], name)
            signature_prop = name

    head_all = [e for ex in expressions.values() for e in ex['elements']]
    shell = next(e for e in main_head if e['role'] == 'shell')
    sb = bbox(shell)
    eyes = [e for e in main_head if e['role'] == 'eye']
    mouths = [e for e in main_head if e['role'] == 'mouth']
    top = min(bbox(e)[1] for e in main_head + ([canonical_arrow] if canonical_arrow else []))
    feet = [e for e in body if e['role'] == 'foot']
    legs = [e for e in body if e['role'] == 'leg']
    anchors = {
        'top': num(round(top, 2)),
        'ground': num(round(max(bbox(e)[3] for e in feet), 2)),
        'hip': num(round(min(bbox(e)[1] for e in legs), 2)),
        'shell': [num(round(v, 2)) for v in sb],
        'eyes': [num(round(sum(center(e)[0] for e in eyes) / len(eyes), 2)), num(round(sum(center(e)[1] for e in eyes) / len(eyes), 2))],
        'mouth': [num(round(v, 2)) for v in center(mouths[0])],
    }
    if cid == 'dida':
        anchors['button'] = [num(round(v, 2)) for v in center(next(e for e in main_head if e['role'] == 'button_cap'))]
    if canonical_arrow:
        b = bbox(canonical_arrow)
        anchors['arrow'] = [num(round((b[0] + b[2]) / 2, 2)), num(round((b[1] + b[3]) / 2, 2))]

    rec = {
        'name': meta['name'],
        'source': {'file': f'sprites/src/{meta["file"]}', 'sha256': hashlib.sha256(raw).hexdigest()},
        'sheet_scale': main['scale'],
        'palette': swatches(root),
        'catchphrase': main['after'],
        'anchors': anchors,
        'body': body,
        'arm_style': {'stroke': arms['L']['stroke'], 'sw': arms['L']['sw'], 'hand': arms['L']['hand']},
        'arms': {'L': arm_record(arms['L']), 'R': arm_record(act_arms['R'])},
        'signature': {'R': arm_record(arms['R']), 'prop': signature_prop},
        'props': props,
        'expressions': expressions,
        'default_expression': default_expression,
        'expression_defaults': defaults,
        'action': act_info,
    }
    if canonical_arrow:
        rec['arrow'] = canonical_arrow
    if not head_all:
        raise SystemExit(f'{cid}: empty head')
    return rec


def lineup_scales():
    raw = (SRC / 'lineup.svg').read_bytes()
    root = ET.fromstring(raw)
    groups = [g for g in sheet_groups(root)]
    order = ['dengdeng', 'agui', 'dida']
    if len(groups) != 3:
        raise SystemExit(f'lineup: expected 3 figures, got {len(groups)}')
    return {'sha256': hashlib.sha256(raw).hexdigest(), 'scale': {cid: g['scale'] for cid, g in zip(order, groups)}}


def build():
    rig = {
        'schema': 'storyweaver.rig.v1',
        'series': 'invisible-rules',
        'generated_by': 'series/invisible-rules/ip/build_rig.py',
        'units': 'sheet units; 1 unit = 1 px at scale 1',
        'lineup': lineup_scales(),
        'characters': {cid: build_character(cid, meta) for cid, meta in SHEETS.items()},
    }
    return json.dumps(rig, ensure_ascii=False, indent=1) + '\n'


def main():
    text = build()
    if '--check' in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding='utf8') != text:
            print('rig.json is stale; run python3 series/invisible-rules/ip/build_rig.py', file=sys.stderr)
            sys.exit(1)
        print('rig.json up to date')
        return
    OUT.write_text(text, encoding='utf8')
    data = json.loads(text)
    for cid, c in data['characters'].items():
        print(cid, 'expressions:', ', '.join(f"{k}({v['label']})" for k, v in c['expressions'].items()),
              '| default:', c['default_expression'], '| action:', c['action']['label'], '->', c['action']['expression'])
    print(OUT)


if __name__ == '__main__':
    main()
