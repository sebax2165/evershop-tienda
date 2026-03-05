FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run compile:db
RUN npm run compile
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
