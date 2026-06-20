import sys
sys.path.insert(0, r"C:\Users\RPC\rcm-saas-platform\backend")
from app.services.fse_parser import load_images, ocr_image

img_path = r"C:\Users\RPC\Downloads\Gemini_Generated_Image_is1k3fis1k3fis1k.png"
p1, p2 = load_images(img_path)
text = ocr_image(p2)

print("=== FULL PAGE 2 OCR OUTPUT ===")
for i, line in enumerate(text.splitlines()):
    print(f"{i:3}: {repr(line)}")