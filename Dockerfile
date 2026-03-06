FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run compile:db
RUN npm run compile
RUN cd extensions/one-step-checkout && npx swc ./src/ -d dist/ --config-file .swcrc --copy-files --strip-leading-paths
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
