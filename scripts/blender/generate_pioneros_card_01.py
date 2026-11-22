#!/usr/bin/env python3
"""
Blender 5.2.3 LTS Generator — StarSeed OS Holographic Collector Card
Edition: Pioneros StarSeed · #001 / 012 "Tejedores del Micelio"

Generates:
  1. 4 high-resolution Cycles + OpenImageDenoise studio boceto renders
     in docs/cards/renders/
  2. Source .blend file in docs/cards/pioneros_01.blend
  3. Clean, web-optimized PBR .glb asset (KHR_materials_iridescence, clearcoat,
     emissive prisms, zero external CDN dependencies) in public/cards/pioneros-01.glb

Run headlessly:
  /opt/homebrew/bin/blender -b --factory-startup -P scripts/blender/generate_pioneros_card_01.py
"""

import math
import os
import time
import bpy
import bmesh
from mathutils import Vector, Matrix


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RENDERS_DIR = os.path.join(ROOT_DIR, "docs", "cards", "renders")
BLEND_OUT = os.path.join(ROOT_DIR, "docs", "cards", "pioneros_01.blend")
GLB_OUT = os.path.join(ROOT_DIR, "public", "cards", "pioneros-01.glb")

os.makedirs(RENDERS_DIR, exist_ok=True)
os.makedirs(os.path.dirname(GLB_OUT), exist_ok=True)


# ---------------------------------------------------------------------------
# Scene Reset & Collection Helpers
# ---------------------------------------------------------------------------
def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def get_or_create_collection(name, parent=None):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        if parent is None:
            bpy.context.scene.collection.children.link(col)
        else:
            parent.children.link(col)
    return col


def link_obj(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)


def set_smooth_with_edges(mesh):
    mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))
    mesh.update()


def add_weighted_normal_and_bevel(obj, bevel_width=0.0012, segments=2, angle_limit=math.radians(32)):
    if bevel_width > 0:
        bev = obj.modifiers.new(name="Bevel", type="BEVEL")
        bev.width = bevel_width
        bev.segments = segments
        bev.limit_method = "ANGLE"
        bev.angle_limit = angle_limit
        bev.harden_normals = False
    wn = obj.modifiers.new(name="WeightedNormal", type="WEIGHTED_NORMAL")
    wn.keep_sharp = True


# ---------------------------------------------------------------------------
# Material Factory (Blender 5.2 Principled BSDF + Iridescent Thin Film)
# ---------------------------------------------------------------------------
def set_input(node, name, value):
    if name in node.inputs:
        node.inputs[name].default_value = value


