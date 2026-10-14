# Etapa 1: Build y Runtime
FROM node:24-alpine

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar todas las dependencias
RUN npm ci

# Copiar el código fuente completo
COPY . .

# Construir el bundle de producción del cliente
RUN npm run build:client

# Crear directorio de base de datos persistente
RUN mkdir -p /app/data

# Exponer el puerto de producción
EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

# Iniciar servidor Node.js
CMD ["node", "server/src/index.js"]
