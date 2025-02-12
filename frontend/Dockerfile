# Use the official Node.js image as the base image
FROM node:14

# Set the working directory
WORKDIR /app

# Copy the package.json and package-lock.json for dependency installation
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source
COPY frontend/. .

# Expose the port
EXPOSE 3000

# Start the application using npm
CMD ["npm", "start"]
