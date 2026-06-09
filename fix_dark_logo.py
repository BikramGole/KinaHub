from PIL import Image, ImageChops
from rembg import remove

def trim(im):
    bg = Image.new(im.mode, im.size, im.getpixel((0,0)))
    diff = ImageChops.difference(im, bg)
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        return im.crop(bbox)
    return im

input_path = '/home/neo/Project/kina_ai/frontend/public/logo_navbar-dark.png'
output_path = '/home/neo/Project/kina_ai/frontend/public/logo_navbar-dark.png'

# Open original image
original = Image.open(input_path)

# Remove background
transparent = remove(original)

# Try to crop any remaining whitespace
cropped = trim(transparent)

# Save the final image
cropped.save(output_path)
print("Background removed and cropped!")
