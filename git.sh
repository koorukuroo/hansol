#!/bin/bash

echo "Git 작업을 시작합니다..."

# git add 수행
echo "파일들을 staging area에 추가합니다..."
git add .

# 현재 시간으로 커밋 메시지 생성
DATETIME=$(date '+%Y-%m-%d %H:%M:%S')
COMMIT_MESSAGE="Auto commit $DATETIME"

echo "커밋을 생성합니다: $COMMIT_MESSAGE"
git commit -m "$COMMIT_MESSAGE"

# main 브랜치로 푸시
echo "원격 저장소에 푸시합니다... (브랜치: main)"
git push origin main

echo "Git 작업이 완료되었습니다!"
