---
title: "Hexo 部署到 GitHub Pages 流程教程"
date: 2024-01-01 10:00:00
updated: 2026-08-13 10:42:29
tags:
  - Hexo
  - GitHub
categories:
  - [随笔]
---

本篇记录 Hexo 博客从零搭建到部署到 GitHub Pages 的完整流程，这也是本博客本身的构建方式。

## 一、本地环境准备

需要安装 Node.js（自带 npm）与 Git：

```bash
node -v
npm -v
git --version
```

## 二、初始化 Hexo

```bash
# 安装 Hexo CLI
npm install -g hexo-cli

# 初始化博客目录
hexo init myblog
cd myblog

# 安装依赖
npm install

# 本地预览
hexo server
```

浏览器打开 `http://localhost:4000` 即可看到默认站点。

## 三、写文章与生成静态文件

```bash
# 新建文章
hexo new "我的第一篇文章"

# 生成静态文件到 public/
hexo generate

# 清空并重新生成（改完主题后建议）
hexo clean && hexo generate
```

## 四、配置站点信息

编辑根目录 `_config.yml`：

```yaml
# 站点信息
title: 我的博客
subtitle: 记录与分享
language: zh-CN
timezone: Asia/Shanghai

# URL（GitHub Pages 通常是 https://用户名.github.io）
url: https://用户名.github.io
```

## 五、创建 GitHub 仓库

在 GitHub 创建仓库，命名为 `用户名.github.io`，公开仓库：

```bash
# 关联远程仓库
git remote add origin git@github.com:用户名/用户名.github.io.git

# 推送源码（保留源码便于更新）
git add .
git commit -m "init"
git push -u origin main
```

## 六、选择部署方式

### 方式 A：GitHub Actions 自动部署（推荐）

在仓库创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npx hexo clean && npx hexo generate
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./public
      - uses: actions/deploy-pages@v4
```

> 需要去 Settings → Pages → Source 选择 GitHub Actions，并在 Actions 权限里允许 `GITHUB_TOKEN` 写入。

### 方式 B：hexo-deployer-git 直接推送

```bash
# 安装部署插件
npm install hexo-deployer-git --save
```

`_config.yml` 增加：

```yaml
deploy:
  type: git
  repo: https://github.com/用户名/用户名.github.io.git
  branch: main
```

然后一键部署：

```bash
hexo deploy
```

## 七、绑定自定义域名（可选）

在仓库根目录创建 `CNAME` 文件写入域名，并在 `_config.yml` 里同步 `url`。

## 八、常见问题

- 页面没更新：检查 Actions 是否成功，或强制刷新浏览器缓存。
- 图片打不开：路径前加 `/` 使用站点根目录绝对路径。
- 主题修改不生效：先 `hexo clean` 再 `hexo generate`。

## 九、本博客的实际部署

本博客即采用 GitHub Actions 方案：源码推送到 `main` 分支，Actions 自动执行 `hexo generate` 并把 `public/` 发布到 Pages，实现了「写完推上去就自动上线」。

```bash
# 日常更新流程
hexo new "新文章"
hexo clean && hexo generate
git add .
git commit -m "新增文章"
git push
```
