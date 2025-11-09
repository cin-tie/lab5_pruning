# Лабораторная работа 5 — Вариант 7

**Тема:** Алгоритмы отсечения (Сазерленд–Коэн и Сазерленд–Ходжман)  
**Технологии:** HTML, CSS, JavaScript, Flask (Python), Docker

---

## Запуск

### 1. Локально
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### 2. Через Docker
```bash
docker build -t lab5-variant7 .
docker run -p 5000:5000 lab5-variant7
```

### 3. Через docker-compose
```bash
docker composer up --build
```

