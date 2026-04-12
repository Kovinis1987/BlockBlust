# Blust

Тестовое задание в жанре `Blast Puzzle`, доведённое до состояния аккуратного игрового прототипа: с чистой архитектурой, editor tooling, unit-тестами и нормальной инженерной дисциплиной.

Проект сделан на `Cocos Creator 2.4.x + TypeScript`.

Играбельная web-версия:
`https://kovinis1987.github.io/BlockBlust/`

## Что внутри

В основе игры классическая blast-механика:

- клик по группе соседних тайлов одного цвета
- уничтожение группы
- падение оставшихся тайлов вниз
- дозаполнение поля новыми тайлами
- победа по очкам и поражение по ходам

Поверх обязательной части я реализовал и довёл до рабочего состояния:

- автоматическое перемешивание поля, если нет доступных ходов
- ограничение на количество shuffle
- бустер `бомба`
- бустер `телепорт`
- супер-тайлы из больших групп
- разные типы супер-эффектов
- анимации, эффекты, score popup
- редактор уровней прямо внутри Cocos Creator

То есть это не просто “механика на минималках”, а уже цельный прототип, который можно открыть, запустить, редактировать и расширять дальше.

## Почему проект выглядит сильно

Я сознательно не оставлял игру в виде одного большого `GameController`.

Код разложен по ролям:

- `GameStore` хранит состояние
- `GameSignals` сообщает об изменениях
- `GameSessionService` меняет данные и держит игровые правила
- `GameStateMachine` управляет состояниями
- `TurnResolutionService` обрабатывает разрушение тайлов и бустеров
- `GameProgressionService` ведёт flow после хода
- `LevelFlowService` отвечает за загрузку уровня
- `BoardViewService` собирает и отрисовывает поле
- `BombBoosterService` изолирует bomb-flow

В результате логика игры отделена от отображения, а проект не разваливается при первом же усложнении механик.

Именно это я и хотел показать этим тестовым: не только умение собрать механику, но и умение держать кодовую базу в рабочем, масштабируемом состоянии.

## Level Editor

Для проекта сделан собственный editor extension.

Он открывается из верхнего меню Cocos Creator:

`Extension -> Level Editor`

Что умеет:

- выбирать `Level ID`
- задавать размер поля
- настраивать `moves` и `target score`
- вручную рисовать раскладку уровня
- сохранять всё в `assets/resources/configs/levels.json`

Это не “бонус ради бонуса”, а нормальный production-minded инструмент, который ускоряет работу с контентом и показывает, что я умею работать не только с runtime-кодом, но и с editor tooling.

## Тесты

Проект покрыт unit-тестами на важный gameplay-слой.

Проверяются:

- `GameBoardHelper`
- `BoosterResolutionService`
- `BoardInputService`
- `GridModel`
- `GameSessionService`
- `GameStateMachine`
- `GameProgressionService`
- `LevelManager`
- `LevelFlowService`
- `GridPhysicsService`
- `TurnResolutionService`
- `BombBoosterService`

Используется:

- `Vitest`
- coverage через `@vitest/coverage-v8`
- mock `cc` для тестовой среды

Сейчас в проекте:

- `40` unit tests
- coverage `88%+`
- локальные `pre-commit` и `pre-push` проверки
- CI на `GitHub Actions`

Команды:

```bash
npm install
npm run test
npm run test:coverage
npm run check
```

## Как открыть проект

1. Открыть проект в `Cocos Creator 2.4.x`
2. Запустить основную сцену в Preview или Simulator
3. При необходимости открыть `Extension -> Level Editor`
