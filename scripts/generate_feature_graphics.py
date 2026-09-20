import os
import shutil
from PIL import Image, ImageDraw, ImageFont

# Ensure target directories
de_dir = 'frontend/android/fastlane/metadata/android/de-DE/images'
en_dir = 'frontend/android/fastlane/metadata/android/en-US/images'
os.makedirs(de_dir, exist_ok=True)
os.makedirs(en_dir, exist_ok=True)

# 1. Copy icon (512x512)
icon_src = 'frontend/public/icon-512.png'
shutil.copy(icon_src, os.path.join(de_dir, 'icon.png'))
shutil.copy(icon_src, os.path.join(en_dir, 'icon.png'))
print('[OK] Copied icon.png (512x512) to de-DE and en-US')

# 2. Generate Feature Graphic (1024x500)
W, H = 1024, 500

def create_gradient_bg():
    # Subtle radial / directional gradient from dark emerald to rich green
    bg = Image.new('RGBA', (W, H))
    c1 = (6, 78, 59)    # #064e3b deep emerald
    c2 = (16, 185, 129) # #10b981 vibrant emerald
    c3 = (4, 120, 87)   # #047857 mid emerald
    
    draw = ImageDraw.Draw(bg)
    for x in range(W):
        # Horizontal subtle gradient
        t = x / W
        r = int(c1[0] * (1 - t) + c3[0] * t)
        g = int(c1[1] * (1 - t) + c3[1] * t)
        b = int(c1[2] * (1 - t) + c3[2] * t)
        draw.line([(x, 0), (x, H)], fill=(r, g, b, 255))
    
    # Ambient glow in center-left
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for radius in range(260, 0, -5):
        alpha = int((1 - radius / 260) * 45)
        glow_draw.ellipse([300 - radius, H//2 - radius, 300 + radius, H//2 + radius], fill=(52, 211, 153, alpha))
    
    return Image.alpha_composite(bg, glow)

def get_font(size, bold=False):
    font_paths = [
        'C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf',
        'C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf',
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def generate_banner(lang, subtitle_text, output_path):
    canvas = create_gradient_bg()
    
    # Load and place app icon
    icon = Image.open(icon_src).convert('RGBA')
    icon_size = 240
    icon = icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    
    # Position: Left-aligned icon + Right-aligned text block
    icon_x = 110
    icon_y = (H - icon_size) // 2
    canvas.paste(icon, (icon_x, icon_y), icon)
    
    draw = ImageDraw.Draw(canvas)
    
    # Typography
    font_title = get_font(72, bold=True)
    font_sub = get_font(26, bold=False)
    font_badge = get_font(18, bold=True)
    
    text_x = icon_x + icon_size + 55
    title_y = icon_y + 35
    
    # Category / Tag Pill with maximum contrast (dark emerald text on crisp white pill)
    pill_text = "SMART AI COOKBOOK" if lang == 'en' else "SMARTES KI-KOCHBUCH"
    pill_bbox = font_badge.getbbox(pill_text)
    text_w = pill_bbox[2] - pill_bbox[0]
    text_h = pill_bbox[3] - pill_bbox[1]
    pad_x = 18
    pad_y = 7
    pill_w = text_w + pad_x * 2
    pill_h = text_h + pad_y * 2
    pill_y = title_y - 48
    
    # White rounded pill
    draw.rounded_rectangle([text_x, pill_y, text_x + pill_w, pill_y + pill_h], radius=pill_h // 2, fill=(255, 255, 255, 255))
    # Dark emerald text (#064e3b) for strong, razor-sharp contrast
    draw.text((text_x + pad_x, pill_y + pad_y - pill_bbox[1]), pill_text, font=font_badge, fill=(6, 78, 59, 255))
    
    # App Title (White)
    draw.text((text_x, title_y), "Snagbite", font=font_title, fill=(255, 255, 255, 255))
    
    # Subtitle / Pillar text (Light mint / emerald-100)
    sub_y = title_y + 88
    draw.text((text_x, sub_y), subtitle_text, font=font_sub, fill=(236, 253, 245, 255))
    
    # Second Line: Highlights (Emerald-200)
    hl_text = "Reels · Photos · Meal Planner · Timer · Groceries" if lang == 'en' else "Reels · Fotos · Wochenplaner · Timer · Einkaufsliste"
    draw.text((text_x, sub_y + 38), hl_text, font=get_font(20, bold=False), fill=(167, 243, 208, 240))
    
    # Convert to RGB and save (Play Console accepts PNG / JPG)
    final_img = canvas.convert('RGB')
    final_img.save(output_path, 'PNG', optimize=True)
    print(f'[OK] Generated {output_path} (1024x500)')

# Generate DE and EN
generate_banner('de', "Importieren · Organisieren · Planen · Kochen", os.path.join(de_dir, 'featureGraphic.png'))
generate_banner('en', "Import · Organize · Plan · Cook", os.path.join(en_dir, 'featureGraphic.png'))
