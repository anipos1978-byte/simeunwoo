import sys
from PIL import Image

def flip_image(input_path, output_path):
    try:
        img = Image.open(input_path)
        flipped = img.transpose(Image.FLIP_LEFT_RIGHT)
        flipped.save(output_path)
        print(f"Successfully flipped {input_path} and saved to {output_path}")
    except Exception as e:
        print(f"Error flipping image: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 flip.py <input_path> <output_path>")
        sys.exit(1)
    flip_image(sys.argv[1], sys.argv[2])
