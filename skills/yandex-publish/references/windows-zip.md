# Windows ZIP

Do not use PowerShell `Compress-Archive` for Yandex upload ZIPs.

Reason:

- It can create entries with backslash paths like `assets\index.js`.
- Yandex hosts on Linux-like systems expecting forward slashes.
- This can cause JS/assets 404 after upload.

Use:

```bash
npm run build:yandex
```

The generated Python script writes ZIP paths with forward slashes.

Verify:

```bash
python -c "import zipfile; print(zipfile.ZipFile('yandex-game.zip').namelist()[:5])"
```
