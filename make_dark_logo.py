from PIL import Image
import numpy as np

def make_dark_logo(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img, dtype=np.float32)
    
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    
    # Identify dark pixels (close to black) that are opaque
    # Black text: low R, G, B with high alpha
    is_dark = (r < 60) & (g < 60) & (b < 60) & (a > 50)
    
    # Turn those pixels white
    data[:,:,0][is_dark] = 255
    data[:,:,1][is_dark] = 255
    data[:,:,2][is_dark] = 255
    
    result = Image.fromarray(np.uint8(data), "RGBA")
    result.save(output_path)
    print(f"Dark mode logo saved to {output_path}")

# Use the good light logo as the base
make_dark_logo(
    "/home/neo/Project/kina_ai/frontend/public/logo_navbar-light.png",
    "/home/neo/Project/kina_ai/frontend/public/logo_navbar-dark.png"
)
