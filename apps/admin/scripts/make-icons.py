# Builds the admin app's home-screen icons from the main app's icon: the same
# characters on a white tile inside a purple frame, so the two icons tell
# apart on a phone. The white tile stays inside the maskable safe zone (the
# inner 80%), so one file serves both "any" and "maskable".
import math
import sys
from PIL import Image, ImageDraw

src_path, out_dir = sys.argv[1], sys.argv[2]
PURPLE = (130, 0, 219)  # Tailwind purple-700 in sRGB, the app's primary-700
WHITE = (255, 255, 255)
src = Image.open(src_path).convert('RGBA')


def gear_badge(size: int) -> Image.Image:
	# A white gear on a purple disc, drawn at 4x and shrunk for smooth edges.
	scale = 4
	big = size * scale
	badge = Image.new('RGBA', (big, big), (0, 0, 0, 0))
	draw = ImageDraw.Draw(badge)
	centre = big / 2
	draw.ellipse((0, 0, big - 1, big - 1), fill=WHITE)
	ring = big * 0.06
	draw.ellipse((ring, ring, big - ring - 1, big - ring - 1), fill=PURPLE)
	teeth, outer, inner = 8, big * 0.34, big * 0.25
	points = []
	for tooth in range(teeth):
		base = tooth * 2 * math.pi / teeth
		# Each tooth is a flat top between two flanks; the angles are
		# fractions of one tooth's pitch.
		for angle, radius in (
			(base - 0.18, inner),
			(base - 0.12, outer),
			(base + 0.12, outer),
			(base + 0.18, inner),
		):
			points.append(
				(centre + radius * math.cos(angle), centre + radius * math.sin(angle))
			)
	draw.polygon(points, fill=WHITE)
	hole = big * 0.11
	draw.ellipse(
		(centre - hole, centre - hole, centre + hole, centre + hole), fill=PURPLE
	)
	return badge.resize((size, size), Image.LANCZOS)


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
	# The badge sits at the tile's bottom-right, inside the maskable safe
	# zone (a circle of 80% of the width), so a round launcher keeps it.
	badge = round(size * 0.24)
	at = round(size * 0.735) - badge // 2
	canvas.alpha_composite(gear_badge(badge), (at, at))
	return canvas


icon(512, False).save(f'{out_dir}/icon-512.png', optimize=True)
icon(192, False).save(f'{out_dir}/icon-192.png', optimize=True)
icon(180, False).convert('RGB').save(f'{out_dir}/apple-touch-icon.png', optimize=True)
icon(64, True).save(f'{out_dir}/favicon.png', optimize=True)
print('wrote icon-512, icon-192, apple-touch-icon, favicon')
