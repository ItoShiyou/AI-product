# Sweeper CLI

YouTube URL list from CSV -> vocal-only features -> `artists.json`.

## What it does

- Downloads best audio with `yt-dlp` as mono WAV (22050 Hz)
- Separates vocals with `spleeter:2stems`
- Cuts a 15-second chorus clip
  - Manual by `start_time` in CSV, or
  - Auto by max RMS window
- Extracts features with `librosa`
  - `mfcc_mean` (13 dims)
  - `spectral_centroid`
  - `pitch_range` (`freq_min`, `freq_max`)
- Generates extra smartphone-like feature set (`300Hz-3kHz` band)
- Detects anomalies (`near_silence`, `accompaniment_leak_suspected`)
- Writes one JSON compatible with existing app structure
- Deletes intermediate WAV files by default

## CSV format

Required columns:

- `artist_name`
- `youtube_url`

Optional columns:

- `start_time` (seconds)
- `gender` (default: `unknown`)
- `tags` (split with `|`)

Example:

```csv
artist_name,youtube_url,start_time,gender,tags
Aimer,https://www.youtube.com/watch?v=xxxx,42,female,transparent|midrange
Kenshi Yonezu,https://www.youtube.com/watch?v=yyyy,,male,breathy|low-mid
```

Template file:

- `input.template.csv`

## Install

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Also ensure binaries are available:

- `yt-dlp`
- `spleeter`
- `ffmpeg`

## Run

```bash
cp input.template.csv input.csv
python sweeper.py \
  --csv input.csv \
  --output ../artists.generated.json \
  --sample-rate 22050 \
  --clip-seconds 15

# Optional: stop at first failure instead of continuing
python sweeper.py --csv input.csv --output ../artists.generated.json --stop-on-error
```

## Output shape

The output JSON includes:

- `artists[]` with fields used by the app (`id`, `name`, `gender`, `pitch_range`, `timbre`, `tags`)
- extra diagnostic fields (`timbre_mobile`, `correction`, `source`, `quality`)
- `meta` with generation information and failed rows

## Notes

- Temporary WAV/stem files are removed unless `--keep-temp` is used.
- For JS/Python parity, `correction` is emitted with placeholder values (`meyda_alignment_gain`, `offset`) so you can calibrate later with a shared reference sample.
