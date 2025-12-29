FROM node:18-alpine

# 작업 디렉토리 생성
WORKDIR /app

# 의존성 파일 복사 및 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 13579

# 앱 실행 (Wait-for-it 등의 스크립트를 사용하거나 재시도 로직이 있으면 좋지만, 간단하게 실행)
CMD ["npm", "start"]
