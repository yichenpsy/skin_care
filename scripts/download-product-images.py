#!/usr/bin/env python3
"""Cache catalog images using only Python's standard library. Run from any directory."""
import concurrent.futures
import csv
import hashlib
import json
from pathlib import Path
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'frontend/apps/web/public/images/products'
MANIFEST = ROOT / 'frontend/apps/web/src/lib/product-images.json'
REPORT = ROOT / 'scripts/product-image-download-report.json'
PLACEHOLDER = '/images/products/placeholder.svg'
TIMEOUT_SECONDS = 12
MAX_IMAGE_BYTES = 10 * 1024 * 1024
WORKERS = 6
OVERRIDES_PATH = ROOT / 'scripts/product-image-sources.json'
OVERRIDES = json.loads(OVERRIDES_PATH.read_text()) if OVERRIDES_PATH.exists() else {}


def image_extension(data):
    if data.startswith(b'\xff\xd8\xff'):
        return '.jpg'
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return '.png'
    if data[:6] in (b'GIF87a', b'GIF89a'):
        return '.gif'
    if data.startswith(b'RIFF') and data[8:12] == b'WEBP':
        return '.webp'
    if data[4:8] == b'ftyp' and b'avif' in data[8:32]:
        return '.avif'
    raise ValueError('Response is not a recognized raster image')


def download(entry):
    original, names = entry
    stem = hashlib.sha256(original.encode()).hexdigest()[:24]
    # Reuse successful downloads; failed URLs are tried again on the next run.
    for existing in DEST.glob(stem + '.*'):
        try:
            if existing.suffix == image_extension(existing.read_bytes()):
                return original, '/images/products/' + existing.name, None
        except ValueError:
            pass
    replacement = OVERRIDES.get(original, {}).get("url")
    candidates = [replacement, original] if replacement else [original]
    if 'media.sephora.eu/content/dam/digital/' in original:
        candidates.append(original.replace('/content/dam/digital/', '/content/dam/gdam/europe/digital/'))
    errors = []
    for url in candidates:
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'image/avif,image/webp,image/*;q=0.9,*/*;q=0.5'})
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                data = response.read(MAX_IMAGE_BYTES + 1)
                if len(data) > MAX_IMAGE_BYTES:
                    raise ValueError('Image exceeds 10 MiB limit')
                extension = image_extension(data)
                resolved = response.url
            target = DEST / (stem + extension)
            target.write_bytes(data)
            return original, '/images/products/' + target.name, {'source': original, 'resolved': resolved, 'products': names, 'file': target.name}
        except (OSError, ValueError, urllib.error.HTTPError) as error:
            errors.append({'url': url, 'error': str(error)})
    return original, PLACEHOLDER, {'source': original, 'products': names, 'errors': errors}


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    sources = {}
    with (ROOT / 'backend/db/data/final_products.csv').open(newline='', encoding='utf-8-sig') as source:
        for row in csv.DictReader(source):
            url = (row.get('merchant_image_url') or '').strip()
            if url:
                sources.setdefault(url, []).append(row.get('product_name', ''))
    previous = json.loads(REPORT.read_text()) if REPORT.exists() else {}
    downloaded = {row["source"]: row for row in previous.get("downloaded", previous.get("downloadedThisRun", []))}
    manifest, failed = {}, []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = [pool.submit(download, entry) for entry in sources.items()]
        for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
            original, local, detail = future.result()
            manifest[original] = local
            if local == PLACEHOLDER:
                failed.append(detail)
            elif detail:
                downloaded[original] = detail
            if index % 25 == 0 or index == len(futures):
                print(f'{index}/{len(futures)} checked; {index-len(failed)} local images; {len(failed)} unavailable', flush=True)
    MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), ensure_ascii=False, indent=2) + '\n')
    REPORT.write_text(json.dumps({'totalUrls': len(manifest), 'available': len(manifest)-len(failed), 'failed': failed, 'downloaded': list(downloaded.values())}, ensure_ascii=False, indent=2) + '\n')
    print(f'Manifest: {MANIFEST}\nReport: {REPORT}', flush=True)


if __name__ == '__main__':
    main()
