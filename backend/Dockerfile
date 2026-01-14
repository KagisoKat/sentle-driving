FROM node:20-alpine

WORKDIR /app

# bcrypt needs native build tools on Alpine
RUN apk add --no-cache python3 make g++

COPY package.json ./

RUN npm install --no-audit --no-fund

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
