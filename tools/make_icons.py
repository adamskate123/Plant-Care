#!/usr/bin/env python3
"""Generate app icons (no third-party deps) for the Plant Care PWA.

Draws a rounded-square green background with a white leaf + midrib.
Outputs maskable-friendly icons at a few sizes.
"""
import math
import os
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")


def lerp(a, b, t):
    return a + (b - a) * t


def rounded_alpha(x, y, size, radius):
    """Coverage (0..1) for a rounded square, anti-aliased at the corners."""
    r = radius
    # distance from nearest corner-center if in a corner region
    cx = min(max(x, r), size - r)
    cy = min(max(y, r), size - r)
    dx = x - cx
    dy = y - cy
    if dx == 0 and dy == 0:
        return 1.0
    d = math.hypot(dx, dy)
    return max(0.0, min(1.0, r - d + 0.5))


def leaf_alpha(x, y, size):
    """Coverage for a centered, slightly tilted leaf shape + midrib."""
    # Normalize to [-1, 1] centered
    nx = (x - size / 2) / (size * 0.5)
    ny = (y - size / 2) / (size * 0.5)
    # Rotate ~ -30 degrees so the leaf tilts
    ang = math.radians(-28)
    rx = nx * math.cos(ang) - ny * math.sin(ang)
    ry = nx * math.sin(ang) + ny * math.cos(ang)
    # Leaf occupies ry in [-0.78, 0.78]; width follows a smooth lobe
    half = 0.78
    if ry < -half or ry > half:
        return 0.0
    t = (ry + half) / (2 * half)  # 0..1 along the leaf
    width = 0.42 * math.sin(math.pi * t) ** 0.85
    edge = width - abs(rx)
    aa = size * 0.5  # scale factor back to pixels for AA
    cov = max(0.0, min(1.0, edge * aa + 0.5))
    # Midrib: a thin darker-free line -> we render leaf white, midrib as a gap
    rib = abs(rx) - 0.012
    rib_cov = max(0.0, min(1.0, -rib * aa + 0.5))
    return max(0.0, cov - rib_cov * 0.9)


def make_png(size):
    radius = int(size * 0.22)
    # vertical gradient green
    top = (0x3F, 0xB6, 0x6E)
    bot = (0x1F, 0x8A, 0x53)
    leaf = (0xF4, 0xFB, 0xF6)

    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter byte: none
        gt = y / (size - 1)
        bg = (
            int(lerp(top[0], bot[0], gt)),
            int(lerp(top[1], bot[1], gt)),
            int(lerp(top[2], bot[2], gt)),
        )
        for x in range(size):
            ra = rounded_alpha(x + 0.5, y + 0.5, size, radius)
            if ra <= 0:
                raw.extend((0, 0, 0, 0))
                continue
            la = leaf_alpha(x + 0.5, y + 0.5, size)
            r = int(lerp(bg[0], leaf[0], la))
            g = int(lerp(bg[1], leaf[1], la))
            b = int(lerp(bg[2], leaf[2], la))
            a = int(255 * ra)
            raw.extend((r, g, b, a))

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        c += struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        return c

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    targets = {
        "icon-192.png": 192,
        "icon-512.png": 512,
        "apple-touch-icon.png": 180,
    }
    for name, size in targets.items():
        data = make_png(size)
        with open(os.path.join(OUT_DIR, name), "wb") as f:
            f.write(data)
        print(f"wrote {name} ({size}x{size}, {len(data)} bytes)")


if __name__ == "__main__":
    main()
