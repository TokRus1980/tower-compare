# Tower TON — Сравнение комплектов

Статический инструмент для сравнения комплектов и предметов Tower TON.

## Запуск

```bash
npm install
npm run transform     # генерирует data/*.json из data/source/тест.json
npm test              # юнит-тесты логики compare.ts
npm run dev           # http://localhost:5173
```

## Сборка

```bash
npm run build
npm run preview
```

## Деплой (Cloudflare Pages)

```bash
npx wrangler pages deploy dist --project-name=tower-compare
```

## Структура данных

- `data/items.json` — предметы экипировки (6 слотов)
- `data/materials.json` — ресурсы (слитки, ткани, камни, еда, магия)
- `data/tools.json` — инструменты (топоры, кирки, удочки) — не участвуют в сравнении экипировки
- `data/sets.json` — комплекты (рецепты Set-типа)
- `data/recipes.json` — одиночные рецепты (Single-типа)

## Что не реализовано (следующая итерация)

- Combobox с поиском по названию
- Раскрывающиеся строки слотов с полным diff статов
- Бейджи «разные классы» / «разные уровни»
- Кнопки «Открыть гайд A/B»