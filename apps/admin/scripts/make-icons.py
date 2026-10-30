# Builds the admin app's home-screen icons from the main app's icon: the same
# characters on a white tile inside a purple frame, so the two icons tell
# apart on a phone. The white tile stays inside the maskable safe zone (the
# inner 80%), so one file serves both "any" and "maskable".
import sys
from PIL import Image, ImageDraw

src_path, out_dir = sys.argv[1], sys.argv[2]
PURPLE = (130, 0, 219)  # Tailwind purple-700 in sRGB, the app's primary-700
src = Image.open(src_path).convert('RGBA')


def icon(size: int, rounded_frame: bool) -> Image.Image:
	canvas = Image.new('RGBA', (size, size), PURPLE)
	draw = ImageDraw.Draw(canvas)
	if rounded_frame:
		# Transparent corners for the favicon; home-screen icons get masked by
		# the OS, so they stay square.
		mask = Image.new('L', (size, size), 0)
		ImageDraw.Draw(mask).rounded_rectangle(
			(0, 0, size - 1, size - 1), radius=size // 5, fill=255
		)
		canvas.putalpha(mask)
		draw = ImageDraw.Draw(canvas)
	inset = round(size * 0.12)
	tile = (inset, inset, size - inset - 1, size - inset - 1)
	draw.rounded_rectangle(tile, radius=round(size * 0.12), fill=(255, 255, 255))
	art = round(size * 0.70)
	picture = src.resize((art, art), Image.LANCZOS)
	offset = (size - art) // 2
	canvas.alpha_composite(picture, (offset, offset))
	return canvas


icon(512, False).save(f'{out_dir}/icon-512.png', optimize=True)
icon(192, False).save(f'{out_dir}/icon-192.png', optimize=True)
icon(180, False).convert('RGB').save(f'{out_dir}/apple-touch-icon.png', optimize=True)
icon(64, True).save(f'{out_dir}/favicon.png', optimize=True)
print('wrote icon-512, icon-192, apple-touch-icon, favicon')
