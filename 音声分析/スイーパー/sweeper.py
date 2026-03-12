#!/usr/bin/env python3
"""Sweeper CLI: build singer feature database from YouTube URLs.

Pipeline:
1. Download audio from YouTube as WAV (22050 Hz)
2. Separate vocals with Spleeter (2 stems)
3. Cut chorus section (manual start or max-RMS 15 sec)
4. Extract features (MFCC-13 mean, spectral centroid, pitch range)
5. Detect anomalies and export artists.json-compatible output
6. Delete intermediate WAV files by default
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import librosa
import numpy as np
import soundfile as sf


@dataclass
class InputRow:
    artist_name: str
    youtube_url: str
    start_time: Optional[float]
    gender: str
    tags: List[str]


@dataclass
class ExtractionResult:
    artist: Dict[str, Any]
    warnings: List[str]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build artists feature JSON from a CSV list of YouTube URLs."
    )
    parser.add_argument("--csv", required=True, help="Path to input CSV")
    parser.add_argument("--output", required=True, help="Path to output artists JSON")
    parser.add_argument(
        "--sample-rate", type=int, default=22050, help="Audio sample rate (default: 22050)"
    )
    parser.add_argument(
        "--clip-seconds", type=float, default=15.0, help="Clip length in seconds (default: 15)"
    )
    parser.add_argument(
        "--id-prefix", default="jp-", help="ID prefix for generated IDs (default: jp-)"
    )
    parser.add_argument(
        "--id-start", type=int, default=1, help="Starting number for ID auto assignment"
    )
    parser.add_argument(
        "--keep-temp",
        action="store_true",
        help="Keep temporary downloaded/separated files for debugging",
    )
    parser.add_argument(
        "--stop-on-error",
        action="store_true",
        help="Stop batch processing at first failed row (default: continue)",
    )
    parser.add_argument(
        "--separator",
        choices=("auto", "spleeter", "none"),
        default="auto",
        help="Vocal separation backend. 'auto' uses spleeter when available, otherwise falls back to no separation.",
    )
    return parser.parse_args()


def load_csv(csv_path: Path) -> List[InputRow]:
    rows: List[InputRow] = []
    with csv_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        required = {"artist_name", "youtube_url"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"CSV missing required columns: {sorted(missing)}")

        for raw in reader:
            name = (raw.get("artist_name") or "").strip()
            url = (raw.get("youtube_url") or "").strip()
            if not name or not url:
                continue

            start_time = parse_optional_float((raw.get("start_time") or "").strip())
            gender = (raw.get("gender") or "unknown").strip() or "unknown"
            tags_text = (raw.get("tags") or "").strip()
            tags = [t.strip() for t in tags_text.split("|") if t.strip()]
            rows.append(
                InputRow(
                    artist_name=name,
                    youtube_url=url,
                    start_time=start_time,
                    gender=gender,
                    tags=tags,
                )
            )
    return rows


def parse_optional_float(value: str) -> Optional[float]:
    if not value:
        return None
    try:
        parsed = float(value)
    except ValueError:
        return None
    if not math.isfinite(parsed) or parsed < 0:
        return None
    return parsed


def run_cmd(cmd: List[str], cwd: Optional[Path] = None) -> None:
    completed = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if completed.returncode != 0:
        stderr_tail = "\n".join(completed.stderr.strip().splitlines()[-15:])
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\n{stderr_tail}")


def download_audio(url: str, out_wav: Path, sample_rate: int) -> None:
    # player_client=tv_embedded bypasses YouTube SABR-only stream restrictions
    cmd = [
        "yt-dlp",
        "-f",
        "bestaudio/best",
        "--extractor-args",
        "youtube:player_client=tv_embedded,default",
        "-x",
        "--audio-format",
        "wav",
        "--audio-quality",
        "0",
        "--postprocessor-args",
        f"ffmpeg:-ar {sample_rate} -ac 1",
        "-o",
        str(out_wav.with_suffix(".%(ext)s")),
        url,
    ]
    run_cmd(cmd)

    if not out_wav.exists():
        candidates = sorted(out_wav.parent.glob(f"{out_wav.stem}*.wav"))
        if not candidates:
            raise RuntimeError("WAV output not found after yt-dlp download")
        candidates[0].replace(out_wav)


def separate_vocals(input_wav: Path, output_root: Path, sample_rate: int) -> Tuple[Path, Path]:
    cmd = [
        "spleeter",
        "separate",
        "-p",
        "spleeter:2stems",
        "-o",
        str(output_root),
        str(input_wav),
    ]
    run_cmd(cmd)

    song_dir = output_root / input_wav.stem
    vocal_path = song_dir / "vocals.wav"
    accompaniment_path = song_dir / "accompaniment.wav"

    if not vocal_path.exists() or not accompaniment_path.exists():
        raise RuntimeError("Spleeter output stems were not found")
    return vocal_path, accompaniment_path


def passthrough_vocals(input_wav: Path, output_root: Path, sample_rate: int) -> Tuple[Path, Path]:
    song_dir = output_root / input_wav.stem
    song_dir.mkdir(parents=True, exist_ok=True)
    vocal_path = song_dir / "vocals.wav"
    accompaniment_path = song_dir / "accompaniment.wav"

    shutil.copy2(input_wav, vocal_path)

    y, sr = librosa.load(input_wav, sr=sample_rate, mono=True)
    sf.write(accompaniment_path, np.zeros_like(y), sr)

    return vocal_path, accompaniment_path


def resolve_separator(separator: str) -> str:
    if separator == "none":
        return "none"
    if separator == "spleeter":
        if shutil.which("spleeter") is None:
            raise EnvironmentError("Separator 'spleeter' was requested but the command was not found in PATH.")
        return "spleeter"
    if shutil.which("spleeter") is not None:
        return "spleeter"
    return "none"


def choose_clip_segment(
    y: np.ndarray,
    sr: int,
    clip_seconds: float,
    start_time: Optional[float],
) -> Tuple[np.ndarray, float, str]:
    total_seconds = len(y) / sr
    clip_seconds = max(1.0, min(clip_seconds, total_seconds if total_seconds > 1 else 1.0))

    if start_time is not None:
        begin = max(0.0, min(start_time, max(0.0, total_seconds - clip_seconds)))
        end = begin + clip_seconds
        return y[int(begin * sr) : int(end * sr)], begin, "manual"

    frame_length = 2048
    hop_length = 512
    rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
    if rms.size == 0:
        return y, 0.0, "fallback_full"

    window_frames = max(1, int((clip_seconds * sr - frame_length) / hop_length))
    window_frames = min(window_frames, rms.size)
    kernel = np.ones(window_frames, dtype=np.float32)
    moving = np.convolve(rms, kernel, mode="valid")
    best_idx = int(np.argmax(moving)) if moving.size else 0
    begin = best_idx * hop_length / sr
    begin = max(0.0, min(begin, max(0.0, total_seconds - clip_seconds)))
    end = begin + clip_seconds
    return y[int(begin * sr) : int(end * sr)], begin, "auto_rms"


def fft_bandpass(y: np.ndarray, sr: int, low_hz: float, high_hz: float) -> np.ndarray:
    spec = librosa.stft(y, n_fft=2048, hop_length=512)
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    mask = (freqs >= low_hz) & (freqs <= high_hz)
    filtered = np.where(mask[:, None], spec, 0)
    return librosa.istft(filtered, hop_length=512, length=len(y))


def compute_features(y: np.ndarray, sr: int) -> Dict[str, Any]:
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_mean = np.mean(mfcc, axis=1)

    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    centroid_valid = centroid[np.isfinite(centroid)]
    centroid_mean = float(np.mean(centroid_valid)) if centroid_valid.size else 0.0

    # A compact stability signal based on centroid variation.
    tightness = float(np.clip(1.0 / (1.0 + (float(np.std(centroid_valid)) / 1000.0)), 0.0, 1.0))

    f0, voiced_flag, _ = librosa.pyin(
        y,
        sr=sr,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        frame_length=2048,
        hop_length=256,
    )
    voiced = f0[np.isfinite(f0)] if f0 is not None else np.array([])

    freq_min = float(np.min(voiced)) if voiced.size else 0.0
    freq_max = float(np.max(voiced)) if voiced.size else 0.0

    return {
        "mfcc_mean": [round(float(v), 6) for v in mfcc_mean],
        "spectral_centroid": round(centroid_mean, 6),
        "tightness": round(tightness, 6),
        "freq_min": round(freq_min, 6),
        "freq_max": round(freq_max, 6),
    }


def detect_quality_flags(
    y_vocal: np.ndarray,
    y_accomp: np.ndarray,
    sr: int,
) -> Dict[str, Any]:
    rms_vocal = librosa.feature.rms(y=y_vocal, frame_length=2048, hop_length=512)[0]
    rms_accomp = librosa.feature.rms(y=y_accomp, frame_length=2048, hop_length=512)[0]

    if rms_vocal.size == 0:
        return {
            "is_anomalous": True,
            "warnings": ["empty_audio"],
            "silence_ratio": 1.0,
            "accompaniment_leak_ratio": 1.0,
        }

    silence_ratio = float(np.mean(rms_vocal < 0.01))
    vocal_mean = float(np.mean(rms_vocal)) + 1e-9
    accomp_mean = float(np.mean(rms_accomp)) if rms_accomp.size else 0.0
    leak_ratio = float(accomp_mean / vocal_mean)

    warnings: List[str] = []
    if silence_ratio > 0.45:
        warnings.append("near_silence")
    if leak_ratio > 0.35:
        warnings.append("accompaniment_leak_suspected")

    return {
        "is_anomalous": bool(warnings),
        "warnings": warnings,
        "silence_ratio": round(silence_ratio, 6),
        "accompaniment_leak_ratio": round(leak_ratio, 6),
    }


def hz_to_note_name(freq: float) -> str:
    if not freq or freq <= 0:
        return "unknown"
    return librosa.hz_to_note(freq)


def artist_entry(
    artist_id: str,
    row: InputRow,
    source_url: str,
    clip_start: float,
    clip_mode: str,
    base_features: Dict[str, Any],
    mobile_features: Dict[str, Any],
    quality: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "id": artist_id,
        "name": row.artist_name,
        "gender": row.gender,
        "pitch_range": {
            "min": hz_to_note_name(base_features["freq_min"]),
            "max": hz_to_note_name(base_features["freq_max"]),
            "freq_min": base_features["freq_min"],
            "freq_max": base_features["freq_max"],
        },
        "timbre": {
            "spectral_centroid": base_features["spectral_centroid"],
            "mfcc_mean": base_features["mfcc_mean"],
            "tightness": base_features["tightness"],
        },
        "timbre_mobile": {
            "spectral_centroid": mobile_features["spectral_centroid"],
            "mfcc_mean": mobile_features["mfcc_mean"],
            "tightness": mobile_features["tightness"],
        },
        "correction": {
            "meyda_alignment_gain": 1.0,
            "meyda_alignment_offset": 0.0,
            "note": "Calibrate using a shared reference file if needed.",
        },
        "source": {
            "youtube_url": source_url,
            "clip_start_sec": round(clip_start, 3),
            "clip_mode": clip_mode,
        },
        "quality": quality,
        "tags": row.tags,
    }


def process_single(
    index: int,
    row: InputRow,
    args: argparse.Namespace,
    work_root: Path,
) -> ExtractionResult:
    artist_id = f"{args.id_prefix}{index:03d}"

    dl_wav = work_root / f"{artist_id}.wav"
    sep_root = work_root / "separated"

    download_audio(row.youtube_url, dl_wav, args.sample_rate)
    separator = resolve_separator(args.separator)
    if separator == "spleeter":
        vocal_path, accomp_path = separate_vocals(dl_wav, sep_root, args.sample_rate)
    else:
        vocal_path, accomp_path = passthrough_vocals(dl_wav, sep_root, args.sample_rate)

    y_vocal, sr = librosa.load(vocal_path, sr=args.sample_rate, mono=True)
    y_accomp, _ = librosa.load(accomp_path, sr=args.sample_rate, mono=True)

    clip_vocal, clip_start, clip_mode = choose_clip_segment(
        y_vocal,
        sr,
        clip_seconds=args.clip_seconds,
        start_time=row.start_time,
    )

    clip_accomp, _, _ = choose_clip_segment(
        y_accomp,
        sr,
        clip_seconds=args.clip_seconds,
        start_time=clip_start,
    )

    if clip_vocal.size == 0:
        raise RuntimeError("Selected clip is empty")

    base_features = compute_features(clip_vocal, sr)
    mobile_clip = fft_bandpass(clip_vocal, sr, 300.0, 3000.0)
    mobile_features = compute_features(mobile_clip, sr)
    quality = detect_quality_flags(clip_vocal, clip_accomp, sr)

    artist = artist_entry(
        artist_id=artist_id,
        row=row,
        source_url=row.youtube_url,
        clip_start=clip_start,
        clip_mode=clip_mode,
        base_features=base_features,
        mobile_features=mobile_features,
        quality=quality,
    )

    return ExtractionResult(artist=artist, warnings=quality.get("warnings", []))


def verify_binaries() -> None:
    for exe in ("yt-dlp", "ffmpeg"):
        if shutil.which(exe) is None:
            raise EnvironmentError(
                f"Required command '{exe}' not found in PATH. Install dependencies first."
            )


def write_output(
    out_path: Path,
    artists: List[Dict[str, Any]],
    failed: List[Dict[str, str]],
    args: argparse.Namespace,
) -> None:
    payload = {
        "artists": artists,
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "tool": "sweeper-cli",
            "sample_rate": args.sample_rate,
            "clip_seconds": args.clip_seconds,
            "failed_count": len(failed),
            "failed": failed,
        },
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    args = parse_args()
    csv_path = Path(args.csv)
    out_path = Path(args.output)

    if not csv_path.exists():
        print(f"[error] CSV file not found: {csv_path}", file=sys.stderr)
        return 2

    try:
        verify_binaries()
    except Exception as e:
        print(f"[error] {e}", file=sys.stderr)
        return 2

    rows = load_csv(csv_path)
    if not rows:
        print("[error] No valid rows found in CSV", file=sys.stderr)
        return 2

    artists: List[Dict[str, Any]] = []
    failed: List[Dict[str, str]] = []

    with tempfile.TemporaryDirectory(prefix="sweeper_") as tmp_dir:
        work_root = Path(tmp_dir)

        for i, row in enumerate(rows, start=args.id_start):
            print(f"[info] Processing {row.artist_name} ({i})")
            try:
                result = process_single(i, row, args, work_root)
                artists.append(result.artist)
                if result.warnings:
                    print(f"[warn] {row.artist_name}: {', '.join(result.warnings)}")
            except Exception as e:
                failed.append({"artist_name": row.artist_name, "error": str(e)})
                print(f"[error] {row.artist_name}: {e}", file=sys.stderr)
                if args.stop_on_error:
                    break
            finally:
                if not args.keep_temp:
                    for item in work_root.iterdir():
                        if item.is_dir():
                            shutil.rmtree(item, ignore_errors=True)
                        else:
                            item.unlink(missing_ok=True)

    write_output(out_path, artists, failed, args)
    print(f"[done] Exported {len(artists)} artists -> {out_path}")
    if failed:
        print(f"[done] Failed rows: {len(failed)} (see meta.failed in output JSON)")

    return 0 if artists else 1


if __name__ == "__main__":
    raise SystemExit(main())
