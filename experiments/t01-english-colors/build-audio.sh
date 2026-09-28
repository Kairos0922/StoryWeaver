#!/usr/bin/env bash
set -euo pipefail
OUT="$1"
FFMPEG="$(node -e "process.stdout.write(require('ffmpeg-static'))")"
rm -rf "$OUT" && mkdir -p "$OUT"

voice='en-us'
speed=135
pitch=58
make(){ espeak-ng -v "$voice" -s "$speed" -p "$pitch" -w "$OUT/$1.wav" "$2"; }

# Story dialogue. No teaching prompts, no flashcard answers.
make 01 "Oh! My little car is gone."
make 02 "Is it here?"
make 03 "It's red... but it's a ball."
make 04 "Look! A blue box."
make 05 "It's blue. Open it!"
make 06 "A yellow umbrella!"
make 07 "Look! Little tracks."
make 08 "Let's follow them!"
make 09 "A red ball!"
make 10 "There it is! My red car!"
make 11 "I found it! Let's go!"
make 12 "Zoom!"

inputs=()
filters=()
labels=()
i=0
for spec in '01:0' '02:10' '03:15' '04:21' '05:26' '06:32' '07:43' '08:54' '09:60' '10:66' '11:78' '12:85'; do
  file="${spec%%:*}"; start="${spec##*:}000"
  inputs+=("-i" "$OUT/$file.wav")
  filters+=("[${i}:a]adelay=${start}:all=1[a${i}]")
  labels+=("[a${i}]")
  i=$((i+1))
done
filter="$(IFS=';'; echo "${filters[*]}")"
filter+=";$(IFS=''; echo "${labels[*]}")amix=inputs=12:duration=longest:dropout_transition=0:normalize=0[voice]"

# Deterministic, low-volume musical bed: keeps the video alive between lines.
"$FFMPEG" -hide_banner -loglevel error -f lavfi -i "sine=frequency=261.63:sample_rate=44100:duration=90" -f lavfi -i "sine=frequency=329.63:sample_rate=44100:duration=90" -f lavfi -i "sine=frequency=392:sample_rate=44100:duration=90" \
  -filter_complex "[0:a]volume=0.010[a0];[1:a]volume=0.008[a1];[2:a]volume=0.006[a2];[a0][a1][a2]amix=inputs=3:duration=longest:normalize=0,afade=t=in:st=0:d=2,afade=t=out:st=86:d=4[music]" \
  -map "[music]" -ar 44100 -ac 2 -c:a pcm_s16le "$OUT/music.wav"

# Simple story SFX: reveal pops at key discoveries and a final zoom cue.
"$FFMPEG" -hide_banner -loglevel error -f lavfi -i "sine=frequency=880:sample_rate=44100:duration=0.18" -af "afade=t=out:st=0.05:d=0.13,volume=0.12" "$OUT/pop.wav"
"$FFMPEG" -hide_banner -loglevel error -f lavfi -i "sine=frequency=1320:sample_rate=44100:duration=0.22" -af "afade=t=out:st=0.06:d=0.16,volume=0.10" "$OUT/ding.wav"
"$FFMPEG" -hide_banner -loglevel error -f lavfi -i "sine=frequency=180:sample_rate=44100:duration=0.35" -af "afade=t=out:st=0.05:d=0.30,volume=0.08" "$OUT/zoom.wav"

"$FFMPEG" -hide_banner -loglevel error \
  -i "$OUT/pop.wav" -i "$OUT/ding.wav" -i "$OUT/zoom.wav" \
  -filter_complex "[0:a]adelay=21000|21000[p1];[1:a]adelay=32000|32000[d1];[1:a]adelay=66000|66000[d2];[2:a]adelay=85000|85000[z1];[p1][d1][d2][z1]amix=inputs=4:duration=longest:normalize=0[sfx]" \
  -map "[sfx]" -ar 44100 -ac 2 -c:a pcm_s16le "$OUT/sfx.wav"


"$FFMPEG" -hide_banner -loglevel error \
  -i "$OUT/music.wav" -i "$OUT/sfx.wav" \
  -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest:normalize=0[fx]" \
  -map "[fx]" -c:a pcm_s16le "$OUT/bed-sfx.wav"

# Rebuild voice stream, then mix voice over the bed and encode the final AAC.
"$FFMPEG" -hide_banner -loglevel error "${inputs[@]}" -filter_complex "$filter" -map '[voice]' -t 90 -ar 44100 -ac 2 -c:a pcm_s16le "$OUT/voice.wav"
"$FFMPEG" -hide_banner -loglevel error -i "$OUT/voice.wav" -i "$OUT/bed-sfx.wav" \
  -filter_complex "[0:a]volume=1.0[v];[1:a]volume=0.55[b];[v][b]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[aout]" \
  -map '[aout]' -t 90 -ar 44100 -ac 2 -c:a aac -b:a 160k "$OUT/voice.m4a"
