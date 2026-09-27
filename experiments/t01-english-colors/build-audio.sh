#!/usr/bin/env bash
set -euo pipefail
OUT="$1"
rm -rf "$OUT" && mkdir -p "$OUT"
voice='en-us'
speed=145
pitch=65
make(){ espeak-ng -v "$voice" -s "$speed" -p "$pitch" -w "$OUT/$1.wav" "$2"; }
make 01 "Let's find colors!"
make 02 'What color is the ball?'
make 03 'Red.'
make 04 'Say it with Milo.'
make 05 "It's red!"
make 06 'What color is the ball?'
make 07 'Blue.'
make 08 'Say it with Milo.'
make 09 "It's blue!"
make 10 'What color is the ball?'
make 11 'Yellow.'
make 12 'Say it with Milo.'
make 13 "It's yellow!"
make 14 'Can you remember?'
make 15 'Red. Blue. Yellow.'
make 16 'You did it! Red. Blue. Yellow.'
inputs=()
filters=()
labels=()
i=0
for spec in '01:0' '02:8' '03:12' '04:18' '05:22' '06:28' '07:32' '08:38' '09:42' '10:48' '11:52' '12:58' '13:62' '14:68' '15:74' '16:80'; do
  file="${spec%%:*}"; start="${spec##*:}000"
  inputs+=("-i" "$OUT/$file.wav")
  filters+=("[${i}:a]adelay=${start}:all=1[a${i}]")
  labels+=("[a${i}]")
  i=$((i+1))
done
filter="$(IFS=';'; echo "${filters[*]}")"
filter+=";$(IFS=''; echo "${labels[*]}")amix=inputs=16:duration=longest:dropout_transition=0:normalize=0[aout]"
ffmpeg -hide_banner -loglevel error "${inputs[@]}" -filter_complex "$filter" -map '[aout]' -t 90 -ar 44100 -ac 2 -c:a aac -b:a 128k "$OUT/voice.m4a"
