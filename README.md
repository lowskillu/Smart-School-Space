# Smart School Space

Интегрированная платформа для управления школьными процессами (бэкэнд на Flask, фронтенд на React/Vite).

## 🚀 Как запустить проект локально

### 1. Подготовка переменных окружения
Скопируйте файл `.env.example` в новый файл `.env` в корне проекта:
```bash
cp .env.example .env
```
Отредактируйте `.env`, если нужно изменить ключи API или настройки базы данных.

---

### 2. Запуск Бэкэнда (Python / Flask)
Рекомендуется использовать виртуальное окружение.

```bash
cd backend
# Создание и активация окружения
python -m venv venv
source venv/bin/activate # Для Windows: venv\Scripts\activate

# Установка зависимостей
pip install -r requirements.txt
pip install gunicorn  # Для продакшена

# Запуск сервера
python run.py
```
Бэкэнд будет доступен по адресу: `http://localhost:5050`

---

### 3. Запуск Фронтенда (React / Vite)
В другом окне терминала (в корне проекта):

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev
```
Фронтенд будет доступен по адресу: `http://localhost:8080`

---

## 🛠 Технологии
- **Frontend**: React, TypeScript, Vite, TailwindCSS.
- **Backend**: Python, Flask, SQLAlchemy, JWT.
- **Database**: SQLite (по умолчанию) или PostgreSQL.
- **AI**: OpenRouter (Gemini 3 Flash).

---

## 📋 Инструкция по сборке (Build)
Если вы хотите собрать проект для деплоя:

**Frontend:**
```bash
npm run build
```
Результат будет в папке `dist/`.

**Backend:**
Настройте переменные окружения на сервере (Render, Heroku и т.д.) и используйте команду запуска:
```bash
gunicorn run:app
```
