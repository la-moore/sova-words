"""Builds the game dictionary.

Output:
  src/game/words.json        — common nouns: level bases, goals and the "missed words" list
  src/game/words-extra.json  — rare nouns: accepted as answers, counted as bonus only

Sources:
  OpenCorpora (via pymorphy3) — nouns, nominative singular (or plural-only nouns),
    without proper names, abbreviations, slang and other marked lemmas;
  НКРЯ frequency dictionary (Ляшевская, Шаров 2009) — noun lemma frequency;
  common.txt / rare.txt / block.txt / legacy.txt — manual corrections.

Usage:
  python3 -m venv .venv && .venv/bin/pip install -r scripts/words/requirements.txt
  .venv/bin/python scripts/words/build.py [--report]
"""
import csv
import io
import json
import re
import sys
import urllib.request
import zipfile
from pathlib import Path

import pymorphy3

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
CACHE = HERE / '.cache'
RNC_URL = 'http://dict.ruslang.ru/Freq2011.zip'

# A noun is "common" from this many occurrences per million words in НКРЯ.
COMMON_IPM = 2.0
WORD = re.compile(r'[а-я]{3,8}')
MARKED = {'Name', 'Surn', 'Patr', 'Geox', 'Orgn', 'Trad', 'Abbr', 'Init', 'Erro', 'Dist', 'Infr', 'Slng', 'Arch', 'Litr', 'Obsc'}


def normalize(word: str) -> str:
    return word.strip().lower().replace('ё', 'е')


def read_list(name: str) -> set[str]:
    words = set()
    for line in (HERE / name).read_text(encoding='utf-8').splitlines():
        if not line.startswith('#'):
            words.update(normalize(word) for word in line.split())
    return words


def rnc_frequencies() -> dict[str, float]:
    archive = CACHE / 'Freq2011.zip'
    if not archive.exists():
        CACHE.mkdir(exist_ok=True)
        urllib.request.urlretrieve(RNC_URL, archive)
    with zipfile.ZipFile(archive) as zf, zf.open('freqrnc2011.csv') as raw:
        frequencies: dict[str, float] = {}
        for row in csv.DictReader(io.TextIOWrapper(raw, encoding='utf-8'), delimiter='\t'):
            if row['PoS'] == 's':
                lemma = normalize(row['Lemma'])
                frequencies[lemma] = max(frequencies.get(lemma, 0.0), float(row['Freq(ipm)']))
        return frequencies


def opencorpora_nouns() -> set[str]:
    nouns = set()
    for word, tag, normal, *_ in pymorphy3.MorphAnalyzer().dictionary.iter_known_words():
        if word != normal or 'NOUN' not in tag or 'nomn' not in tag:
            continue
        if ('sing' in tag or 'Pltm' in tag) and not tag.grammemes & MARKED:
            nouns.add(normalize(word))
    return nouns


def main() -> None:
    common_extra, rare, block, legacy = (read_list(name) for name in ('common.txt', 'rare.txt', 'block.txt', 'legacy.txt'))
    frequencies = rnc_frequencies()
    accepted = {word for word in opencorpora_nouns() | legacy | common_extra if WORD.fullmatch(word)} - block
    common = {word for word in accepted if frequencies.get(word, 0) >= COMMON_IPM} | (common_extra & accepted)
    common -= rare
    extra = accepted - common

    missing = sorted(common_extra - accepted)
    if missing:
        sys.exit(f'common.txt words are invalid or blocked: {" ".join(missing)}')

    for name, words in (('words.json', common), ('words-extra.json', extra)):
        (ROOT / 'src' / 'game' / name).write_text(json.dumps(sorted(words), ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'common: {len(common)}, extra: {len(extra)}')

    if '--report' in sys.argv:
        # Frequent in modern texts but below the НКРЯ threshold: candidates for common.txt.
        import wordfreq
        candidates = sorted(extra - rare, key=lambda word: -wordfreq.zipf_frequency(word, 'ru'))
        report = CACHE / 'candidates.txt'
        report.write_text('\n'.join(candidates[:1500]) + '\n', encoding='utf-8')
        print(f'candidates for common.txt: {report}')


if __name__ == '__main__':
    main()