def make_material(
    name,
    base_color=(0.1, 0.1, 0.12, 1.0),
    metallic=0.0,
    roughness=0.25,
    ior=1.5,
    coat_weight=0.0,
    coat_roughness=0.05,
    transmission=0.0,
    emission_color=(0.0, 0.0, 0.0, 1.0),
    emission_strength=0.0,
    thin_film_thickness=0.0,
    thin_film_ior=1.33,
    anisotropic=0.0,
    bump_scale=0.0,
    bump_distance=0.0005,
    noise_scale=90.0,
):
    mat = bpy.data.materials.new(name=name)
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (420, 0)

    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (80, 0)

    set_input(bsdf, "Base Color", base_color)
    set_input(bsdf, "Metallic", metallic)
    set_input(bsdf, "Roughness", roughness)
    set_input(bsdf, "IOR", ior)
    set_input(bsdf, "Coat Weight", coat_weight)
    set_input(bsdf, "Coat Roughness", coat_roughness)
    set_input(bsdf, "Transmission Weight", transmission)
    set_input(bsdf, "Emission Color", emission_color)
    set_input(bsdf, "Emission Strength", emission_strength)
    set_input(bsdf, "Thin Film Thickness", thin_film_thickness)
    set_input(bsdf, "Thin Film IOR", thin_film_ior)
    set_input(bsdf, "Anisotropic", anisotropic)

    if bump_scale > 0.0:
        tex_coord = nt.nodes.new("ShaderNodeTexCoord")
        tex_coord.location = (-620, -220)
        noise = nt.nodes.new("ShaderNodeTexNoise")
        noise.location = (-380, -220)
        noise.inputs["Scale"].default_value = noise_scale
        noise.inputs["Detail"].default_value = 6.0
        noise.inputs["Roughness"].default_value = 0.65
        bump = nt.nodes.new("ShaderNodeBump")
        bump.location = (-140, -220)
        bump.inputs["Strength"].default_value = bump_scale
        bump.inputs["Distance"].default_value = bump_distance
        nt.links.new(tex_coord.outputs["Object"], noise.inputs["Vector"])
        nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def make_iridescent_chamber_material():
    """Deep cosmic holographic backplate inside the 4D card recess."""
    mat = bpy.data.materials.new(name="Mat_InnerChamber4D")
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (560, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (220, 0)

    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-680, 0)
    grad = nt.nodes.new("ShaderNodeTexGradient")
    grad.gradient_type = "SPHERICAL"
    grad.location = (-460, 120)
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "RINGS"
    wave.rings_direction = "Z"
    wave.location = (-460, -140)
    wave.inputs["Scale"].default_value = 16.0
    wave.inputs["Distortion"].default_value = 1.4
    wave.inputs["Detail"].default_value = 3.0

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.location = (-180, 120)
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.012, 0.018, 0.045, 1.0)
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = (0.045, 0.018, 0.088, 1.0)

    film_map = nt.nodes.new("ShaderNodeMapRange")
    film_map.location = (-140, -140)
    film_map.inputs["From Min"].default_value = 0.0
    film_map.inputs["From Max"].default_value = 1.0
    film_map.inputs["To Min"].default_value = 380.0
    film_map.inputs["To Max"].default_value = 660.0

    bump = nt.nodes.new("ShaderNodeBump")
    bump.location = (0, -290)
    bump.inputs["Strength"].default_value = 0.06
    bump.inputs["Distance"].default_value = 0.0003

    set_input(bsdf, "Metallic", 0.78)
    set_input(bsdf, "Roughness", 0.18)
    set_input(bsdf, "Coat Weight", 0.95)
    set_input(bsdf, "Coat Roughness", 0.04)
    set_input(bsdf, "Thin Film IOR", 1.48)
    set_input(bsdf, "Emission Color", (0.03, 0.08, 0.16, 1.0))
    set_input(bsdf, "Emission Strength", 0.15)

    nt.links.new(tc.outputs["Object"], grad.inputs["Vector"])
    nt.links.new(tc.outputs["Object"], wave.inputs["Vector"])
    nt.links.new(grad.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(wave.outputs["Fac"], film_map.inputs["Value"])
    nt.links.new(wave.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(film_map.outputs["Result"], bsdf.inputs["Thin Film Thickness"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def create_materials():
    mats = {}

    mats["obsidian_slab"] = make_material(
        "Mat_ObsidianSlab",
        base_color=(0.008, 0.010, 0.020, 1.0),
        metallic=0.45,
        roughness=0.14,
        coat_weight=0.92,
        coat_roughness=0.05,
        thin_film_thickness=510.0,
        thin_film_ior=1.45,
        bump_scale=0.035,
        noise_scale=200.0,
    )

    mats["iridescent_rim"] = make_material(
        "Mat_IridescentRim",
        base_color=(0.82, 0.86, 0.94, 1.0),
        metallic=0.97,
        roughness=0.12,
        coat_weight=1.0,
        coat_roughness=0.03,
        thin_film_thickness=510.0,
        thin_film_ior=1.52,
    )

    mats["chamber_4d"] = make_iridescent_chamber_material()

    mats["antique_gold"] = make_material(
        "Mat_AntiqueGold",
        base_color=(0.94, 0.72, 0.28, 1.0),
        metallic=0.96,
        roughness=0.19,
        coat_weight=0.55,
        coat_roughness=0.06,
        thin_film_thickness=320.0,
        thin_film_ior=1.38,
        emission_color=(0.95, 0.70, 0.22, 1.0),
        emission_strength=0.10,
        bump_scale=0.025,
        noise_scale=240.0,
    )

    mats["text_gold"] = make_material(
        "Mat_TextGoldGlow",
        base_color=(0.98, 0.82, 0.42, 1.0),
        metallic=0.92,
        roughness=0.16,
        coat_weight=0.8,
        emission_color=(0.98, 0.78, 0.35, 1.0),
        emission_strength=0.55,
    )

    mats["text_silver"] = make_material(
        "Mat_TextSilverGlow",
        base_color=(0.94, 0.96, 1.0, 1.0),
        metallic=0.90,
        roughness=0.15,
        coat_weight=0.8,
        emission_color=(0.82, 0.94, 1.0, 1.0),
        emission_strength=0.45,
    )

    mats["flower_gold"] = make_material(
        "Mat_FlowerOfLifeGold",
        base_color=(0.84, 0.66, 0.30, 1.0),
        metallic=0.92,
        roughness=0.16,
        thin_film_thickness=460.0,
        thin_film_ior=1.44,
        emission_color=(0.68, 0.52, 0.18, 1.0),
        emission_strength=0.48,
    )

    mats["vesica_silver"] = make_material(
        "Mat_VesicaUpperSilver",
        base_color=(0.94, 0.95, 0.99, 1.0),
        metallic=0.90,
        roughness=0.19,
        anisotropic=0.65,
        coat_weight=0.60,
        coat_roughness=0.04,
        thin_film_thickness=270.0,
        thin_film_ior=1.36,
        bump_scale=0.02,
        noise_scale=320.0,
    )

    mats["vesica_obsidian"] = make_material(
        "Mat_VesicaLowerObsidian",
        base_color=(0.010, 0.013, 0.022, 1.0),
        metallic=0.22,
        roughness=0.06,
        coat_weight=1.0,
        coat_roughness=0.02,
        thin_film_thickness=450.0,
        thin_film_ior=1.44,
    )

    # Upper Trinity (RGB — Light Fundamental Colors, rich saturated gem prisms)
    mats["prism_red"] = make_material(
        "Mat_PrismRed",
        base_color=(0.86, 0.015, 0.015, 1.0),
        metallic=0.06,
        roughness=0.06,
        ior=1.64,
        transmission=0.22,
        coat_weight=1.0,
        coat_roughness=0.02,
        emission_color=(0.92, 0.01, 0.01, 1.0),
        emission_strength=0.44,
        thin_film_thickness=420.0,
        thin_film_ior=1.45,
    )

    mats["prism_green"] = make_material(
        "Mat_PrismGreen",
        base_color=(0.015, 0.78, 0.04, 1.0),
        metallic=0.06,
        roughness=0.06,
        ior=1.64,
        transmission=0.22,
        coat_weight=1.0,
        coat_roughness=0.02,
        emission_color=(0.015, 0.86, 0.05, 1.0),
        emission_strength=0.44,
        thin_film_thickness=460.0,
        thin_film_ior=1.45,
    )

    mats["prism_blue"] = make_material(
        "Mat_PrismBlue",
        base_color=(0.015, 0.09, 0.92, 1.0),
        metallic=0.06,
        roughness=0.06,
        ior=1.64,
        transmission=0.22,
        coat_weight=1.0,
        coat_roughness=0.02,
        emission_color=(0.02, 0.13, 0.96, 1.0),
        emission_strength=0.50,
        thin_film_thickness=500.0,
        thin_film_ior=1.45,
    )

    # Lower Trinity Yellow center (RYB — Matter Fundamental Colors)
    mats["prism_yellow"] = make_material(
        "Mat_PrismYellow",
        base_color=(0.96, 0.78, 0.01, 1.0),
        metallic=0.06,
        roughness=0.06,
        ior=1.64,
        transmission=0.22,
        coat_weight=1.0,
        coat_roughness=0.02,
        emission_color=(0.98, 0.80, 0.015, 1.0),
        emission_strength=0.44,
        thin_film_thickness=410.0,
        thin_film_ior=1.45,
    )

    # Central Eye materials
    mats["eye_sclera"] = make_material(
        "Mat_EyeScleraOpal",
        base_color=(0.97, 0.98, 1.0, 1.0),
        metallic=0.0,
        roughness=0.07,
        ior=1.48,
        coat_weight=1.0,
        coat_roughness=0.02,
        emission_color=(0.92, 0.95, 1.0, 1.0),
        emission_strength=0.25,
        thin_film_thickness=360.0,
        thin_film_ior=1.34,
    )

    mats["eye_iris"] = make_material(
        "Mat_EyeIrisCrystal",
        base_color=(0.14, 0.72, 0.95, 1.0),
        metallic=0.25,
        roughness=0.04,
        ior=1.68,
        transmission=0.62,
        coat_weight=1.0,
        coat_roughness=0.01,
        thin_film_thickness=540.0,
        thin_film_ior=1.52,
        emission_color=(0.16, 0.76, 0.98, 1.0),
        emission_strength=0.55,
    )

    mats["eye_pupil"] = make_material(
        "Mat_EyePupilObsidian",
        base_color=(0.001, 0.001, 0.002, 1.0),
        metallic=0.0,
        roughness=0.04,
        ior=1.45,
        coat_weight=0.35,
        coat_roughness=0.03,
    )

    mats["eye_catchlight"] = make_material(
        "Mat_EyeCatchlight",
        base_color=(1.0, 1.0, 1.0, 1.0),
        metallic=0.0,
        roughness=0.02,
        emission_color=(1.0, 1.0, 1.0, 1.0),
        emission_strength=3.6,
    )

    # Corner crystals
    mats["quartz_crystal"] = make_material(
        "Mat_QuartzCrystal",
        base_color=(0.86, 0.96, 1.0, 1.0),
        metallic=0.04,
        roughness=0.04,
        ior=1.56,
        transmission=0.84,
        coat_weight=1.0,
        coat_roughness=0.02,
        thin_film_thickness=530.0,
        thin_film_ior=1.46,
        emission_color=(0.50, 0.85, 1.0, 1.0),
        emission_strength=0.35,
    )

    mats["amethyst_crystal"] = make_material(
        "Mat_AmethystCrystal",
        base_color=(0.60, 0.18, 0.92, 1.0),
        metallic=0.05,
        roughness=0.05,
        ior=1.56,
        transmission=0.78,
        coat_weight=1.0,
        coat_roughness=0.02,
        thin_film_thickness=590.0,
        thin_film_ior=1.48,
        emission_color=(0.66, 0.22, 0.98, 1.0),
        emission_strength=0.45,
    )

    mats["neon_cyan_line"] = make_material(
        "Mat_CircuitCyan",
        base_color=(0.15, 0.94, 1.0, 1.0),
        metallic=0.3,
        roughness=0.10,
        emission_color=(0.18, 0.96, 1.0, 1.0),
        emission_strength=1.15,
        thin_film_thickness=470.0,
    )

    return mats


# ---------------------------------------------------------------------------
# 2D Contour Generators (Uniform Angular Sampling -> Clean Topology)
# ---------------------------------------------------------------------------
def ray_rounded_rect_point(hw, hh, r, ang):
    """Raycast from origin along angle `ang` onto a rounded rectangle boundary."""
    dx = math.cos(ang)
    dy = math.sin(ang)
    ihw = hw - r
    ihh = hh - r

    tx = ihw / abs(dx) if abs(dx) > 1e-8 else 1e9
    ty = ihh / abs(dy) if abs(dy) > 1e-8 else 1e9
    px = dx * min(tx, ty)
    py = dy * min(tx, ty)

    # Check if intersection falls inside one of the 4 rounded corner arcs
    sx = hw - r
    sy = hh - r
    # Compute t to outer box
    bx = hw / abs(dx) if abs(dx) > 1e-8 else 1e9
    by = hh / abs(dy) if abs(dy) > 1e-8 else 1e9
    t_box = min(bx, by)
    qx = dx * t_box
    qy = dy * t_box

    if abs(qx) <= sx or abs(qy) <= sy:
        return (qx, qy)

    # Intersect ray (t*dx, t*dy) with corner circle centered at (sign(dx)*sx, sign(dy)*sy)
    cx = math.copysign(sx, dx)
    cy = math.copysign(sy, dy)
    b = -(dx * cx + dy * cy)
    c = cx * cx + cy * cy - r * r
    disc = max(0.0, b * b - c)
    t_arc = -b + math.sqrt(disc)
    return (dx * t_arc, dy * t_arc)


def rounded_rect_uniform(hw, hh, r, total_pts=80):
    pts = []
    for i in range(total_pts):
        ang = math.pi * 0.25 + (2.0 * math.pi) * (i / total_pts)
        pts.append(ray_rounded_rect_point(hw, hh, r, ang))
    return pts


def portal_window_uniform(rx, ry, total_pts=80):
    pts = []
    for i in range(total_pts):
        ang = math.pi * 0.25 + (2.0 * math.pi) * (i / total_pts)
        ca = math.cos(ang)
        sa = math.sin(ang)
        x = math.copysign(abs(ca) ** 0.84, ca) * rx
        y = math.copysign(abs(sa) ** 0.84, sa) * ry
        pts.append((x, y))
    return pts


def create_extruded_plate(name, pts_2d, z_min, z_max, mat, col):
    bm = bmesh.new()
    bottom_verts = [bm.verts.new((x, y, z_min)) for x, y in pts_2d]
    top_verts = [bm.verts.new((x, y, z_max)) for x, y in pts_2d]
    n = len(pts_2d)

    bm.faces.new(list(reversed(bottom_verts)))
    bm.faces.new(top_verts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([bottom_verts[i], bottom_verts[j], top_verts[j], top_verts[i]])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    set_smooth_with_edges(mesh)

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    link_obj(obj, col)
    return obj


def create_extruded_frame_ring(name, outer_pts, inner_pts, z_min, z_max, mat, col):
    assert len(outer_pts) == len(inner_pts)
    n = len(outer_pts)
    bm = bmesh.new()

    ob = [bm.verts.new((x, y, z_min)) for x, y in outer_pts]
    ot = [bm.verts.new((x, y, z_max)) for x, y in outer_pts]
    ib = [bm.verts.new((x, y, z_min)) for x, y in inner_pts]
    it = [bm.verts.new((x, y, z_max)) for x, y in inner_pts]

    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([ob[i], ob[j], ot[j], ot[i]])
        bm.faces.new([it[i], it[j], ib[j], ib[i]])
        bm.faces.new([ot[i], ot[j], it[j], it[i]])
        bm.faces.new([ib[i], ib[j], ob[j], ob[i]])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    set_smooth_with_edges(mesh)

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    link_obj(obj, col)
    return obj


def create_torus_ring(name, center, radius, minor_r, mat, col, major_segs=72, minor_segs=12):
    bm = bmesh.new()
    cx, cy, cz = center
    rings = []
    for i in range(major_segs):
        theta = 2.0 * math.pi * i / major_segs
        ct, st = math.cos(theta), math.sin(theta)
        ring = []
        for j in range(minor_segs):
            phi = 2.0 * math.pi * j / minor_segs
            cp, sp = math.cos(phi), math.sin(phi)
            r = radius + minor_r * cp
            ring.append(bm.verts.new((cx + r * ct, cy + r * st, cz + minor_r * sp)))
        rings.append(ring)

    for i in range(major_segs):
        ni = (i + 1) % major_segs
        for j in range(minor_segs):
            nj = (j + 1) % minor_segs
            bm.faces.new([rings[i][j], rings[ni][j], rings[ni][nj], rings[i][nj]])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    set_smooth_with_edges(mesh)

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    link_obj(obj, col)
    return obj


def create_disc(name, center, radius, z_min, z_max, mat, col, segs=72, bevel_top=0.0018):
    bm = bmesh.new()
    cx, cy = center[0], center[1]
    b_ring = []
    t_outer = []
    t_inner = []
    for i in range(segs):
        ang = 2.0 * math.pi * i / segs
        ca, sa = math.cos(ang), math.sin(ang)
        b_ring.append(bm.verts.new((cx + radius * ca, cy + radius * sa, z_min)))
        t_outer.append(bm.verts.new((cx + radius * ca, cy + radius * sa, z_max - bevel_top * 0.6)))
        t_inner.append(bm.verts.new((cx + (radius - bevel_top) * ca, cy + (radius - bevel_top) * sa, z_max)))

    bm.faces.new(list(reversed(b_ring)))
    bm.faces.new(t_inner)
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new([b_ring[i], b_ring[j], t_outer[j], t_outer[i]])
        bm.faces.new([t_outer[i], t_outer[j], t_inner[j], t_inner[i]])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    set_smooth_with_edges(mesh)

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    link_obj(obj, col)
    return obj


def create_faceted_prism_triangle(name, p_apex, p_left, p_right, z_base, height, mat, col, ridge_split=False):
    bm = bmesh.new()
    cx = (p_apex[0] + p_left[0] + p_right[0]) / 3.0
    cy = (p_apex[1] + p_left[1] + p_right[1]) / 3.0

    def shrink(pt, factor=0.80):
        return (cx + (pt[0] - cx) * factor, cy + (pt[1] - cy) * factor)

    ba = bm.verts.new((p_apex[0], p_apex[1], z_base))
    bl = bm.verts.new((p_left[0], p_left[1], z_base))
    br = bm.verts.new((p_right[0], p_right[1], z_base))

    ta_xy = shrink(p_apex, 0.72)
    tl_xy = shrink(p_left, 0.78)
    tr_xy = shrink(p_right, 0.78)

    if ridge_split:
        mid_b_xy = ((p_left[0] + p_right[0]) * 0.5, (p_left[1] + p_right[1]) * 0.5)
        bm_mid = bm.verts.new((mid_b_xy[0], mid_b_xy[1], z_base))
        t_mid_xy = shrink(mid_b_xy, 0.78)

        ta = bm.verts.new((ta_xy[0], ta_xy[1], z_base + height * 0.88))
        tl = bm.verts.new((tl_xy[0], tl_xy[1], z_base + height * 0.82))
        tr = bm.verts.new((tr_xy[0], tr_xy[1], z_base + height * 0.82))
        t_mid = bm.verts.new((t_mid_xy[0], t_mid_xy[1], z_base + height * 1.08))

        bm.faces.new([ba, br, bm_mid, bl])
        bm.faces.new([tl, t_mid, ta])
        bm.faces.new([t_mid, tr, ta])
        bm.faces.new([bl, bm_mid, t_mid, tl])
        bm.faces.new([bm_mid, br, tr, t_mid])
        bm.faces.new([br, ba, ta, tr])
        bm.faces.new([ba, bl, tl, ta])
    else:
        ta = bm.verts.new((ta_xy[0], ta_xy[1], z_base + height))
        tl = bm.verts.new((tl_xy[0], tl_xy[1], z_base + height))
        tr = bm.verts.new((tr_xy[0], tr_xy[1], z_base + height))

        bm.faces.new([ba, br, bl])
        bm.faces.new([ta, tl, tr])
        bm.faces.new([bl, br, tr, tl])
        bm.faces.new([br, ba, ta, tr])
        bm.faces.new([ba, bl, tl, ta])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    mesh.polygons.foreach_set("use_smooth", [False] * len(mesh.polygons))
    mesh.update()

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    link_obj(obj, col)
    return obj


def create_almond_vesica_eye(col, mats):
    segs = 64
    rx = 0.114
    ry = 0.044

    def almond_pts(scale_x, scale_y, power=1.35):
        pts = []
        for i in range(segs):
            ang = 2.0 * math.pi * i / segs
            ca = math.cos(ang)
            sa = math.sin(ang)
            x = scale_x * ca
            y = math.copysign(abs(sa) ** power, sa) * scale_y
            pts.append((x, y))
        return pts

    outer_lid = almond_pts(rx * 1.07, ry * 1.14, 1.38)
    inner_lid = almond_pts(rx * 0.94, ry * 0.92, 1.32)
    eyelid_obj = create_extruded_frame_ring(
        "EyeEyelidGold", outer_lid, inner_lid, 0.008, 0.0155, mats["antique_gold"], col
    )
    add_weighted_normal_and_bevel(eyelid_obj, 0.0008, 2)

    bm = bmesh.new()
    sclera_rim = almond_pts(rx * 0.96, ry * 0.94, 1.32)
    rim_v = [bm.verts.new((x, y, 0.009)) for x, y in sclera_rim]
    mid_v = [bm.verts.new((x * 0.55, y * 0.55, 0.0138)) for x, y in sclera_rim]
    center_v = bm.verts.new((0.0, 0.0, 0.0155))
    n = len(sclera_rim)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([rim_v[i], rim_v[j], mid_v[j], mid_v[i]])
        bm.faces.new([mid_v[i], mid_v[j], center_v])
    bm.faces.new(list(reversed(rim_v)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new("EyeSclera_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    set_smooth_with_edges(mesh)
    sclera_obj = bpy.data.objects.new("EyeSclera", mesh)
    sclera_obj.data.materials.append(mats["eye_sclera"])
    link_obj(sclera_obj, col)

    bm_iris = bmesh.new()
    iris_segs = 18
    r_out = 0.039
    r_in = 0.0285
    rings_lo = []
    rings_hi = []
    for k in range(iris_segs):
        a = 2.0 * math.pi * k / iris_segs
        ca, sa = math.cos(a), math.sin(a)
        rings_lo.append(bm_iris.verts.new((r_out * ca, r_out * sa, 0.0125)))
        rings_hi.append(bm_iris.verts.new((r_in * ca, r_in * sa, 0.0168)))
    for k in range(iris_segs):
        nk = (k + 1) % iris_segs
        bm_iris.faces.new([rings_lo[k], rings_lo[nk], rings_hi[nk], rings_hi[k]])
    bmesh.ops.recalc_face_normals(bm_iris, faces=bm_iris.faces)
    m_iris = bpy.data.meshes.new("EyeIris_Mesh")
    bm_iris.to_mesh(m_iris)
    bm_iris.free()
    m_iris.polygons.foreach_set("use_smooth", [False] * len(m_iris.polygons))
    m_iris.update()
    iris_obj = bpy.data.objects.new("EyeIris", m_iris)
    iris_obj.data.materials.append(mats["eye_iris"])
    link_obj(iris_obj, col)

    bm_pup = bmesh.new()
    bmesh.ops.create_uvsphere(bm_pup, u_segments=40, v_segments=20, radius=0.0295)
    for v in bm_pup.verts:
        v.co.z = v.co.z * 0.24 + 0.0138
    mesh_pup = bpy.data.meshes.new("EyePupil_Mesh")
    bm_pup.to_mesh(mesh_pup)
    bm_pup.free()
    set_smooth_with_edges(mesh_pup)
    pupil_obj = bpy.data.objects.new("EyePupil", mesh_pup)
    pupil_obj.data.materials.append(mats["eye_pupil"])
    link_obj(pupil_obj, col)

    bm_cl = bmesh.new()
    bmesh.ops.create_uvsphere(bm_cl, u_segments=20, v_segments=12, radius=0.0055)
    for v in bm_cl.verts:
        v.co.x += 0.0102
        v.co.y += 0.0102
        v.co.z = v.co.z * 0.35 + 0.0205
    mesh_cl = bpy.data.meshes.new("EyeCatchlight_Mesh")
    bm_cl.to_mesh(mesh_cl)
    bm_cl.free()
    set_smooth_with_edges(mesh_cl)
    cl_obj = bpy.data.objects.new("EyeCatchlight", mesh_cl)
    cl_obj.data.materials.append(mats["eye_catchlight"])
    link_obj(cl_obj, col)


def create_curve_tube(name, points_3d, radius_base, radius_tip, mat, col, bevel_res=5, tapers=True):
    curve_data = bpy.data.curves.new(name + "_Curve", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 10
    curve_data.bevel_depth = radius_base
    curve_data.bevel_resolution = bevel_res
    curve_data.use_fill_caps = True

    spline = curve_data.splines.new("NURBS")
    spline.points.add(len(points_3d) - 1)
    for i, (x, y, z) in enumerate(points_3d):
        spline.points[i].co = (x, y, z, 1.0)
        if tapers:
            t = i / max(1, len(points_3d) - 1)
            spline.points[i].radius = (1.0 - t) * 0.85 + t * (radius_tip / max(radius_base, 1e-5))
    spline.use_endpoint_u = True
    spline.order_u = min(4, len(points_3d))

    temp_obj = bpy.data.objects.new(name + "_Tmp", curve_data)
    link_obj(temp_obj, col)

    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    eval_obj = temp_obj.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(eval_obj)
    mesh.name = name + "_Mesh"
    set_smooth_with_edges(mesh)

    bpy.data.objects.remove(temp_obj, do_unlink=True)
    bpy.data.curves.remove(curve_data, do_unlink=True)

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    link_obj(obj, col)
    return obj


def create_hex_crystal(name, base_pos, direction, length, radius, mat, col):
    bm = bmesh.new()
    segs = 6
    base_ring = []
    shoulder_ring = []
    shoulder_h = length * 0.72
    r_tip = radius * 0.82

    for i in range(segs):
        a = 2.0 * math.pi * i / segs
        ca, sa = math.cos(a), math.sin(a)
        base_ring.append(bm.verts.new((radius * ca, radius * sa, 0.0)))
        shoulder_ring.append(bm.verts.new((r_tip * ca, r_tip * sa, shoulder_h)))

    tip_v = bm.verts.new((0.0, 0.0, length))
    bm.faces.new(list(reversed(base_ring)))
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new([base_ring[i], base_ring[j], shoulder_ring[j], shoulder_ring[i]])
        bm.faces.new([shoulder_ring[i], shoulder_ring[j], tip_v])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    d = Vector(direction).normalized()
    rot = d.to_track_quat("Z", "Y").to_matrix().to_4x4()
    trans = Matrix.Translation(Vector(base_pos))
    bmesh.ops.transform(bm, matrix=trans @ rot, verts=bm.verts)

    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    mesh.polygons.foreach_set("use_smooth", [False] * len(mesh.polygons))
    mesh.update()

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    link_obj(obj, col)
    return obj


def create_3d_text(name, body, pos, scale, extrude, mat, col, align_x="CENTER", rot_euler=(0.0, 0.0, 0.0)):
    txt_curve = bpy.data.curves.new(name + "_Txt", type="FONT")
    txt_curve.body = body
    txt_curve.align_x = align_x
    txt_curve.align_y = "CENTER"
    txt_curve.size = scale
    txt_curve.extrude = extrude
    txt_curve.bevel_depth = extrude * 0.25
    txt_curve.bevel_resolution = 1
    txt_curve.space_character = 1.08

    txt_obj = bpy.data.objects.new(name + "_TmpTxt", txt_curve)
    link_obj(txt_obj, col)

    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    eval_obj = txt_obj.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(eval_obj)
    mesh.name = name + "_Mesh"
    set_smooth_with_edges(mesh)

    bpy.data.objects.remove(txt_obj, do_unlink=True)
    bpy.data.curves.remove(txt_curve, do_unlink=True)

    obj = bpy.data.objects.new(name, mesh)
    obj.location = Vector(pos)
    obj.rotation_euler = rot_euler
    obj.data.materials.append(mat)
    link_obj(obj, col)
    return obj


# ---------------------------------------------------------------------------
# Assemble StarSeed Pioneros Card #01/12 ("Tejedores del Micelio")
# ---------------------------------------------------------------------------
def build_pioneros_card_01():
    card_col = get_or_create_collection("StarSeedCard_Pioneros01")
    mats = create_materials()
    export_objs = []

    hw = 0.315  # Card width 0.63
    hh = 0.440  # Card height 0.88
    cr = 0.044
    n_pts = 80
    outer_contour = rounded_rect_uniform(hw, hh, cr, n_pts)

    # 1. Iridescent Outer Rim Collar
    rim_outer = rounded_rect_uniform(hw + 0.009, hh + 0.009, cr + 0.007, n_pts)
    rim_inner = rounded_rect_uniform(hw - 0.010, hh - 0.010, cr - 0.006, n_pts)
    rim = create_extruded_frame_ring("IridescentRim", rim_outer, rim_inner, -0.0145, 0.0125, mats["iridescent_rim"], card_col)
    add_weighted_normal_and_bevel(rim, 0.0014, 2)
    export_objs.append(rim)

    # 2. Card Slab Solid Core Backing + Sculpted Recessed Window Bezel (1:1 radial topology)
    slab_back = create_extruded_plate("CardSlab_Back", outer_contour, -0.0135, -0.0065, mats["obsidian_slab"], card_col)
    add_weighted_normal_and_bevel(slab_back, 0.0010, 2)
    export_objs.append(slab_back)

    portal_inner = portal_window_uniform(0.256, 0.334, n_pts)
    slab_frame = create_extruded_frame_ring("CardSlab_Frame", outer_contour, portal_inner, -0.0065, 0.0088, mats["obsidian_slab"], card_col)
    add_weighted_normal_and_bevel(slab_frame, 0.0014, 2)
    export_objs.append(slab_frame)

    trim_outer = portal_window_uniform(0.264, 0.342, n_pts)
    trim_inner = portal_window_uniform(0.253, 0.331, n_pts)
    portal_trim = create_extruded_frame_ring("CardSlab_PortalTrim", trim_outer, trim_inner, 0.0065, 0.0106, mats["antique_gold"], card_col)
    add_weighted_normal_and_bevel(portal_trim, 0.0007, 2)
    export_objs.append(portal_trim)

    # 3. Inner 4D Chamber Backplate
    chamber_pts = portal_window_uniform(0.258, 0.336, n_pts)
    chamber = create_extruded_plate("InnerChamber4D", chamber_pts, -0.0068, -0.0050, mats["chamber_4d"], card_col)
    export_objs.append(chamber)

    # 4. Floating 4D Flower of Life Layer inside recessed chamber
    fol_radius = 0.072
    fol_centers = [(0.0, 0.0)]
    for k in range(6):
        ang = k * math.pi / 3.0 + math.pi / 6.0
        fol_centers.append((fol_radius * math.cos(ang), fol_radius * math.sin(ang)))
    for k in range(12):
        ang = k * math.pi / 6.0
        dist = fol_radius * (2.0 if k % 2 == 0 else math.sqrt(3.0))
        if abs(dist * math.cos(ang)) < 0.20 and abs(dist * math.sin(ang)) < 0.26:
            fol_centers.append((dist * math.cos(ang), dist * math.sin(ang)))

    fol_bm = bmesh.new()
    for cx, cy in fol_centers:
        segs_m, segs_n, mr = 48, 8, 0.0014
        rings = []
        for i in range(segs_m):
            th = 2.0 * math.pi * i / segs_m
            ct, st = math.cos(th), math.sin(th)
            ring = []
            for j in range(segs_n):
                ph = 2.0 * math.pi * j / segs_n
                r = fol_radius + mr * math.cos(ph)
                ring.append(fol_bm.verts.new((cx + r * ct, cy + r * st, -0.0020 + mr * math.sin(ph))))
            rings.append(ring)
        for i in range(segs_m):
            ni = (i + 1) % segs_m
            for j in range(segs_n):
                nj = (j + 1) % segs_n
                fol_bm.faces.new([rings[i][j], rings[ni][j], rings[ni][nj], rings[i][nj]])
    for rad_c, thick_c in [(0.228, 0.0018), (0.236, 0.0012)]:
        segs_m, segs_n = 72, 8
        rings = []
        for i in range(segs_m):
            th = 2.0 * math.pi * i / segs_m
            ct, st = math.cos(th), math.sin(th)
            ring = []
            for j in range(segs_n):
                ph = 2.0 * math.pi * j / segs_n
                r = rad_c + thick_c * math.cos(ph)
                ring.append(fol_bm.verts.new((r * ct, r * st, -0.0015 + thick_c * math.sin(ph))))
            rings.append(ring)
        for i in range(segs_m):
            ni = (i + 1) % segs_m
            for j in range(segs_n):
                nj = (j + 1) % segs_n
                fol_bm.faces.new([rings[i][j], rings[ni][j], rings[ni][nj], rings[i][nj]])

    bmesh.ops.recalc_face_normals(fol_bm, faces=fol_bm.faces)
    fol_mesh = bpy.data.meshes.new("FlowerOfLifeLayer_Mesh")
    fol_bm.to_mesh(fol_mesh)
    fol_bm.free()
    set_smooth_with_edges(fol_mesh)
    fol_obj = bpy.data.objects.new("FlowerOfLifeLayer", fol_mesh)
    fol_obj.data.materials.append(mats["flower_gold"])
    link_obj(fol_obj, card_col)
    export_objs.append(fol_obj)

    # 5. Core StarSeed Symbol: Vesica Piscis Circles (Light top / Matter bottom)
    v_offset = 0.094
    v_radius = 0.165

    disc_bot = create_disc(
        "VesicaLowerObsidian", (0.0, -v_offset), v_radius, 0.0005, 0.0058, mats["vesica_obsidian"], card_col, segs=80
    )
    export_objs.append(disc_bot)

    disc_top = create_disc(
        "VesicaUpperSilver", (0.0, +v_offset), v_radius, 0.0015, 0.0070, mats["vesica_silver"], card_col, segs=80
    )
    export_objs.append(disc_top)

    bezel_top = create_torus_ring("VesicaBezelGold_Top", (0.0, +v_offset, 0.0074), v_radius + 0.0015, 0.0036, mats["antique_gold"], card_col, 88, 12)
    bezel_bot = create_torus_ring("VesicaBezelGold_Bot", (0.0, -v_offset, 0.0062), v_radius + 0.0015, 0.0036, mats["antique_gold"], card_col, 88, 12)
    circuit_bot = create_torus_ring("VesicaMatterCircuitRing", (0.0, -v_offset, 0.0060), v_radius * 0.86, 0.0012, mats["neon_cyan_line"], card_col, 80, 8)
    circuit_top = create_torus_ring("VesicaLightInnerRing", (0.0, +v_offset, 0.0072), v_radius * 0.86, 0.0010, mats["antique_gold"], card_col, 80, 8)
    export_objs.extend([bezel_top, bezel_bot, circuit_bot, circuit_top])

    # 6. Central Eye in the Vesica Piscis lens
    eye_col = get_or_create_collection("CentralEye", card_col)
    create_almond_vesica_eye(eye_col, mats)
    export_objs.extend(list(eye_col.objects))

    # 7. Upper Trinity RGB (Light: Red left, Green center, Blue right)
    y_top_base = 0.058
    y_top_apex = 0.198
    x_tri_half = 0.104
    x_mid_split = 0.035

    t_top_red = create_faceted_prism_triangle(
        "UpperTrinity_Red",
        (0.0, y_top_apex),
        (-x_tri_half, y_top_base),
        (-x_mid_split, y_top_base),
        0.0072,
        0.0086,
        mats["prism_red"],
        card_col,
        ridge_split=False,
    )
    t_top_green = create_faceted_prism_triangle(
        "UpperTrinity_Green",
        (0.0, y_top_apex),
        (-x_mid_split, y_top_base),
        (+x_mid_split, y_top_base),
        0.0074,
        0.0104,
        mats["prism_green"],
        card_col,
        ridge_split=True,
    )
    t_top_blue = create_faceted_prism_triangle(
        "UpperTrinity_Blue",
        (0.0, y_top_apex),
        (+x_mid_split, y_top_base),
        (+x_tri_half, y_top_base),
        0.0072,
        0.0086,
        mats["prism_blue"],
        card_col,
        ridge_split=False,
    )
    export_objs.extend([t_top_red, t_top_green, t_top_blue])

    # 8. Lower Trinity RYB (Matter: Red left, Yellow center, Blue right)
    y_bot_base = -0.058
    y_bot_apex = -0.198

    t_bot_red = create_faceted_prism_triangle(
        "LowerTrinity_Red",
        (0.0, y_bot_apex),
        (-x_tri_half, y_bot_base),
        (-x_mid_split, y_bot_base),
        0.0062,
        0.0086,
        mats["prism_red"],
        card_col,
        ridge_split=False,
    )
    t_bot_yellow = create_faceted_prism_triangle(
        "LowerTrinity_Yellow",
        (0.0, y_bot_apex),
        (-x_mid_split, y_bot_base),
        (+x_mid_split, y_bot_base),
        0.0064,
        0.0104,
        mats["prism_yellow"],
        card_col,
        ridge_split=True,
    )
    t_bot_blue = create_faceted_prism_triangle(
        "LowerTrinity_Blue",
        (0.0, y_bot_apex),
        (+x_mid_split, y_bot_base),
        (+x_tri_half, y_bot_base),
        0.0062,
        0.0086,
        mats["prism_blue"],
        card_col,
        ridge_split=False,
    )
    export_objs.extend([t_bot_red, t_bot_yellow, t_bot_blue])

    # 9. Sculpted 3D Golden Mycelium Weave framing the outer Vesica & corners (leaves center symbol pristine!)
    myc_col = get_or_create_collection("MyceliumWeave", card_col)

    # Lower horizontal infinity cradle beneath the Matter circle
    lem_pts = []
    n_lem = 44
    for i in range(n_lem):
        t = 2.0 * math.pi * i / n_lem
        x = 0.205 * math.sin(t)
        y = -0.258 + 0.048 * math.sin(t) * math.cos(t)
        z = 0.0085 + 0.0032 * math.sin(2.0 * t + 0.5)
        lem_pts.append((x, y, z))
    lem_pts.append(lem_pts[0])
    create_curve_tube("Mycelium_InfinityBase", lem_pts, 0.0040, 0.0036, mats["antique_gold"], myc_col, tapers=False)

    tendril_paths = [
        # Outer sweeping roots around bottom and sides
        [(0.0, -0.275, 0.009), (-0.08, -0.305, 0.011), (-0.17, -0.295, 0.011), (-0.23, -0.235, 0.010), (-0.255, -0.145, 0.009)],
        [(-0.17, -0.295, 0.010), (-0.21, -0.345, 0.011), (-0.265, -0.375, 0.010)],
        # Side ascending mycelium filigree hugging the portal arch
        [(-0.228, -0.135, 0.009), (-0.252, -0.040, 0.011), (-0.252, +0.065, 0.011), (-0.228, +0.165, 0.010), (-0.185, +0.245, 0.009)],
        # Upper crown mycelium arches framing the Light circle & top corners
        [(0.0, +0.272, 0.009), (-0.085, +0.298, 0.011), (-0.175, +0.290, 0.011), (-0.240, +0.340, 0.010), (-0.270, +0.382, 0.010)],
        [(-0.085, +0.298, 0.010), (-0.045, +0.332, 0.009), (0.0, +0.320, 0.009)],
    ]

    for idx, base_path in enumerate(tendril_paths):
        create_curve_tube(f"Mycelium_L_{idx}", base_path, 0.0042, 0.0014, mats["antique_gold"], myc_col, tapers=True)
        mirror_path = [(-x, y, z) for (x, y, z) in base_path]
        create_curve_tube(f"Mycelium_R_{idx}", mirror_path, 0.0042, 0.0014, mats["antique_gold"], myc_col, tapers=True)

    export_objs.extend(list(myc_col.objects))

    # 10. Corner Quartz & Amethyst Crystal Clusters with golden base collars
    crys_col = get_or_create_collection("CornerCrystals", card_col)
    corner_specs = [(-1, +1, "TL"), (+1, +1, "TR"), (-1, -1, "BL"), (+1, -1, "BR")]
    for sx, sy, tag in corner_specs:
        create_hex_crystal(
            f"Crystal_QuartzMain_{tag}",
            (sx * 0.284, sy * 0.394, 0.006),
            (-sx * 0.62, -sy * 0.65, 0.44),
            0.095,
            0.019,
            mats["quartz_crystal"],
            crys_col,
        )
        create_hex_crystal(
            f"Crystal_Amethyst_{tag}",
            (sx * 0.252, sy * 0.402, 0.007),
            (-sx * 0.44, -sy * 0.78, 0.44),
            0.074,
            0.015,
            mats["amethyst_crystal"],
            crys_col,
        )
        create_hex_crystal(
            f"Crystal_QuartzSide_{tag}",
            (sx * 0.292, sy * 0.348, 0.006),
            (-sx * 0.80, -sy * 0.42, 0.43),
            0.064,
            0.013,
            mats["quartz_crystal"],
            crys_col,
        )
        # Golden mounting setting ring at each corner cluster base
        create_torus_ring(
            f"Crystal_Setting_{tag}",
            (sx * 0.278, sy * 0.388, 0.009),
            0.024,
            0.0032,
            mats["antique_gold"],
            crys_col,
            32,
            8,
        )
    export_objs.extend(list(crys_col.objects))

    # 11. Front Header & Bottom Edition Cartouche Plates + Crisp 3D Typography
    badge_col = get_or_create_collection("FrontBadgePlates", card_col)
    top_plaque_pts = [(x, y + 0.382) for (x, y) in rounded_rect_uniform(0.186, 0.025, 0.011, 48)]
    top_plaque = create_extruded_plate("TopCartouche", top_plaque_pts, 0.0085, 0.0124, mats["obsidian_slab"], badge_col)
    add_weighted_normal_and_bevel(top_plaque, 0.0007, 2)

    top_bezel_outer = [(x, y + 0.382) for (x, y) in rounded_rect_uniform(0.191, 0.029, 0.013, 48)]
    top_bezel_inner = [(x, y + 0.382) for (x, y) in rounded_rect_uniform(0.184, 0.023, 0.010, 48)]
    create_extruded_frame_ring("TopCartoucheBezel", top_bezel_outer, top_bezel_inner, 0.0085, 0.0130, mats["antique_gold"], badge_col)

    bot_plaque_pts = [(x, y - 0.376) for (x, y) in rounded_rect_uniform(0.214, 0.032, 0.013, 48)]
    bot_plaque = create_extruded_plate("BottomCartouche", bot_plaque_pts, 0.0085, 0.0124, mats["obsidian_slab"], badge_col)
    add_weighted_normal_and_bevel(bot_plaque, 0.0007, 2)

    bot_bezel_outer = [(x, y - 0.376) for (x, y) in rounded_rect_uniform(0.219, 0.036, 0.015, 48)]
    bot_bezel_inner = [(x, y - 0.376) for (x, y) in rounded_rect_uniform(0.212, 0.030, 0.012, 48)]
    create_extruded_frame_ring("BottomCartoucheBezel", bot_bezel_outer, bot_bezel_inner, 0.0085, 0.0130, mats["antique_gold"], badge_col)

    create_3d_text(
        "Text_Header",
        "STARSEED OS · PIONEROS",
        (0.0, 0.382, 0.0132),
        0.020,
        0.0010,
        mats["text_gold"],
        badge_col,
    )
    create_3d_text(
        "Text_Title",
        "TEJEDORES DEL MICELIO",
        (0.0, -0.365, 0.0132),
        0.0185,
        0.0010,
        mats["text_silver"],
        badge_col,
    )
    create_3d_text(
        "Text_Serial",
        "SERIE #001 / 012 · FUNDACIONAL",
        (0.0, -0.391, 0.0132),
        0.0125,
        0.0008,
        mats["text_gold"],
        badge_col,
    )
    export_objs.extend(list(badge_col.objects))

    # 12. Back Face Emblem & Engraved Seal (-Z face)
    back_col = get_or_create_collection("BackSeal", card_col)
    create_torus_ring("Back_OuterRing", (0.0, 0.030, -0.0144), 0.195, 0.0042, mats["antique_gold"], back_col, 96, 10)
    create_torus_ring("Back_InnerRing", (0.0, 0.030, -0.0142), 0.165, 0.0024, mats["iridescent_rim"], back_col, 88, 10)
    create_torus_ring("Back_VesicaTop", (0.0, 0.082, -0.0146), 0.095, 0.0030, mats["vesica_silver"], back_col, 72, 10)
    create_torus_ring("Back_VesicaBot", (0.0, -0.022, -0.0146), 0.095, 0.0030, mats["antique_gold"], back_col, 72, 10)
    create_torus_ring("Back_EyeSeal", (0.0, 0.030, -0.0148), 0.032, 0.0024, mats["neon_cyan_line"], back_col, 48, 8)

    create_3d_text(
        "Back_TextBrand",
        "STARSEED OS",
        (0.0, 0.305, -0.0146),
        0.028,
        0.0012,
        mats["text_gold"],
        back_col,
        rot_euler=(0.0, math.pi, 0.0),
    )
    create_3d_text(
        "Back_TextEdition",
        "EDICIÓN PIONEROS · 001 / 012",
        (0.0, -0.225, -0.0146),
        0.018,
        0.0010,
        mats["text_silver"],
        back_col,
        rot_euler=(0.0, math.pi, 0.0),
    )
    create_3d_text(
        "Back_TextSlogan",
        "TEJEDORES DEL MICELIO · 4D",
        (0.0, -0.268, -0.0146),
        0.0135,
        0.0008,
        mats["text_gold"],
        back_col,
        rot_euler=(0.0, math.pi, 0.0),
    )
    export_objs.extend(list(back_col.objects))

    return export_objs


# ---------------------------------------------------------------------------
# Studio World (Dark Camera Vignette + Vibrant Spectral Reflection Bands)
# ---------------------------------------------------------------------------
def setup_spectral_studio_world():
    world = bpy.data.worlds.new("StarSeedStudioWorld")
    bpy.context.scene.world = world
    nt = world.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputWorld")
    out.location = (760, 0)

    mix_shader = nt.nodes.new("ShaderNodeMixShader")
    mix_shader.location = (540, 0)

    lp = nt.nodes.new("ShaderNodeLightPath")
    lp.location = (220, 260)

    # Background 1 (Reflections / Lighting): Vibrant spectral reflection ribbons for thin-film foil
    bg_refl = nt.nodes.new("ShaderNodeBackground")
    bg_refl.location = (280, -80)
    bg_refl.inputs["Strength"].default_value = 2.2

    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-560, -80)
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"
    wave.bands_direction = "DIAGONAL"
    wave.location = (-340, -120)
    wave.inputs["Scale"].default_value = 0.72
    wave.inputs["Distortion"].default_value = 0.85

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.location = (-60, -80)
    ramp.color_ramp.interpolation = "B_SPLINE"
    elts = ramp.color_ramp.elements
    elts[0].position = 0.0
    elts[0].color = (0.02, 0.03, 0.09, 1.0)
    e1 = elts.new(0.24)
    e1.color = (0.06, 0.42, 0.75, 1.0)
    e2 = elts.new(0.48)
    e2.color = (0.55, 0.14, 0.72, 1.0)
    e3 = elts.new(0.72)
    e3.color = (0.85, 0.58, 0.18, 1.0)
    elts[-1].position = 1.0
    elts[-1].color = (0.04, 0.22, 0.36, 1.0)

    # Background 2 (Camera Rays): Rich dark obsidian-indigo studio backdrop
    bg_cam = nt.nodes.new("ShaderNodeBackground")
    bg_cam.location = (280, 100)
    bg_cam.inputs["Color"].default_value = (0.010, 0.015, 0.036, 1.0)
    bg_cam.inputs["Strength"].default_value = 1.0

    nt.links.new(tc.outputs["Generated"], wave.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg_refl.inputs["Color"])
    nt.links.new(lp.outputs["Is Camera Ray"], mix_shader.inputs["Fac"])
    nt.links.new(bg_refl.outputs["Background"], mix_shader.inputs[1])
    nt.links.new(bg_cam.outputs["Background"], mix_shader.inputs[2])
    nt.links.new(mix_shader.outputs["Shader"], out.inputs["Surface"])


def point_camera_or_light_at(obj, loc, target, world_up=(0.0, 1.0, 0.0)):
    loc_v = Vector(loc)
    tgt_v = Vector(target)
    forward = (tgt_v - loc_v).normalized()
    up_ref = Vector(world_up).normalized()
    if abs(forward.dot(up_ref)) > 0.995:
        up_ref = Vector((0.0, 0.0, 1.0))
    right = forward.cross(up_ref).normalized()
    up = right.cross(forward).normalized()
    rot_mat = Matrix((
        (right.x, up.x, -forward.x, 0.0),
        (right.y, up.y, -forward.y, 0.0),
        (right.z, up.z, -forward.z, 0.0),
        (0.0, 0.0, 0.0, 1.0),
    ))
    obj.matrix_world = Matrix.Translation(loc_v) @ rot_mat


def add_area_light(name, location, target, energy, size, color, col):
    ldata = bpy.data.lights.new(name=name, type="AREA")
    ldata.energy = energy
    ldata.size = size
    ldata.color = color
    lobj = bpy.data.objects.new(name=name, object_data=ldata)
    point_camera_or_light_at(lobj, location, target)
    link_obj(lobj, col)
    return lobj


def setup_lights_and_studio_backdrop():
    studio_col = get_or_create_collection("StudioRig")
    setup_spectral_studio_world()

    add_area_light("KeyLight_WarmGold", (-1.10, 1.25, 1.90), (0.0, 0.0, 0.0), 46.0, 1.20, (1.0, 0.94, 0.84), studio_col)
    add_area_light("RimLight_CyanViolet", (1.35, 0.55, 1.05), (0.0, 0.0, 0.0), 38.0, 1.15, (0.45, 0.88, 1.0), studio_col)
    add_area_light("Catchlight_CrispWhite", (0.72, 0.88, 2.25), (0.0, 0.0, 0.01), 26.0, 0.65, (1.0, 1.0, 1.0), studio_col)
    add_area_light("UnderFill_MagentaGold", (0.12, -1.45, 1.15), (0.0, -0.1, 0.0), 22.0, 1.25, (0.94, 0.42, 0.90), studio_col)
    add_area_light("BackKey_Gold", (-0.95, 0.95, -1.80), (0.0, 0.0, -0.01), 42.0, 1.10, (1.0, 0.88, 0.68), studio_col)
    add_area_light("BackRim_Cyan", (1.15, -0.55, -1.45), (0.0, 0.0, -0.01), 32.0, 1.00, (0.35, 0.90, 1.0), studio_col)
    return studio_col


def configure_cycles(samples=48, width=1080, height=1440):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    # Note: CPU + OpenImageDenoise avoids headless Metal shader-compile stalls on macOS
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.025
    scene.cycles.use_denoising = True
    try:
        scene.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    scene.cycles.max_bounces = 8
    scene.cycles.glossy_bounces = 4
    scene.cycles.transmission_bounces = 6

    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False

    try:
        scene.view_settings.view_transform = "AgX"
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        scene.view_settings.view_transform = "Filmic"
        scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0.05


def render_camera_view(name, location, target, lens_mm, filename, studio_col, dof_dist=None, fstop=5.6):
    cam_data = bpy.data.cameras.new(name + "_Cam")
    cam_data.lens = lens_mm
    cam_data.clip_start = 0.01
    cam_data.clip_end = 50.0
    if dof_dist is not None:
        cam_data.dof.use_dof = True
        cam_data.dof.focus_distance = dof_dist
        cam_data.dof.aperture_fstop = fstop

    cam_obj = bpy.data.objects.new(name + "_CamObj", cam_data)
    point_camera_or_light_at(cam_obj, location, target)
    link_obj(cam_obj, studio_col)

    scene = bpy.context.scene
    scene.camera = cam_obj
    out_path = os.path.join(RENDERS_DIR, filename)
    scene.render.filepath = out_path
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"RENDERED_{name}: {out_path} in {time.time() - t0:.1f}s", flush=True)


def export_card_glb(export_objs):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in export_objs:
        if obj.name in bpy.data.objects:
            obj.select_set(True)
    if export_objs:
        bpy.context.view_layer.objects.active = export_objs[0]

    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
        export_draco_mesh_compression_enable=False,
    )
    size_mb = os.path.getsize(GLB_OUT) / (1024.0 * 1024.0)
    print(f"EXPORTED_GLB: {GLB_OUT} ({size_mb:.2f} MB)", flush=True)


def main():
    clear_scene()
    export_objs = build_pioneros_card_01()
    studio_col = setup_lights_and_studio_backdrop()
    configure_cycles(samples=32, width=960, height=1280)

    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
    print(f"SAVED_BLEND: {BLEND_OUT}", flush=True)

    export_card_glb(export_objs)

    render_camera_view(
        "FrontHero",
        (0.11, -0.02, 1.54),
        (0.0, 0.0, 0.0),
        52.0,
        "pioneros_01_front_hero.png",
        studio_col,
    )
    render_camera_view(
        "AngleIridescent",
        (-0.84, -0.22, 1.24),
        (0.0, 0.0, 0.0),
        50.0,
        "pioneros_01_angle_iridescent.png",
        studio_col,
    )
    render_camera_view(
        "MacroEyeTrinity",
        (0.14, 0.03, 0.72),
        (0.0, 0.0, 0.01),
        64.0,
        "pioneros_01_macro_eye_trinity.png",
        studio_col,
        dof_dist=0.73,
        fstop=5.6,
    )
    render_camera_view(
        "BackRelic",
        (-0.46, -0.06, -1.46),
        (0.0, 0.0, -0.01),
        52.0,
        "pioneros_01_back_relic.png",
        studio_col,
    )
    print("ALL_RENDERS_COMPLETE", flush=True)


if __name__ == "__main__":
    main()
