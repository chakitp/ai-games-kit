# LILY POND: Perf Budget (strictest portal wins: Poki/YouTube)

- First interactive frame <= 3 s desktop, <= 5 s mid phone
- Initial download <= 8 MB (target <= 200 KB: one HTML, one JS, one font)
- Files <= 20, each <= 512 KiB
- 60 fps median, p95 frame <= 20 ms
- JS heap <= 150 MB
- No external requests; filenames `[A-Za-z0-9_.-]` only
