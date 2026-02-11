import sys
import os
try:
    from rembg import remove
    from PIL import Image
except ImportError:
    print("Dependencies 'rembg' or 'Pillow' not found. Please install them using: pip install rembg pillow")
    sys.exit(1)

def main(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Error: Input file {input_path} not found.")
        return

    print(f"Processing {input_path}...")
    try:
        input_image = Image.open(input_path)
        output_image = remove(input_image)
        output_image.save(output_path)
        print(f"Success! Saved to {output_path}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 remove_bg.py <input_path> <output_path>")
    else:
        main(sys.argv[1], sys.argv[2])
