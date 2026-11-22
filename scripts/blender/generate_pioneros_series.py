#!/usr/bin/env python3
"""
Blender 5.2.3 LTS Generator — Colección Completa "Pioneros StarSeed" (#001 - #012)
Genera los 12 diseños únicos 3D/4D hiperrealistas con:
  - Simbología sagrada canónica de StarSeed (Vesica Piscis Luz/Materia, Ojo central con destello,
    Trinidad superior RGB y Trinidad inferior RYB).
  - Esculturas de geometría sagrada y ornamentos únicos por diseño en capas 4D animables
    (SacredGeometry4D, OuterOrbit4D, FlowerOfLifeLayer, InnerChamber4D, CornerCrystals).
  - Exportación .glb offline PBR (sin Draco externo, optimizado < 1.8 MB/tarjeta).
  - Renders Cycles + OpenImageDenoise (720x960 @ 28 muestras) de los 12 diseños.

Uso:
  /opt/homebrew/bin/blender -b --factory-startup -P scripts/blender/generate_pioneros_series.py
  /opt/homebrew/bin/blender -b --factory-startup -P scripts/blender/generate_pioneros_series.py -- --only 2,3
"""

import math
import os
import sys
import time
import bpy
import bmesh
from mathutils import Vector, Matrix


ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RENDERS_DIR = os.path.join(ROOT_DIR, "docs", "cards", "renders")
CARDS_OUT_DIR = os.path.join(ROOT_DIR, "public", "cards")
os.makedirs(RENDERS_DIR, exist_ok=True)
os.makedirs(CARDS_OUT_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Specification of All 12 Pioneros StarSeed Designs
# ---------------------------------------------------------------------------
PIONEROS_SPECS = [
    {
        "num": 1,
        "slug": "pioneros-01",
        "title": "TEJEDORES DEL MICELIO",
        "area": "FUNDACIÓN & ARQUITECTURA",
        "motif": "mycelium_flower",
        "slab_color": (0.008, 0.010, 0.020, 1.0),
        "rim_color": (0.82, 0.86, 0.94, 1.0),
        "rim_film": 510.0,
        "gold_color": (0.94, 0.72, 0.28, 1.0),
        "upper_disc": (0.94, 0.95, 0.99, 1.0),
        "lower_disc": (0.010, 0.013, 0.022, 1.0),
        "iris_color": (0.14, 0.72, 0.95, 1.0),
        "crystal_a": (0.86, 0.96, 1.0, 1.0),
        "crystal_b": (0.60, 0.18, 0.92, 1.0),
        "circuit_color": (0.15, 0.94, 1.0, 1.0),
        "chamber_a": (0.012, 0.018, 0.045, 1.0),
        "chamber_b": (0.045, 0.018, 0.088, 1.0),
        "cam_loc": (-0.34, -0.10, 1.48),
    },
    {
        "num": 2,
        "slug": "pioneros-02",
        "title": "SEMILLA DE LA LUZ",
        "area": "AUDIO & SINESTESIA",
        "motif": "seed_solar",
        "slab_color": (0.015, 0.013, 0.010, 1.0),
        "rim_color": (0.98, 0.86, 0.56, 1.0),
        "rim_film": 360.0,
        "gold_color": (1.0, 0.82, 0.32, 1.0),
        "upper_disc": (0.98, 0.96, 0.90, 1.0),
        "lower_disc": (0.014, 0.014, 0.020, 1.0),
        "iris_color": (0.96, 0.78, 0.18, 1.0),
        "crystal_a": (0.98, 0.98, 0.92, 1.0),
        "crystal_b": (0.96, 0.68, 0.10, 1.0),
        "circuit_color": (1.0, 0.84, 0.25, 1.0),
        "chamber_a": (0.025, 0.022, 0.012, 1.0),
        "chamber_b": (0.065, 0.048, 0.015, 1.0),
        "cam_loc": (0.34, -0.08, 1.48),
    },
    {
        "num": 3,
        "slug": "pioneros-03",
        "title": "OJO DE LA VESICA",
        "area": "IA & CONSCIENCIA",
        "motif": "astrolabe_eye",
        "slab_color": (0.010, 0.014, 0.024, 1.0),
        "rim_color": (0.76, 0.56, 0.34, 1.0),
        "rim_film": 440.0,
        "gold_color": (0.86, 0.60, 0.24, 1.0),
        "upper_disc": (0.90, 0.93, 0.98, 1.0),
        "lower_disc": (0.008, 0.014, 0.026, 1.0),
        "iris_color": (0.12, 0.86, 0.98, 1.0),
        "crystal_a": (0.18, 0.72, 1.0, 1.0),
        "crystal_b": (0.96, 0.74, 0.22, 1.0),
        "circuit_color": (0.12, 0.95, 1.0, 1.0),
        "chamber_a": (0.010, 0.022, 0.042, 1.0),
        "chamber_b": (0.020, 0.055, 0.075, 1.0),
        "cam_loc": (-0.32, 0.10, 1.48),
    },
    {
        "num": 4,
        "slug": "pioneros-04",
        "title": "PRISMA DE LA TRINIDAD",
        "area": "AUDIO & SINESTESIA",
        "motif": "hexagram_prisms",
        "slab_color": (0.012, 0.012, 0.022, 1.0),
        "rim_color": (0.90, 0.93, 0.98, 1.0),
        "rim_film": 540.0,
        "gold_color": (0.92, 0.88, 0.96, 1.0),
        "upper_disc": (0.96, 0.97, 1.0, 1.0),
        "lower_disc": (0.010, 0.010, 0.018, 1.0),
        "iris_color": (0.48, 0.84, 1.0, 1.0),
        "crystal_a": (0.95, 0.98, 1.0, 1.0),
        "crystal_b": (0.28, 0.62, 1.0, 1.0),
        "circuit_color": (0.96, 0.35, 0.88, 1.0),
        "chamber_a": (0.024, 0.016, 0.042, 1.0),
        "chamber_b": (0.016, 0.040, 0.075, 1.0),
        "cam_loc": (0.32, 0.09, 1.48),
    },
    {
        "num": 5,
        "slug": "pioneros-05",
        "title": "FLOR DEL ÉTER",
        "area": "FUNDACIÓN & ARQUITECTURA",
        "motif": "ether_flower_3d",
        "slab_color": (0.014, 0.012, 0.032, 1.0),
        "rim_color": (0.78, 0.74, 0.96, 1.0),
        "rim_film": 560.0,
        "gold_color": (0.92, 0.78, 0.42, 1.0),
        "upper_disc": (0.93, 0.92, 0.99, 1.0),
        "lower_disc": (0.012, 0.010, 0.030, 1.0),
        "iris_color": (0.64, 0.56, 1.0, 1.0),
        "crystal_a": (0.96, 0.72, 0.88, 1.0),
        "crystal_b": (0.58, 0.64, 1.0, 1.0),
        "circuit_color": (0.72, 0.62, 1.0, 1.0),
        "chamber_a": (0.022, 0.016, 0.064, 1.0),
        "chamber_b": (0.075, 0.024, 0.095, 1.0),
        "cam_loc": (-0.36, -0.06, 1.48),
    },
    {
        "num": 6,
        "slug": "pioneros-06",
        "title": "CUBO DE METATRÓN",
        "area": "HARDWARE & NEURONAS",
        "motif": "metatron_cube",
        "slab_color": (0.011, 0.012, 0.016, 1.0),
        "rim_color": (0.92, 0.74, 0.36, 1.0),
        "rim_film": 420.0,
        "gold_color": (0.96, 0.74, 0.24, 1.0),
        "upper_disc": (0.94, 0.94, 0.96, 1.0),
        "lower_disc": (0.010, 0.012, 0.016, 1.0),
        "iris_color": (0.98, 0.68, 0.16, 1.0),
        "crystal_a": (0.20, 0.90, 0.78, 1.0),
        "crystal_b": (0.96, 0.72, 0.18, 1.0),
        "circuit_color": (0.96, 0.76, 0.22, 1.0),
        "chamber_a": (0.016, 0.020, 0.028, 1.0),
        "chamber_b": (0.048, 0.036, 0.018, 1.0),
        "cam_loc": (0.36, -0.06, 1.48),
    },
    {
        "num": 7,
        "slug": "pioneros-07",
        "title": "RAÍCES CUÁNTICAS",
        "area": "HARDWARE & NEURONAS",
        "motif": "quantum_roots",
        "slab_color": (0.014, 0.012, 0.010, 1.0),
        "rim_color": (0.82, 0.50, 0.28, 1.0),
        "rim_film": 470.0,
        "gold_color": (0.88, 0.52, 0.26, 1.0),
        "upper_disc": (0.92, 0.95, 0.94, 1.0),
        "lower_disc": (0.008, 0.018, 0.014, 1.0),
        "iris_color": (0.12, 0.92, 0.56, 1.0),
        "crystal_a": (0.14, 0.88, 0.52, 1.0),
        "crystal_b": (0.72, 0.54, 0.36, 1.0),
        "circuit_color": (0.14, 0.96, 0.58, 1.0),
        "chamber_a": (0.010, 0.028, 0.022, 1.0),
        "chamber_b": (0.032, 0.018, 0.055, 1.0),
        "cam_loc": (-0.34, -0.10, 1.48),
    },
    {
        "num": 8,
        "slug": "pioneros-08",
        "title": "CRISTAL DE AMATISTA",
        "area": "COMUNIDAD & CULTURA",
        "motif": "amethyst_geode",
        "slab_color": (0.016, 0.009, 0.028, 1.0),
        "rim_color": (0.84, 0.76, 0.96, 1.0),
        "rim_film": 610.0,
        "gold_color": (0.90, 0.86, 0.96, 1.0),
        "upper_disc": (0.95, 0.93, 1.0, 1.0),
        "lower_disc": (0.014, 0.008, 0.026, 1.0),
        "iris_color": (0.76, 0.32, 1.0, 1.0),
        "crystal_a": (0.68, 0.16, 0.98, 1.0),
        "crystal_b": (0.94, 0.28, 0.62, 1.0),
        "circuit_color": (0.82, 0.42, 1.0, 1.0),
        "chamber_a": (0.032, 0.010, 0.058, 1.0),
        "chamber_b": (0.078, 0.016, 0.088, 1.0),
        "cam_loc": (0.34, -0.10, 1.48),
    },
    {
        "num": 9,
        "slug": "pioneros-09",
        "title": "PUERTA DE LA MALLA",
        "area": "HARDWARE & NEURONAS",
        "motif": "toroid_mesh",
        "slab_color": (0.008, 0.014, 0.026, 1.0),
        "rim_color": (0.36, 0.78, 0.98, 1.0),
        "rim_film": 520.0,
        "gold_color": (0.58, 0.88, 1.0, 1.0),
        "upper_disc": (0.92, 0.96, 1.0, 1.0),
        "lower_disc": (0.006, 0.014, 0.028, 1.0),
        "iris_color": (0.14, 0.94, 0.88, 1.0),
        "crystal_a": (0.20, 0.90, 1.0, 1.0),
        "crystal_b": (0.38, 0.48, 1.0, 1.0),
        "circuit_color": (0.18, 0.98, 0.82, 1.0),
        "chamber_a": (0.008, 0.026, 0.056, 1.0),
        "chamber_b": (0.018, 0.055, 0.092, 1.0),
        "cam_loc": (-0.33, 0.08, 1.48),
    },
    {
        "num": 10,
        "slug": "pioneros-10",
        "title": "ALQUIMISTA DEL SONIDO",
        "area": "AUDIO & SINESTESIA",
        "motif": "cymatic_spiral",
        "slab_color": (0.018, 0.010, 0.016, 1.0),
        "rim_color": (0.96, 0.68, 0.58, 1.0),
        "rim_film": 480.0,
        "gold_color": (0.98, 0.72, 0.56, 1.0),
        "upper_disc": (0.98, 0.94, 0.94, 1.0),
        "lower_disc": (0.016, 0.009, 0.016, 1.0),
        "iris_color": (0.98, 0.48, 0.62, 1.0),
        "crystal_a": (0.98, 0.76, 0.24, 1.0),
        "crystal_b": (0.98, 0.42, 0.58, 1.0),
        "circuit_color": (0.98, 0.66, 0.26, 1.0),
        "chamber_a": (0.036, 0.014, 0.024, 1.0),
        "chamber_b": (0.068, 0.026, 0.016, 1.0),
        "cam_loc": (0.33, 0.08, 1.48),
    },
    {
        "num": 11,
        "slug": "pioneros-11",
        "title": "CORONA DE NEURONAS",
        "area": "COMUNIDAD & CULTURA",
        "motif": "neuron_crown",
        "slab_color": (0.014, 0.012, 0.018, 1.0),
        "rim_color": (0.96, 0.78, 0.28, 1.0),
        "rim_film": 450.0,
        "gold_color": (0.96, 0.74, 0.22, 1.0),
        "upper_disc": (0.96, 0.95, 0.92, 1.0),
        "lower_disc": (0.010, 0.012, 0.020, 1.0),
        "iris_color": (0.20, 0.82, 1.0, 1.0),
        "crystal_a": (0.96, 0.78, 0.22, 1.0),
        "crystal_b": (0.20, 0.76, 0.98, 1.0),
        "circuit_color": (0.22, 0.88, 1.0, 1.0),
        "chamber_a": (0.022, 0.018, 0.032, 1.0),
        "chamber_b": (0.056, 0.032, 0.018, 1.0),
        "cam_loc": (-0.34, -0.09, 1.48),
    },
    {
        "num": 12,
        "slug": "pioneros-12",
        "title": "NEXO SOBERANO",
        "area": "FUNDACIÓN & ARQUITECTURA",
        "motif": "merkaba_omega",
        "slab_color": (0.009, 0.011, 0.024, 1.0),
        "rim_color": (0.94, 0.96, 1.0, 1.0),
        "rim_film": 590.0,
        "gold_color": (0.98, 0.84, 0.44, 1.0),
        "upper_disc": (0.98, 0.98, 1.0, 1.0),
        "lower_disc": (0.008, 0.009, 0.020, 1.0),
        "iris_color": (0.86, 0.56, 1.0, 1.0),
        "crystal_a": (0.92, 0.98, 1.0, 1.0),
        "crystal_b": (0.72, 0.26, 1.0, 1.0),
        "circuit_color": (0.45, 0.95, 1.0, 1.0),
        "chamber_a": (0.018, 0.014, 0.052, 1.0),
        "chamber_b": (0.068, 0.024, 0.096, 1.0),
        "cam_loc": (0.35, -0.09, 1.48),
    },
]


# ---------------------------------------------------------------------------
# Helpers & Materials
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


def add_weighted_normal_and_bevel(obj, bevel_width=0.0011, segments=1, angle_limit=math.radians(34)):
    if bevel_width > 0:
        bev = obj.modifiers.new(name="Bevel", type="BEVEL")
        bev.width = bevel_width
        bev.segments = segments
        bev.limit_method = "ANGLE"
        bev.angle_limit = angle_limit
        bev.harden_normals = False
    wn = obj.modifiers.new(name="WeightedNormal", type="WEIGHTED_NORMAL")
    wn.keep_sharp = True


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
):
    mat = bpy.data.materials.new(name=name)
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (380, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (60, 0)

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

    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def make_iridescent_chamber_material(color_a, color_b, film_center=520.0):
    mat = bpy.data.materials.new(name="Mat_InnerChamber4D")
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (540, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (220, 0)

    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-640, 0)
    grad = nt.nodes.new("ShaderNodeTexGradient")
    grad.gradient_type = "SPHERICAL"
    grad.location = (-420, 120)
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "RINGS"
    wave.rings_direction = "Z"
    wave.location = (-420, -140)
    wave.inputs["Scale"].default_value = 14.0
    wave.inputs["Distortion"].default_value = 1.2

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.location = (-160, 120)
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = color_a
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = color_b

    film_map = nt.nodes.new("ShaderNodeMapRange")
    film_map.location = (-120, -140)
    film_map.inputs["From Min"].default_value = 0.0
    film_map.inputs["From Max"].default_value = 1.0
    film_map.inputs["To Min"].default_value = max(280.0, film_center - 150.0)
    film_map.inputs["To Max"].default_value = min(720.0, film_center + 150.0)

    set_input(bsdf, "Metallic", 0.78)
    set_input(bsdf, "Roughness", 0.18)
    set_input(bsdf, "Coat Weight", 0.95)
    set_input(bsdf, "Coat Roughness", 0.04)
    set_input(bsdf, "Thin Film IOR", 1.48)
    set_input(bsdf, "Emission Color", (color_b[0] * 0.6, color_b[1] * 0.8, color_b[2] * 1.1, 1.0))
    set_input(bsdf, "Emission Strength", 0.18)

    nt.links.new(tc.outputs["Object"], grad.inputs["Vector"])
    nt.links.new(tc.outputs["Object"], wave.inputs["Vector"])
    nt.links.new(grad.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(wave.outputs["Fac"], film_map.inputs["Value"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(film_map.outputs["Result"], bsdf.inputs["Thin Film Thickness"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def create_materials_for_spec(spec):
    mats = {}
    gold = spec["gold_color"]
    circ = spec["circuit_color"]
    iris = spec["iris_color"]
    ca = spec["crystal_a"]
    cb = spec["crystal_b"]

    mats["obsidian_slab"] = make_material(
        "Mat_ObsidianSlab",
        base_color=spec["slab_color"],
        metallic=0.45,
        roughness=0.14,
        coat_weight=0.92,
        coat_roughness=0.05,
        thin_film_thickness=spec["rim_film"],
        thin_film_ior=1.45,
    )
    mats["iridescent_rim"] = make_material(
        "Mat_IridescentRim",
        base_color=spec["rim_color"],
        metallic=0.96,
        roughness=0.12,
        coat_weight=1.0,
        coat_roughness=0.03,
        thin_film_thickness=spec["rim_film"],
        thin_film_ior=1.52,
    )
    mats["chamber_4d"] = make_iridescent_chamber_material(spec["chamber_a"], spec["chamber_b"], spec["rim_film"])
    mats["antique_gold"] = make_material(
        "Mat_AntiqueGold",
        base_color=gold,
        metallic=0.95,
        roughness=0.19,
        coat_weight=0.55,
        coat_roughness=0.06,
        thin_film_thickness=330.0,
        thin_film_ior=1.38,
        emission_color=gold,
        emission_strength=0.12,
    )
    mats["sacred_glow"] = make_material(
        "Mat_SacredGeometryGold",
        base_color=gold,
        metallic=0.92,
        roughness=0.15,
        thin_film_thickness=470.0,
        thin_film_ior=1.46,
        emission_color=(gold[0] * 0.85, gold[1] * 0.85, gold[2] * 0.85, 1.0),
        emission_strength=0.58,
    )
    mats["orbit_glow"] = make_material(
        "Mat_OrbitAccent",
        base_color=circ,
        metallic=0.45,
        roughness=0.12,
        coat_weight=0.9,
        thin_film_thickness=520.0,
        thin_film_ior=1.48,
        emission_color=circ,
        emission_strength=0.95,
    )
    mats["text_gold"] = make_material(
        "Mat_TextGoldGlow",
        base_color=(0.98, 0.84, 0.45, 1.0),
        metallic=0.90,
        roughness=0.16,
        coat_weight=0.8,
        emission_color=(0.98, 0.80, 0.36, 1.0),
        emission_strength=0.55,
    )
    mats["text_silver"] = make_material(
        "Mat_TextSilverGlow",
        base_color=(0.94, 0.96, 1.0, 1.0),
        metallic=0.90,
        roughness=0.15,
        coat_weight=0.8,
        emission_color=(0.84, 0.94, 1.0, 1.0),
        emission_strength=0.45,
    )
    mats["vesica_silver"] = make_material(
        "Mat_VesicaUpperSilver",
        base_color=spec["upper_disc"],
        metallic=0.90,
        roughness=0.19,
        anisotropic=0.65,
        coat_weight=0.60,
        coat_roughness=0.04,
        thin_film_thickness=270.0,
        thin_film_ior=1.36,
    )
    mats["vesica_obsidian"] = make_material(
        "Mat_VesicaLowerObsidian",
        base_color=spec["lower_disc"],
        metallic=0.22,
        roughness=0.06,
        coat_weight=1.0,
        coat_roughness=0.02,
        thin_film_thickness=450.0,
        thin_film_ior=1.44,
    )

    # Canonical StarSeed RGB Top / RYB Bottom Prisms
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

    # Central Eye
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
        base_color=iris,
        metallic=0.25,
        roughness=0.04,
        ior=1.68,
        transmission=0.60,
        coat_weight=1.0,
        coat_roughness=0.01,
        thin_film_thickness=540.0,
        thin_film_ior=1.52,
        emission_color=iris,
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

    mats["crystal_a"] = make_material(
        "Mat_CrystalA",
        base_color=ca,
        metallic=0.04,
        roughness=0.04,
        ior=1.56,
        transmission=0.82,
        coat_weight=1.0,
        coat_roughness=0.02,
        thin_film_thickness=530.0,
        thin_film_ior=1.46,
        emission_color=(ca[0] * 0.7, ca[1] * 0.7, ca[2] * 0.7, 1.0),
        emission_strength=0.40,
    )
    mats["crystal_b"] = make_material(
        "Mat_CrystalB",
        base_color=cb,
        metallic=0.05,
        roughness=0.05,
        ior=1.56,
        transmission=0.76,
        coat_weight=1.0,
        coat_roughness=0.02,
        thin_film_thickness=590.0,
        thin_film_ior=1.48,
        emission_color=(cb[0] * 0.75, cb[1] * 0.75, cb[2] * 0.75, 1.0),
        emission_strength=0.48,
    )
    mats["neon_circuit"] = make_material(
        "Mat_CircuitLine",
        base_color=circ,
        metallic=0.3,
        roughness=0.10,
        emission_color=circ,
        emission_strength=1.20,
        thin_film_thickness=470.0,
    )
    return mats


# ---------------------------------------------------------------------------
# Geometry Primitives & BMesh Utilities
# ---------------------------------------------------------------------------
def ray_rounded_rect_point(hw, hh, r, ang):
    dx = math.cos(ang)
    dy = math.sin(ang)
    sx = hw - r
    sy = hh - r
    bx = hw / abs(dx) if abs(dx) > 1e-8 else 1e9
    by = hh / abs(dy) if abs(dy) > 1e-8 else 1e9
    t_box = min(bx, by)
    qx = dx * t_box
    qy = dy * t_box
    if abs(qx) <= sx or abs(qy) <= sy:
        return (qx, qy)
    cx = math.copysign(sx, dx)
    cy = math.copysign(sy, dy)
    b = -(dx * cx + dy * cy)
    c = cx * cx + cy * cy - r * r
    disc = max(0.0, b * b - c)
    t_arc = -b + math.sqrt(disc)
    return (dx * t_arc, dy * t_arc)


def rounded_rect_uniform(hw, hh, r, total_pts=64):
    return [
        ray_rounded_rect_point(hw, hh, r, math.pi * 0.25 + (2.0 * math.pi) * (i / total_pts))
        for i in range(total_pts)
    ]


def portal_window_uniform(rx, ry, total_pts=64):
    pts = []
    for i in range(total_pts):
        ang = math.pi * 0.25 + (2.0 * math.pi) * (i / total_pts)
        ca, sa = math.cos(ang), math.sin(ang)
        pts.append((math.copysign(abs(ca) ** 0.84, ca) * rx, math.copysign(abs(sa) ** 0.84, sa) * ry))
    return pts


def create_extruded_plate(name, pts_2d, z_min, z_max, mat, col):
    bm = bmesh.new()
    bottom_v = [bm.verts.new((x, y, z_min)) for x, y in pts_2d]
    top_v = [bm.verts.new((x, y, z_max)) for x, y in pts_2d]
    n = len(pts_2d)
    bm.faces.new(list(reversed(bottom_v)))
    bm.faces.new(top_v)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([bottom_v[i], bottom_v[j], top_v[j], top_v[i]])
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


def bm_add_torus(bm, cx, cy, cz, radius, minor_r, major_segs=44, minor_segs=8, tilt_x=0.0, tilt_y=0.0):
    rings = []
    rot = Matrix.Rotation(tilt_y, 3, "Y") @ Matrix.Rotation(tilt_x, 3, "X")
    c_vec = Vector((cx, cy, cz))
    for i in range(major_segs):
        th = 2.0 * math.pi * i / major_segs
        ct, st = math.cos(th), math.sin(th)
        ring = []
        for j in range(minor_segs):
            ph = 2.0 * math.pi * j / minor_segs
            r = radius + minor_r * math.cos(ph)
            p_local = Vector((r * ct, r * st, minor_r * math.sin(ph)))
            ring.append(bm.verts.new(c_vec + (rot @ p_local)))
        rings.append(ring)
    for i in range(major_segs):
        ni = (i + 1) % major_segs
        for j in range(minor_segs):
            nj = (j + 1) % minor_segs
            bm.faces.new([rings[i][j], rings[ni][j], rings[ni][nj], rings[i][nj]])


def bm_add_strut(bm, p1, p2, radius=0.0016, segs=6):
    v1 = Vector(p1)
    v2 = Vector(p2)
    diff = v2 - v1
    length = diff.length
    if length < 1e-6:
        return
    rot = diff.normalized().to_track_quat("Z", "Y").to_matrix()
    r1, r2 = [], []
    for i in range(segs):
        a = 2.0 * math.pi * i / segs
        off = rot @ Vector((radius * math.cos(a), radius * math.sin(a), 0.0))
        r1.append(bm.verts.new(v1 + off))
        r2.append(bm.verts.new(v2 + off))
    bm.faces.new(list(reversed(r1)))
    bm.faces.new(r2)
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new([r1[i], r1[j], r2[j], r2[i]])


def bm_add_sphere(bm, center, radius=0.006, u_segs=14, v_segs=8):
    mat = Matrix.Translation(Vector(center))
    bmesh.ops.create_uvsphere(bm, u_segments=u_segs, v_segments=v_segs, radius=radius, matrix=mat)


def create_torus_ring(name, center, radius, minor_r, mat, col, major_segs=56, minor_segs=8):
    bm = bmesh.new()
    bm_add_torus(bm, center[0], center[1], center[2], radius, minor_r, major_segs, minor_segs)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    set_smooth_with_edges(mesh)
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    link_obj(obj, col)
    return obj


def create_disc(name, center, radius, z_min, z_max, mat, col, segs=64, bevel_top=0.0018):
    bm = bmesh.new()
    cx, cy = center[0], center[1]
    b_ring, t_outer, t_inner = [], [], []
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

    ta_xy, tl_xy, tr_xy = shrink(p_apex, 0.72), shrink(p_left, 0.78), shrink(p_right, 0.78)
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
    segs, rx, ry = 48, 0.114, 0.044

    def almond_pts(scale_x, scale_y, power=1.35):
        pts = []
        for i in range(segs):
            ang = 2.0 * math.pi * i / segs
            ca, sa = math.cos(ang), math.sin(ang)
            pts.append((scale_x * ca, math.copysign(abs(sa) ** power, sa) * scale_y))
        return pts

    eyelid_obj = create_extruded_frame_ring(
        "EyeEyelidGold", almond_pts(rx * 1.07, ry * 1.14, 1.38), almond_pts(rx * 0.94, ry * 0.92, 1.32),
        0.008, 0.0155, mats["antique_gold"], col
    )
    add_weighted_normal_and_bevel(eyelid_obj, 0.0007, 1)

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
    iris_segs, r_out, r_in = 18, 0.039, 0.0285
    rings_lo = [bm_iris.verts.new((r_out * math.cos(2 * math.pi * k / iris_segs), r_out * math.sin(2 * math.pi * k / iris_segs), 0.0125)) for k in range(iris_segs)]
    rings_hi = [bm_iris.verts.new((r_in * math.cos(2 * math.pi * k / iris_segs), r_in * math.sin(2 * math.pi * k / iris_segs), 0.0168)) for k in range(iris_segs)]
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
    bmesh.ops.create_uvsphere(bm_pup, u_segments=28, v_segments=14, radius=0.0295)
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
    bmesh.ops.create_uvsphere(bm_cl, u_segments=16, v_segments=10, radius=0.0055)
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


def create_curve_tube(name, points_3d, radius_base, radius_tip, mat, col, bevel_res=3, tapers=True):
    curve_data = bpy.data.curves.new(name + "_Curve", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 8
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
    mesh = bpy.data.meshes.new_from_object(temp_obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
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
    segs, shoulder_h, r_tip = 6, length * 0.72, radius * 0.82
    base_ring, shoulder_ring = [], []
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
    rot = Vector(direction).normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation(Vector(base_pos)) @ rot, verts=bm.verts)
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
    txt_curve.resolution_u = 3
    txt_curve.extrude = extrude
    txt_curve.bevel_depth = extrude * 0.16
    txt_curve.bevel_resolution = 0
    txt_curve.space_character = 1.07

    txt_obj = bpy.data.objects.new(name + "_TmpTxt", txt_curve)
    link_obj(txt_obj, col)
    bpy.context.view_layer.update()
    mesh = bpy.data.meshes.new_from_object(txt_obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
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
# Unique 4D Sacred Geometry Builders per Design Motif
# ---------------------------------------------------------------------------
def build_unique_sacred_geometry(motif, mats, card_col):
    objs = []
    bm_sacred = bmesh.new()
    bm_orbit = bmesh.new()

    if motif == "mycelium_flower":
        r = 0.072
        centers = [(0.0, 0.0)]
        for k in range(6):
            a = k * math.pi / 3.0 + math.pi / 6.0
            centers.append((r * math.cos(a), r * math.sin(a)))
        for k in range(12):
            a = k * math.pi / 6.0
            d = r * (2.0 if k % 2 == 0 else math.sqrt(3.0))
            if abs(d * math.cos(a)) < 0.20 and abs(d * math.sin(a)) < 0.26:
                centers.append((d * math.cos(a), d * math.sin(a)))
        for cx, cy in centers:
            bm_add_torus(bm_sacred, cx, cy, -0.0020, r, 0.0014, 40, 6)
        bm_add_torus(bm_orbit, 0.0, 0.0, -0.0012, 0.228, 0.0018, 56, 8)
        bm_add_torus(bm_orbit, 0.0, 0.0, -0.0008, 0.238, 0.0012, 56, 8)

    elif motif == "seed_solar":
        # 7-petal Seed of Life + 12 golden solar rays
        r = 0.088
        bm_add_torus(bm_sacred, 0.0, 0.0, -0.0020, r, 0.0018, 48, 8)
        for k in range(6):
            a = k * math.pi / 3.0
            bm_add_torus(bm_sacred, r * math.cos(a), r * math.sin(a), -0.0018, r, 0.0015, 44, 6)
        for k in range(12):
            a = k * math.pi / 6.0
            p1 = (0.145 * math.cos(a), 0.145 * math.sin(a), -0.0012)
            p2 = (0.242 * math.cos(a), 0.242 * math.sin(a), 0.0005)
            bm_add_strut(bm_orbit, p1, p2, 0.0019 if k % 2 == 0 else 0.0012)
            if k % 2 == 0:
                bm_add_sphere(bm_orbit, p2, 0.0055, 10, 6)

    elif motif == "astrolabe_eye":
        # Concentric Optical Astrolabe rings & 24 ticks + inner cyan iris ring
        for rad, z, w in [(0.195, -0.0025, 0.0018), (0.215, -0.0015, 0.0014), (0.236, -0.0006, 0.0020)]:
            bm_add_torus(bm_sacred, 0.0, 0.0, z, rad, w, 56, 8)
        for k in range(24):
            a = k * math.pi / 12.0
            r_in = 0.195 if k % 3 == 0 else 0.205
            bm_add_strut(bm_orbit, (r_in * math.cos(a), r_in * math.sin(a), -0.001), (0.236 * math.cos(a), 0.236 * math.sin(a), -0.0005), 0.0014)
        bm_add_torus(bm_orbit, 0.0, 0.0, -0.0018, 0.172, 0.0014, 52, 8, tilt_x=0.14)

    elif motif == "hexagram_prisms":
        # Double Hexagram + 12 Spectral Rays
        for idx, rot_off in enumerate([0.0, math.pi / 6.0]):
            rad = 0.222 - idx * 0.024
            z = -0.0022 + idx * 0.0012
            target_bm = bm_sacred if idx == 0 else bm_orbit
            for tri in [0, 1]:
                base_a = rot_off + tri * (math.pi / 3.0)
                pts = [(rad * math.cos(base_a + k * 2 * math.pi / 3.0), rad * math.sin(base_a + k * 2 * math.pi / 3.0), z) for k in range(3)]
                for k in range(3):
                    bm_add_strut(target_bm, pts[k], pts[(k + 1) % 3], 0.0022)
        for k in range(6):
            a = k * math.pi / 3.0
            bm_add_strut(bm_orbit, (0.12 * math.cos(a), 0.12 * math.sin(a), -0.001), (0.235 * math.cos(a), 0.235 * math.sin(a), 0.0), 0.0015)

    elif motif == "ether_flower_3d":
        # Stepped 3-tier Z parallax Flower of Life + orbital node spheres
        r = 0.068
        bm_add_torus(bm_sacred, 0.0, 0.0, -0.0008, r, 0.0016, 44, 6)
        for k in range(6):
            a = k * math.pi / 3.0
            bm_add_torus(bm_sacred, r * math.cos(a), r * math.sin(a), -0.0020, r, 0.0015, 40, 6)
            bm_add_sphere(bm_orbit, (0.226 * math.cos(a), 0.226 * math.sin(a), -0.0005), 0.0052, 10, 6)
        for k in range(12):
            a = k * math.pi / 6.0
            d = r * 1.85
            if abs(d * math.cos(a)) < 0.20:
                bm_add_torus(bm_sacred, d * math.cos(a), d * math.sin(a), -0.0032, r * 0.92, 0.0012, 36, 6)
        bm_add_torus(bm_orbit, 0.0, 0.0, -0.0006, 0.226, 0.0016, 56, 8)

    elif motif == "metatron_cube":
        # 13 nodes of Fruit of Life + all connecting Metatron Cube lines
        r1 = 0.098
        r2 = 0.196
        nodes = [(0.0, 0.0, -0.0015)]
        for k in range(6):
            a = k * math.pi / 3.0 + math.pi / 6.0
            nodes.append((r1 * math.cos(a), r1 * math.sin(a), -0.0012))
            nodes.append((r2 * math.cos(a), r2 * math.sin(a), -0.0020))
        for n in nodes:
            bm_add_sphere(bm_sacred, n, 0.0058, 12, 8)
        for i in range(len(nodes)):
            for j in range(i + 1, len(nodes)):
                bm_add_strut(bm_sacred, nodes[i], nodes[j], 0.0011)
        bm_add_torus(bm_orbit, 0.0, 0.0, -0.0006, 0.232, 0.0020, 56, 8)

    elif motif == "quantum_roots":
        # Bioluminescent synaptic nodes along organic roots & sacred hexagonal lattice
        r = 0.085
        for k in range(6):
            a = k * math.pi / 3.0
            p_in = (r * math.cos(a), r * math.sin(a), -0.0020)
            p_out = (0.225 * math.cos(a), 0.225 * math.sin(a), -0.0008)
            bm_add_strut(bm_sacred, p_in, p_out, 0.0016)
            bm_add_sphere(bm_orbit, p_out, 0.0062, 12, 8)
            bm_add_sphere(bm_orbit, (0.165 * math.cos(a + 0.25), 0.165 * math.sin(a + 0.25), -0.0012), 0.0042, 10, 6)
        bm_add_torus(bm_sacred, 0.0, 0.0, -0.0022, 0.185, 0.0018, 52, 8)
        bm_add_torus(bm_orbit, 0.0, 0.0, -0.0010, 0.225, 0.0014, 52, 8)

    elif motif == "amethyst_geode":
        # Hexagonal crystal lattice + 12 inward chamber crystal needles
        for k in range(6):
            a = k * math.pi / 3.0
            a_next = (k + 1) * math.pi / 3.0
            p1 = (0.215 * math.cos(a), 0.215 * math.sin(a), -0.0015)
            p2 = (0.215 * math.cos(a_next), 0.215 * math.sin(a_next), -0.0015)
            bm_add_strut(bm_sacred, p1, p2, 0.0022)
        for k in range(12):
            a = k * math.pi / 6.0
            p1 = (0.242 * math.cos(a), 0.242 * math.sin(a), -0.0025)
            p2 = (0.185 * math.cos(a), 0.185 * math.sin(a), 0.0010)
            bm_add_strut(bm_orbit, p1, p2, 0.0032)
        bm_add_torus(bm_sacred, 0.0, 0.0, -0.0020, 0.188, 0.0016, 48, 8)

    elif motif == "toroid_mesh":
        # 3D Vortex Torus rings tilted + P2P neural constellation nodes
        for k in range(12):
            a = k * math.pi / 6.0
            cx = 0.075 * math.cos(a)
            cy = 0.075 * math.sin(a)
            bm_add_torus(bm_sacred, cx, cy, -0.0018, 0.115, 0.0012, 40, 6)
        mesh_pts = [(0.228 * math.cos(k * math.pi / 7.0), 0.228 * math.sin(k * math.pi / 7.0), -0.0006) for k in range(14)]
        for i, p in enumerate(mesh_pts):
            bm_add_sphere(bm_orbit, p, 0.0052, 10, 6)
            bm_add_strut(bm_orbit, p, mesh_pts[(i + 3) % 14], 0.0011)
        bm_add_torus(bm_orbit, 0.0, 0.0, -0.0010, 0.228, 0.0015, 56, 8)

    elif motif == "cymatic_spiral":
        # Chladni cymatic wavy rings + golden harmonic nodes
        for idx, rad in enumerate([0.155, 0.188, 0.222]):
            pts_wave = []
            n_w = 56
            lobe = 6 + idx * 2
            for i in range(n_w):
                th = 2.0 * math.pi * i / n_w
                rr = rad + 0.008 * math.sin(lobe * th)
                pts_wave.append((rr * math.cos(th), rr * math.sin(th), -0.0022 + idx * 0.0007))
            for i in range(n_w):
                bm_add_strut(bm_sacred if idx < 2 else bm_orbit, pts_wave[i], pts_wave[(i + 1) % n_w], 0.0015)
        for k in range(8):
            a = k * math.pi / 4.0
            bm_add_sphere(bm_orbit, (0.224 * math.cos(a), 0.224 * math.sin(a), -0.0005), 0.0054, 10, 6)

    elif motif == "neuron_crown":
        # 12 ceremonial orbital pillars & arches inspired by Pioneros human-chain medallion
        n_nodes = 12
        rad = 0.224
        bm_add_torus(bm_sacred, 0.0, 0.0, -0.0018, 0.195, 0.0018, 56, 8)
        bm_add_torus(bm_sacred, 0.0, 0.0, -0.0014, 0.236, 0.0018, 56, 8)
        for k in range(n_nodes):
            a = k * 2.0 * math.pi / n_nodes
            an = (k + 1) * 2.0 * math.pi / n_nodes
            p_head = (rad * math.cos(a), rad * math.sin(a), -0.0005)
            p_next = (rad * math.cos(an), rad * math.sin(an), -0.0005)
            bm_add_sphere(bm_orbit, p_head, 0.0068, 12, 8)
            bm_add_strut(bm_orbit, p_head, p_next, 0.0018)
            bm_add_strut(bm_sacred, (0.178 * math.cos(a), 0.178 * math.sin(a), -0.0018), p_head, 0.0022)

    elif motif == "merkaba_omega":
        # Dual 3D rotated Merkaba star tetrahedron + 12-star Zodiacal ring + Omega rays
        for idx, ang_off in enumerate([0.0, math.pi / 3.0]):
            rad = 0.232
            z_front = -0.0002 if idx == 0 else -0.0028
            verts = [(rad * math.cos(ang_off + k * 2 * math.pi / 3.0), rad * math.sin(ang_off + k * 2 * math.pi / 3.0), z_front) for k in range(3)]
            center = (0.0, 0.0, z_front - 0.0025 if idx == 0 else z_front + 0.0025)
            for k in range(3):
                bm_add_strut(bm_sacred, verts[k], verts[(k + 1) % 3], 0.0024)
                bm_add_strut(bm_sacred, verts[k], center, 0.0016)
        for k in range(12):
            a = k * math.pi / 6.0
            bm_add_sphere(bm_orbit, (0.236 * math.cos(a), 0.236 * math.sin(a), -0.0005), 0.0056, 10, 6)
        bm_add_torus(bm_orbit, 0.0, 0.0, -0.0010, 0.236, 0.0018, 60, 8)

    bmesh.ops.recalc_face_normals(bm_sacred, faces=bm_sacred.faces)
    m_sacred = bpy.data.meshes.new("SacredGeometry4D_Mesh")
    bm_sacred.to_mesh(m_sacred)
    bm_sacred.free()
    set_smooth_with_edges(m_sacred)
    obj_sacred = bpy.data.objects.new("SacredGeometry4D", m_sacred)
    obj_sacred.data.materials.append(mats["sacred_glow"])
    link_obj(obj_sacred, card_col)
    objs.append(obj_sacred)

    bmesh.ops.recalc_face_normals(bm_orbit, faces=bm_orbit.faces)
    m_orbit = bpy.data.meshes.new("OuterOrbit4D_Mesh")
    bm_orbit.to_mesh(m_orbit)
    bm_orbit.free()
    set_smooth_with_edges(m_orbit)
    obj_orbit = bpy.data.objects.new("OuterOrbit4D", m_orbit)
    obj_orbit.data.materials.append(mats["orbit_glow"])
    link_obj(obj_orbit, card_col)
    objs.append(obj_orbit)
    return objs


def build_card_from_spec(spec):
    clear_scene()
    card_col = get_or_create_collection(f"StarSeedCard_{spec['slug']}")
    mats = create_materials_for_spec(spec)
    export_objs = []

    hw, hh, cr, n_pts = 0.315, 0.440, 0.044, 56
    outer_contour = rounded_rect_uniform(hw, hh, cr, n_pts)

    # 1. Iridescent Outer Rim
    rim_outer = rounded_rect_uniform(hw + 0.009, hh + 0.009, cr + 0.007, n_pts)
    rim_inner = rounded_rect_uniform(hw - 0.010, hh - 0.010, cr - 0.006, n_pts)
    rim = create_extruded_frame_ring("IridescentRim", rim_outer, rim_inner, -0.0145, 0.0125, mats["iridescent_rim"], card_col)
    add_weighted_normal_and_bevel(rim, 0.0013, 1)
    export_objs.append(rim)

    # 2. Slab Backing & Window Frame
    slab_back = create_extruded_plate("CardSlab_Back", outer_contour, -0.0135, -0.0065, mats["obsidian_slab"], card_col)
    add_weighted_normal_and_bevel(slab_back, 0.0009, 1)
    export_objs.append(slab_back)

    portal_inner = portal_window_uniform(0.256, 0.334, n_pts)
    slab_frame = create_extruded_frame_ring("CardSlab_Frame", outer_contour, portal_inner, -0.0065, 0.0088, mats["obsidian_slab"], card_col)
    add_weighted_normal_and_bevel(slab_frame, 0.0013, 1)
    export_objs.append(slab_frame)

    portal_trim = create_extruded_frame_ring(
        "CardSlab_PortalTrim", portal_window_uniform(0.264, 0.342, n_pts), portal_window_uniform(0.253, 0.331, n_pts),
        0.0065, 0.0106, mats["antique_gold"], card_col
    )
    add_weighted_normal_and_bevel(portal_trim, 0.0006, 1)
    export_objs.append(portal_trim)

    # 3. Inner 4D Chamber Backplate
    chamber = create_extruded_plate("InnerChamber4D", portal_window_uniform(0.258, 0.336, n_pts), -0.0068, -0.0050, mats["chamber_4d"], card_col)
    export_objs.append(chamber)

    # 4. Unique Sacred Geometry 4D Layers
    export_objs.extend(build_unique_sacred_geometry(spec["motif"], mats, card_col))

    # 5. Canonical StarSeed Vesica Piscis Discs (Light Top / Matter Bottom)
    v_offset, v_radius = 0.094, 0.165
    export_objs.append(create_disc("VesicaLowerObsidian", (0.0, -v_offset), v_radius, 0.0005, 0.0058, mats["vesica_obsidian"], card_col, 64))
    export_objs.append(create_disc("VesicaUpperSilver", (0.0, +v_offset), v_radius, 0.0015, 0.0070, mats["vesica_silver"], card_col, 64))
    export_objs.append(create_torus_ring("VesicaBezelGold_Top", (0.0, +v_offset, 0.0074), v_radius + 0.0015, 0.0036, mats["antique_gold"], card_col, 64, 8))
    export_objs.append(create_torus_ring("VesicaBezelGold_Bot", (0.0, -v_offset, 0.0062), v_radius + 0.0015, 0.0036, mats["antique_gold"], card_col, 64, 8))
    export_objs.append(create_torus_ring("VesicaMatterCircuitRing", (0.0, -v_offset, 0.0060), v_radius * 0.86, 0.0012, mats["neon_circuit"], card_col, 60, 8))
    export_objs.append(create_torus_ring("VesicaLightInnerRing", (0.0, +v_offset, 0.0072), v_radius * 0.86, 0.0010, mats["antique_gold"], card_col, 60, 8))

    # 6. Central Eye
    eye_col = get_or_create_collection("CentralEye", card_col)
    create_almond_vesica_eye(eye_col, mats)
    export_objs.extend(list(eye_col.objects))

    # 7. Canonical Upper Trinity (RGB: Red-Green-Blue) & Lower Trinity (RYB: Red-Yellow-Blue)
    y_tb, y_ta, x_h, x_m = 0.058, 0.198, 0.104, 0.035
    export_objs.append(create_faceted_prism_triangle("UpperTrinity_Red", (0.0, y_ta), (-x_h, y_tb), (-x_m, y_tb), 0.0072, 0.0086, mats["prism_red"], card_col, False))
    export_objs.append(create_faceted_prism_triangle("UpperTrinity_Green", (0.0, y_ta), (-x_m, y_tb), (+x_m, y_tb), 0.0074, 0.0104, mats["prism_green"], card_col, True))
    export_objs.append(create_faceted_prism_triangle("UpperTrinity_Blue", (0.0, y_ta), (+x_m, y_tb), (+x_h, y_tb), 0.0072, 0.0086, mats["prism_blue"], card_col, False))

    y_bb, y_ba = -0.058, -0.198
    export_objs.append(create_faceted_prism_triangle("LowerTrinity_Red", (0.0, y_ba), (-x_h, y_bb), (-x_m, y_bb), 0.0062, 0.0086, mats["prism_red"], card_col, False))
    export_objs.append(create_faceted_prism_triangle("LowerTrinity_Yellow", (0.0, y_ba), (-x_m, y_bb), (+x_m, y_bb), 0.0064, 0.0104, mats["prism_yellow"], card_col, True))
    export_objs.append(create_faceted_prism_triangle("LowerTrinity_Blue", (0.0, y_ba), (+x_m, y_bb), (+x_h, y_bb), 0.0062, 0.0086, mats["prism_blue"], card_col, False))

    # 8. Sculpted 3D Organic Mycelium & Side Filigree (varied slightly by motif!)
    myc_col = get_or_create_collection("MyceliumWeave", card_col)
    lem_pts = []
    n_lem = 36
    lem_amp = 0.044 if spec["motif"] != "quantum_roots" else 0.062
    for i in range(n_lem):
        t = 2.0 * math.pi * i / n_lem
        lem_pts.append((0.202 * math.sin(t), -0.258 + lem_amp * math.sin(t) * math.cos(t), 0.0085 + 0.003 * math.sin(2.0 * t + 0.5)))
    lem_pts.append(lem_pts[0])
    create_curve_tube("Mycelium_InfinityBase", lem_pts, 0.0038, 0.0034, mats["antique_gold"], myc_col, 3, tapers=False)

    tendril_paths = [
        [(0.0, -0.275, 0.009), (-0.08, -0.305, 0.011), (-0.17, -0.295, 0.011), (-0.23, -0.235, 0.010), (-0.255, -0.145, 0.009)],
        [(-0.17, -0.295, 0.010), (-0.21, -0.345, 0.011), (-0.265, -0.375, 0.010)],
        [(-0.228, -0.135, 0.009), (-0.252, -0.040, 0.011), (-0.252, +0.065, 0.011), (-0.228, +0.165, 0.010), (-0.185, +0.245, 0.009)],
        [(0.0, +0.272, 0.009), (-0.085, +0.298, 0.011), (-0.175, +0.290, 0.011), (-0.240, +0.340, 0.010), (-0.270, +0.382, 0.010)],
    ]
    for idx, bp in enumerate(tendril_paths):
        create_curve_tube(f"Mycelium_L_{idx}", bp, 0.0038, 0.0014, mats["antique_gold"], myc_col, 3, tapers=True)
        create_curve_tube(f"Mycelium_R_{idx}", [(-x, y, z) for (x, y, z) in bp], 0.0038, 0.0014, mats["antique_gold"], myc_col, 3, tapers=True)
    export_objs.extend(list(myc_col.objects))

    # 9. Corner Crystals
    crys_col = get_or_create_collection("CornerCrystals", card_col)
    scale_c = 1.15 if spec["motif"] == "amethyst_geode" else 1.0
    for sx, sy, tag in [(-1, +1, "TL"), (+1, +1, "TR"), (-1, -1, "BL"), (+1, -1, "BR")]:
        create_hex_crystal(f"Crystal_A_{tag}", (sx * 0.284, sy * 0.394, 0.006), (-sx * 0.62, -sy * 0.65, 0.44), 0.095 * scale_c, 0.019 * scale_c, mats["crystal_a"], crys_col)
        create_hex_crystal(f"Crystal_B_{tag}", (sx * 0.252, sy * 0.402, 0.007), (-sx * 0.44, -sy * 0.78, 0.44), 0.074 * scale_c, 0.015 * scale_c, mats["crystal_b"], crys_col)
        create_hex_crystal(f"Crystal_Side_{tag}", (sx * 0.292, sy * 0.348, 0.006), (-sx * 0.80, -sy * 0.42, 0.43), 0.064 * scale_c, 0.013 * scale_c, mats["crystal_a"], crys_col)
        create_torus_ring(f"Crystal_Setting_{tag}", (sx * 0.278, sy * 0.388, 0.009), 0.024, 0.0032, mats["antique_gold"], crys_col, 24, 6)
    export_objs.extend(list(crys_col.objects))

    # 10. Front Cartouche Plates & Typography
    badge_col = get_or_create_collection("FrontBadgePlates", card_col)
    top_pts = [(x, y + 0.382) for (x, y) in rounded_rect_uniform(0.188, 0.025, 0.011, 36)]
    bot_pts = [(x, y - 0.376) for (x, y) in rounded_rect_uniform(0.218, 0.032, 0.013, 36)]
    export_objs.append(create_extruded_plate("TopCartouche", top_pts, 0.0085, 0.0124, mats["obsidian_slab"], badge_col))
    export_objs.append(create_extruded_plate("BottomCartouche", bot_pts, 0.0085, 0.0124, mats["obsidian_slab"], badge_col))
    export_objs.append(create_extruded_frame_ring(
        "TopCartoucheBezel",
        [(x, y + 0.382) for (x, y) in rounded_rect_uniform(0.193, 0.029, 0.013, 36)],
        [(x, y + 0.382) for (x, y) in rounded_rect_uniform(0.185, 0.023, 0.010, 36)],
        0.0085, 0.0130, mats["antique_gold"], badge_col
    ))
    export_objs.append(create_extruded_frame_ring(
        "BottomCartoucheBezel",
        [(x, y - 0.376) for (x, y) in rounded_rect_uniform(0.223, 0.036, 0.015, 36)],
        [(x, y - 0.376) for (x, y) in rounded_rect_uniform(0.215, 0.030, 0.012, 36)],
        0.0085, 0.0130, mats["antique_gold"], badge_col
    ))

    num_str = f"{spec['num']:03d}"
    title_scale = 0.0172 if len(spec["title"]) >= 20 else 0.0186
    export_objs.append(create_3d_text("Text_Header", "STARSEED OS · PIONEROS", (0.0, 0.382, 0.0132), 0.020, 0.0009, mats["text_gold"], badge_col))
    export_objs.append(create_3d_text("Text_Title", spec["title"], (0.0, -0.365, 0.0132), title_scale, 0.0009, mats["text_silver"], badge_col))
    export_objs.append(create_3d_text("Text_Serial", f"SERIE #{num_str} / 012 · FUNDACIONAL", (0.0, -0.391, 0.0132), 0.0122, 0.0007, mats["text_gold"], badge_col))

    # 11. Reverse Seal
    back_col = get_or_create_collection("BackSeal", card_col)
    export_objs.append(create_torus_ring("Back_OuterRing", (0.0, 0.030, -0.0144), 0.195, 0.0040, mats["antique_gold"], back_col, 60, 8))
    export_objs.append(create_torus_ring("Back_InnerRing", (0.0, 0.030, -0.0142), 0.165, 0.0022, mats["iridescent_rim"], back_col, 56, 8))
    export_objs.append(create_torus_ring("Back_VesicaTop", (0.0, 0.082, -0.0146), 0.095, 0.0028, mats["vesica_silver"], back_col, 48, 8))
    export_objs.append(create_torus_ring("Back_VesicaBot", (0.0, -0.022, -0.0146), 0.095, 0.0028, mats["antique_gold"], back_col, 48, 8))
    export_objs.append(create_torus_ring("Back_EyeSeal", (0.0, 0.030, -0.0148), 0.032, 0.0022, mats["neon_circuit"], back_col, 36, 6))

    export_objs.append(create_3d_text("Back_TextBrand", "STARSEED OS", (0.0, 0.305, -0.0146), 0.028, 0.0010, mats["text_gold"], back_col, rot_euler=(0.0, math.pi, 0.0)))
    export_objs.append(create_3d_text("Back_TextEdition", f"EDICIÓN PIONEROS · {num_str} / 012", (0.0, -0.225, -0.0146), 0.0175, 0.0009, mats["text_silver"], back_col, rot_euler=(0.0, math.pi, 0.0)))
    export_objs.append(create_3d_text("Back_TextSlogan", f"{spec['title']} · 4D", (0.0, -0.268, -0.0146), 0.0128, 0.0007, mats["text_gold"], back_col, rot_euler=(0.0, math.pi, 0.0)))

    return export_objs


# ---------------------------------------------------------------------------
# Studio World, Lighting, Camera, GLB & Render
# ---------------------------------------------------------------------------
def setup_spectral_studio_world(spec):
    world = bpy.data.worlds.new("StarSeedStudioWorld")
    bpy.context.scene.world = world
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    mix_shader = nt.nodes.new("ShaderNodeMixShader")
    lp = nt.nodes.new("ShaderNodeLightPath")

    bg_refl = nt.nodes.new("ShaderNodeBackground")
    bg_refl.inputs["Strength"].default_value = 2.25
    tc = nt.nodes.new("ShaderNodeTexCoord")
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"
    wave.bands_direction = "DIAGONAL"
    wave.inputs["Scale"].default_value = 0.72
    wave.inputs["Distortion"].default_value = 0.85

    ca = spec["crystal_a"]
    cb = spec["crystal_b"]
    gold = spec["gold_color"]
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "B_SPLINE"
    elts = ramp.color_ramp.elements
    elts[0].position = 0.0
    elts[0].color = (0.02, 0.03, 0.09, 1.0)
    e1 = elts.new(0.26)
    e1.color = (ca[0] * 0.45, ca[1] * 0.58, ca[2] * 0.85, 1.0)
    e2 = elts.new(0.52)
    e2.color = (cb[0] * 0.65, cb[1] * 0.35, cb[2] * 0.82, 1.0)
    e3 = elts.new(0.76)
    e3.color = (gold[0] * 0.85, gold[1] * 0.68, gold[2] * 0.45, 1.0)
    elts[-1].position = 1.0
    elts[-1].color = (0.04, 0.22, 0.38, 1.0)

    bg_cam = nt.nodes.new("ShaderNodeBackground")
    bg_cam.inputs["Color"].default_value = (0.009, 0.013, 0.032, 1.0)
    bg_cam.inputs["Strength"].default_value = 1.0

    nt.links.new(tc.outputs["Generated"], wave.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg_refl.inputs["Color"])
    nt.links.new(lp.outputs["Is Camera Ray"], mix_shader.inputs["Fac"])
    nt.links.new(bg_refl.outputs["Background"], mix_shader.inputs[1])
    nt.links.new(bg_cam.outputs["Background"], mix_shader.inputs[2])
    nt.links.new(mix_shader.outputs["Shader"], out.inputs["Surface"])


def point_at(obj, loc, target):
    loc_v, tgt_v = Vector(loc), Vector(target)
    forward = (tgt_v - loc_v).normalized()
    up_ref = Vector((0.0, 1.0, 0.0))
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


def setup_studio_and_cycles(spec, samples=28, width=720, height=960):
    studio_col = get_or_create_collection("StudioRig")
    setup_spectral_studio_world(spec)

    def add_area(name, loc, tgt, energy, size, color):
        ld = bpy.data.lights.new(name=name, type="AREA")
        ld.energy, ld.size, ld.color = energy, size, color
        lo = bpy.data.objects.new(name=name, object_data=ld)
        point_at(lo, loc, tgt)
        link_obj(lo, studio_col)

    add_area("Key", (-1.10, 1.25, 1.90), (0, 0, 0), 46.0, 1.2, (1.0, 0.94, 0.84))
    add_area("Rim", (1.35, 0.55, 1.05), (0, 0, 0), 38.0, 1.15, (0.45, 0.88, 1.0))
    add_area("Catch", (0.72, 0.88, 2.25), (0, 0, 0.01), 24.0, 0.65, (1.0, 1.0, 1.0))
    add_area("Under", (0.12, -1.45, 1.15), (0, -0.1, 0), 22.0, 1.25, (0.94, 0.42, 0.90))

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.03
    scene.cycles.use_denoising = True
    try:
        scene.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    scene.cycles.max_bounces = 6
    scene.cycles.glossy_bounces = 3
    scene.cycles.transmission_bounces = 4
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    try:
        scene.view_settings.view_transform = "AgX"
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    scene.view_settings.exposure = 0.05

    cam_data = bpy.data.cameras.new("HeroCam")
    cam_data.lens = 52.0
    cam_obj = bpy.data.objects.new("HeroCamObj", cam_data)
    point_at(cam_obj, spec["cam_loc"], (0.0, 0.0, 0.0))
    link_obj(cam_obj, studio_col)
    scene.camera = cam_obj


def export_and_render_spec(spec):
    t_start = time.time()
    export_objs = build_card_from_spec(spec)
    setup_studio_and_cycles(spec, samples=28, width=720, height=960)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in export_objs:
        if obj.name in bpy.data.objects:
            obj.select_set(True)
    if export_objs:
        bpy.context.view_layer.objects.active = export_objs[0]

    glb_path = os.path.join(CARDS_OUT_DIR, f"{spec['slug']}.glb")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
        export_draco_mesh_compression_enable=False,
    )
    glb_mb = os.path.getsize(glb_path) / (1024.0 * 1024.0)

    png_name = f"pioneros_{spec['num']:02d}.png"
    png_path = os.path.join(RENDERS_DIR, png_name)
    bpy.context.scene.render.filepath = png_path
    bpy.ops.render.render(write_still=True)

    print(
        f"CARD_{spec['num']:02d}_DONE: glb={glb_mb:.2f}MB png={png_name} time={time.time() - t_start:.1f}s",
        flush=True,
    )


def parse_only_indices():
    if "--only" not in sys.argv:
        return None
    idx = sys.argv.index("--only")
    if idx + 1 >= len(sys.argv):
        return None
    return {int(x.strip()) for x in sys.argv[idx + 1].split(",") if x.strip()}


def main():
    only = parse_only_indices()
    t_all = time.time()
    for spec in PIONEROS_SPECS:
        if only is not None and spec["num"] not in only:
            continue
        export_and_render_spec(spec)
    print(f"ALL_12_PIONEROS_COMPLETE in {time.time() - t_all:.1f}s", flush=True)


if __name__ == "__main__":
    main()
