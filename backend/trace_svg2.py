import vtracer
import traceback

try:
    print("Starting conversion...")
    vtracer.convert_image_to_svg_py(
        "/home/neo/Project/kina_ai/frontend/public/kinu-mascot-transparent.png",
        "/home/neo/Project/kina_ai/frontend/public/kinu-mascot-transparent.svg"
    )
    print("Conversion complete!")
except Exception as e:
    print("Error during conversion:")
    traceback.print_exc()
