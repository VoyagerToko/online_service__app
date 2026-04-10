FROM node:20-alpine

WORKDIR /app

# Install Node dependencies first (layer cache)
COPY package.json package-lock.json* ./
RUN npm install

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Non-root user for security
RUN addgroup -S servify && adduser -S servify -G servify && chown -R servify:servify /app
USER servify

EXPOSE 8000

CMD ["npm", "run", "start"]
