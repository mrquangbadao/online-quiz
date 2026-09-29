#!/bin/bash
set -e

echo "=========================================================="
echo "  [VPS] BẮT ĐẦU REBUILD DỰ ÁN ONLINE-QUIZ NHANH CHÓNG     "
echo "=========================================================="

echo "===> [1/3] Kéo mã nguồn mới nhất từ GitHub..."
git pull origin main

echo "===> [2/3] Build và khởi chạy Docker Compose..."
docker compose up -d --build

echo "===> [3/3] Trạng thái các container đang chạy:"
docker compose ps

echo "=========================================================="
echo "  REBUILD HOÀN TẤT THÀNH CÔNG!                           "
echo "  Truy cập: http://btdcsgioinghean.com/                  "
echo "=========================================================="
