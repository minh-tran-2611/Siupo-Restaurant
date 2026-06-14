# ---- build: Vite build ra thư mục dist/ ----
FROM node:20-alpine AS build
WORKDIR /app
ENV HUSKY=0

COPY package*.json ./
RUN npm install --no-audit --no-fund --ignore-scripts

COPY . .

# API URL nhúng lúc build (Vite chỉ expose biến prefix VITE_)
ARG VITE_API_BASE_URL
ARG VITE_BACKEND_BASE_URL
ARG VITE_APP_NAME="Siupo Restaurant"
RUN printf 'VITE_API_BASE_URL=%s\nVITE_BACKEND_BASE_URL=%s\nVITE_APP_NAME=%s\n' \
    "$VITE_API_BASE_URL" "$VITE_BACKEND_BASE_URL" "$VITE_APP_NAME" > .env.production

RUN npm run build

# ---- runtime: nginx phục vụ tĩnh ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
