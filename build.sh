#!/bin/bash

buildUat() {
  echo "开始打包uat环境"
  npm run build:uat
  echo "uat环境打包完毕，正在自动git提交"
  git add .
  git commit -m "type: build uat"
  git push
  echo "git提交完毕"
}


clear

echo ""
echo ""
echo -e "\t\t\t\t选择打包模式"
echo -e "\t\t\t\t 1. dev环境"
echo -e "\t\t\t\t 2. uat环境"
echo -e "\t\t\t\t 3. fat环境"
read env

case $env in
  1) buildDev ;;
  2) buildUat ;;
  3) buildFat ;;
  *) echo "选择错误" ;;
esac