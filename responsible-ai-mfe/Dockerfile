FROM node:20.11.1-bookworm-slim

WORKDIR /app

RUN useradd --create-home myuser && chown -R myuser:myuser /app

USER myuser

COPY --chown=myuser:myuser package*.json ./

RUN npm install --legacy-peer-deps

COPY --chown=myuser:myuser . .

EXPOSE 30055

ENTRYPOINT ["npm", "start"]
