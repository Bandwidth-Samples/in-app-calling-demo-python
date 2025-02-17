# Backend - FastAPI
FROM python:3.13

# Set working directory
WORKDIR /app

# Copy only the requirements file to install dependencies first
COPY backend/requirements.txt ./

# Install dependencies
RUN pip install -r requirements.txt

# Copy the entire backend directory into the container
COPY backend/. .

# Start the FastAPI application
CMD ["python", "api.py"]
