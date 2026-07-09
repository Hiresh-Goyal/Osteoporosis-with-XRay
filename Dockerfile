# Stage 1: Build the React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup Python Backend
FROM python:3.10-slim
WORKDIR /app

# Install system dependencies (needed for some python packages like XGBoost)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy model files and backend code
COPY models/ ./models/
COPY backend/ ./backend/

# Copy the built React app into the frontend/dist folder
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose the Hugging Face Spaces port
EXPOSE 7860

# Ensure the database is initialized before starting
WORKDIR /app/backend
RUN python init_db.py

# Run the Flask server
CMD ["python", "app.py"]
