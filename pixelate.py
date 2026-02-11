import sys
from PIL import Image

def pixelate(input_path, output_path, pixel_size):
    try:
        img = Image.open(input_path).convert("RGBA")
        # Get original size
        width, height = img.size
        # Resize down
        small = img.resize((width // pixel_size, height // pixel_size), resample=Image.NEAREST)
        # Resize back up
        result = small.resize(img.size, Image.NEAREST)
        # Save
        result.save(output_path)
        print(f"Successfully pixelated {input_path} and saved to {output_path}")
    except Exception as e:
        print(f"Error pixelating image: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 pixelate.py <input_path> <output_path> <pixel_size>")
        sys.exit(1)
    pixelate(sys.argv[1], sys.argv[2], int(sys.argv[3]))
