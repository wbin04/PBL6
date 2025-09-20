```cmd
cd backend
.venv/Scripts/activate
python manage.py runserver 0.0.0.0:8000

cd ../frontend
python -m http.server 8080

cd ../mobile
npx expo start
```