<div align="center">
  <img width="100" height="100" src="public/icons/sova.svg" alt="Sova">
</div>

# [Sova — игра в слова](https://sova.la-moore.ru/)

Игра в слова-анаграммы: составляйте слова из набора букв — слово дня, уровни сложности и тематические режимы. Подойдёт тем, кто любит кроссворды и головоломки.

Работает как PWA: можно установить на главный экран и играть офлайн.

### Установка

`npm install`

### Разработка

- `npm run dev` — dev-сервер с hot reload (доступен в локальной сети)
- `npm test` — тесты (Vitest)
- `npm run build` — typecheck и production-сборка в `dist/`
- `npm run preview` — локальный просмотр сборки

### Значки достижений

Код значков достижений (`src/badges/`) есть в отдельной песочнице на CodePen — там его можно посмотреть и поэкспериментировать с ним отдельно от игры: [codepen.io](https://codepen.io/editor/MoorLex/pen/01a1f2f4-0d32-79ef-beee-d75f5fc99292)

### Словарь

Словарь собирается скриптом `scripts/words/build.py` из OpenCorpora (существительные без имён, топонимов, аббревиатур и жаргона) и частотного словаря НКРЯ:

- `src/game/words.json` — частотные слова: базы уровней, цель и список пропущенных слов;
- `src/game/words-extra.json` — редкие слова: принимаются как ответ, но идут только в бонус.

Ручные правки — в `scripts/words/`: `common.txt` (добавить в частотные), `rare.txt` (оставить только редкими), `block.txt` (убрать совсем). После правок:

```sh
python3 -m venv .venv && .venv/bin/pip install -r scripts/words/requirements.txt
.venv/bin/python scripts/words/build.py --report
```

С `--report` скрипт кладёт в `scripts/words/.cache/candidates.txt` редкие слова, которые часто встречаются в современных текстах, — кандидатов в `common.txt`.
