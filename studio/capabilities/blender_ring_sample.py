# Capability sample for `blender-3d`: a 5 s low-sample render of a ring road with cars.
# Run by `studio doctor --verify blender-3d`:
#   blender -b --factory-startup --python blender_ring_sample.py -- <out_dir> <engine> <fps> <seconds>
# Writes PNG frames to <out_dir>/f_####.png. Low resolution and few samples: this proves the
# toolchain works headless and measures speed; it is not a look test.
import math
import sys

import bpy

out_dir, engine, fps, seconds = sys.argv[sys.argv.index('--') + 1:][:4]
fps, seconds = int(fps), float(seconds)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.resolution_x, scene.render.resolution_y = 640, 360
scene.render.fps = fps
scene.frame_start, scene.frame_end = 1, int(round(fps * seconds))
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = f'{out_dir}/f_'

if engine == 'CYCLES':
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 8
    scene.cycles.use_denoising = False
else:
    scene.render.engine = engine  # BLENDER_EEVEE (5.x) / BLENDER_EEVEE_NEXT (4.2-4.5)
    scene.eevee.taa_render_samples = 8

world = bpy.data.worlds.new('w')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.97, 0.95, 0.92, 1)
scene.world = world


def mat(name, rgb):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*rgb, 1)
    return m


bpy.ops.mesh.primitive_torus_add(major_radius=4, minor_radius=0.35)
road = bpy.context.object
road.scale.z = 0.15
road.data.materials.append(mat('road', (0.80, 0.75, 0.65)))

pivot = bpy.data.objects.new('pivot', None)
scene.collection.objects.link(pivot)
red, teal = mat('brake', (0.9, 0.28, 0.3)), mat('car', (0.25, 0.75, 0.65))
n = 16
for i in range(n):
    a = 2 * math.pi * i / n
    bpy.ops.mesh.primitive_cube_add(size=0.5, location=(4 * math.cos(a), 4 * math.sin(a), 0.2), rotation=(0, 0, a))
    car = bpy.context.object
    car.scale = (0.6, 1.0, 0.5)
    car.data.materials.append(red if i < 4 else teal)
    car.parent = pivot

pivot.rotation_euler.z = 0
pivot.keyframe_insert('rotation_euler', index=2, frame=scene.frame_start)
pivot.rotation_euler.z = math.pi / 2
pivot.keyframe_insert('rotation_euler', index=2, frame=scene.frame_end)

bpy.ops.object.camera_add(location=(0, -9, 7), rotation=(math.radians(52), 0, 0))
scene.camera = bpy.context.object
bpy.ops.object.light_add(type='SUN', location=(3, -3, 8))
bpy.context.object.data.energy = 3

bpy.ops.render.render(animation=True)
print('SW_SAMPLE_DONE', scene.render.engine, scene.frame_end)
