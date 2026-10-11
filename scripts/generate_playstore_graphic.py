"""
Play Store Graphic Generator for Snagbite Cookbook
Overlays screenshots or micro previews behind the 3D Emerald frame mockup with custom German/English typography.
"""

import os
import argparse
from PIL import Image, ImageDraw, ImageFont

FRAME_PATH_DEFAULT = os.path.join(
    os.path.dirname(__file__), "..", "images", "playstore", "playstore_emerald_frame_clean_1080x1920.png"
)

# Coordinates for 1080 x 1920 frame
SCREEN_X = 326
SCREEN_Y = 645
SCREEN_W = 428
SCREEN_H = 935

def compose_graphic(
    screenshot_path: str,
    output_path: str,
    eyebrow: str = "SNAGBITE APP",
    title: str = "Aus Reels wird dein Kochbuch",
    subtitle: str = "Rezepte mit 1 Klick aus Instagram & TikTok extrahieren",
    frame_path: str = FRAME_PATH_DEFAULT,
):
    if not os.path.exists(frame_path):
        raise FileNotFoundError(f"Frame overlay not found: {frame_path}")
    if not os.path.exists(screenshot_path):
        raise FileNotFoundError(f"Screenshot not found: {screenshot_path}")

    frame = Image.open(frame_path).convert("RGBA")
    screenshot = Image.open(screenshot_path).convert("RGBA")

    # Scale screenshot to fit the phone screen cutout area
    src_w, src_h = screenshot.size
    scaled_w = SCREEN_W
    scaled_h = int(scaled_w * (src_h / src_w))
    screenshot_resized = screenshot.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)

    # 1. Base dark background canvas (1080 x 1920)
    canvas = Image.new("RGBA", (1080, 1920), (14, 28, 25, 255))

    # 2. Paste screenshot behind frame
    canvas.paste(screenshot_resized, (SCREEN_X, SCREEN_Y))

    # 3. Alpha composite transparent frame on top (so phone bezel & 3D food float above it)
    canvas.alpha_composite(frame)

    # 4. Render typography
    draw = ImageDraw.Draw(canvas)
    font_title = None
    font_sub = None
    font_eyebrow = None

    font_paths = [
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            font_title = ImageFont.truetype(fp, 56)
            font_sub = ImageFont.truetype(
                r"C:\Windows\Fonts\segoeui.ttf" if "segoe" in fp else r"C:\Windows\Fonts\arial.ttf", 32
            )
            font_eyebrow = ImageFont.truetype(fp, 26)
            break

    if font_title:
        if eyebrow:
            draw.text((540, 150), eyebrow, fill=(52, 211, 153), font=font_eyebrow, anchor="mm")
        if title:
            draw.text((540, 235), title, fill=(255, 255, 255), font=font_title, anchor="mm")
        if subtitle:
            draw.text((540, 310), subtitle, fill=(209, 230, 222), font=font_sub, anchor="mm")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    canvas.save(output_path, optimize=True)
    print(f"Created Play Store graphic: {output_path}")

def main():
    parser = argparse.ArgumentParser(description="Generate Play Store Screenshot graphic")
    parser.add_argument("--screenshot", required=True, help="Path to input screenshot image")
    parser.add_argument("--output", required=True, help="Path to output image")
    parser.add_argument("--title", default="Aus Reels wird dein Kochbuch", help="Main title")
    parser.add_argument("--subtitle", default="Rezepte mit 1 Klick aus Instagram & TikTok extrahieren", help="Subtitle")
    parser.add_argument("--eyebrow", default="SNAGBITE APP", help="Top badge/eyebrow text")
    parser.add_argument("--frame", default=FRAME_PATH_DEFAULT, help="Frame overlay PNG path")
    args = parser.parse_args()

    compose_graphic(
        screenshot_path=args.screenshot,
        output_path=args.output,
        eyebrow=args.eyebrow,
        title=args.title,
        subtitle=args.subtitle,
        frame_path=args.frame,
    )

if __name__ == "__main__":
    main()
