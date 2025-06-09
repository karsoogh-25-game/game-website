# Dockerfile

# Use the official lightweight Node.js 18 image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# --- Add and permission the wait-for-it script ---
# This script ensures the database is ready before the app starts
COPY wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

# Install PM2 globally for process management
RUN npm install pm2 -g

# Copy package files and install dependencies
# This layer is cached to speed up future builds
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Expose the application port
EXPOSE 3000

# The command to run the application using PM2
# pm2-runtime is designed for containerized environments
CMD [ "pm2-runtime", "app.js", "-i", "max" ]