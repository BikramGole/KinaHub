import vtracer

vtracer.convert_image_to_svg_py(
    "/home/neo/Project/kina_ai/frontend/public/kinu-mascot-transparent.png",
    "/home/neo/Project/kina_ai/frontend/public/kinu-mascot-transparent.svg",
    colormode='color',
    hierarchical='stacked',
    mode='spline',
    filter_speckle=4,
    color_precision=6,
    layer_difference=16,
    corner_threshold=60,
    length_threshold=4.0,
    max_iterations=10,
    splice_threshold=45,
    path_precision=8
)
