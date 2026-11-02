FROM node:18-slim

# Install Python, Chromium, and Chromedriver
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    chromium \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies from requirements.txt
COPY requirements.txt .
RUN pip3 install -r requirements.txt --break-system-packages

# Setup Node.js app
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 5500
CMD ["node", "server.js"]
