import os
import sys
import json
import subprocess

sys.stdout.reconfigure(line_buffering=True)

VIDEO_DIR = "videos/user_saved"
THUMB_DIR = "videos/thumbnails"
OUTPUT_FILE = "videos/video_properties.json"

os.makedirs(THUMB_DIR, exist_ok=True)

mp4_files = sorted([f for f in os.listdir(VIDEO_DIR) if f.lower().endswith(".mp4")])
total = len(mp4_files)
print(f"Found {total} .mp4 files")

# Load existing properties for resume support
properties = {}
if os.path.exists(OUTPUT_FILE):
    with open(OUTPUT_FILE) as f:
        properties = json.load(f)
    print(f"Loaded {len(properties)} existing entries (resume mode)")

skipped = 0
for i, filename in enumerate(mp4_files, 1):
    # Skip if already processed
    if filename in properties:
        skipped += 1
        print(f"[{i}/{total}] SKIP (already processed): {filename}")
        continue

    filepath = os.path.join(VIDEO_DIR, filename)
    print(f"[{i}/{total}] Processing {filename}...", end=" ")

    # Run ffprobe
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-print_format", "json",
                "-show_format", "-show_streams",
                filepath,
            ],
            capture_output=True, text=True, timeout=30,
        )
        probe = json.loads(result.stdout)
    except Exception as e:
        print(f"FFPROBE ERROR: {e}")
        continue

    # Extract video stream info
    video_stream = None
    for s in probe.get("streams", []):
        if s.get("codec_type") == "video":
            video_stream = s
            break

    fmt = probe.get("format", {})
    file_size = int(fmt.get("size", 0))
    duration = float(fmt.get("duration", 0))
    bitrate = int(fmt.get("bit_rate", 0))

    width = int(video_stream.get("width", 0)) if video_stream else 0
    height = int(video_stream.get("height", 0)) if video_stream else 0
    codec = video_stream.get("codec_name", "") if video_stream else ""

    # Calculate FPS from r_frame_rate (e.g. "30/1")
    fps = 0.0
    if video_stream:
        rfr = video_stream.get("r_frame_rate", "0/1")
        try:
            num, den = rfr.split("/")
            fps = round(int(num) / int(den), 2) if int(den) != 0 else 0.0
        except Exception:
            fps = 0.0

    properties[filename] = {
        "duration": round(duration, 2),
        "width": width,
        "height": height,
        "codec": codec,
        "file_size": file_size,
        "bitrate": bitrate,
        "fps": fps,
    }

    # Generate thumbnail
    thumb_path = os.path.join(THUMB_DIR, os.path.splitext(filename)[0] + ".jpg")
    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", filepath,
                "-ss", "1", "-vframes", "1", "-q:v", "2",
                thumb_path,
            ],
            capture_output=True, timeout=30,
        )
    except Exception as e:
        print(f"THUMB ERROR: {e}")

    print("OK")

with open(OUTPUT_FILE, "w") as f:
    json.dump(properties, f, indent=2)

print(f"\nDone. Wrote {len(properties)} entries to {OUTPUT_FILE}")
print(f"New: {len(properties) - skipped if len(properties) > skipped else 0}, Skipped: {skipped}")
print(f"Thumbnails saved to {THUMB_DIR}/")
