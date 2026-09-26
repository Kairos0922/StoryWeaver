#!/usr/bin/env bash
set -euo pipefail
OUT="$1"
rm -rf "$OUT" && mkdir -p "$OUT"
voice='en-us'
speed=145
pitch=65
make(){ espeak-ng -v "$voice" -s "$speed" -p "$pitch" -w "$OUT/$1.wav" "$2"; }
make 01 'Hello! Let us find colors.'
make 02 'What color is the ball?'
make 03 'Red.'
make 04 'Say it with Milo. It is red.'
make 05 'What color is the ball?'
make 06 'Blue.'
make 07 'Say it with Milo. It is blue.'
make 08 'What color is the ball?'
make 09 'Yellow.'
make 10 'Say it with Milo. It is yellow.'
make 11 'Can you remember? Red. Blue. Yellow.'
make 12 'You did it! Red. Blue. Yellow.'
inputs=()
filters=()
labels=()
i=0
for spec in '01:0' '02:8' '03:12' '04:18' '05:28' '06:32' '07:38' '08:48' '09:52' '10:58' '11:68' '12:80'; do
  file="${spec%%:*}"; start="${spec##*:}000"
  inputs+=("-i" "$OUT/$file.wav")
  filters+=("[${i}:a]adelay=${start}:all=1[a${i}]")
  labels+=("[a${i}]")
  i=$((i+1))
done
filter="$(IFS=';'; echo "${filters[*]}")"
filter+=";$(IFS=''; echo "${labels[*]}")amix=inputs=12:duration=longest:dropout_transition=0:normalize=0[aout]"
ffmpeg -hide_banner -loglevel error "${inputs[@]}" -filter_complex "$filter" -map '[aout]' -t 90 -ar 44100 -ac 2 -c:a aac -b:a 128k "$OUT/voice.m4a"
