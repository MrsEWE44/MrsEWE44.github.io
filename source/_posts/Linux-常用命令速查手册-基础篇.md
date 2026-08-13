---
title: "Linux 常用命令速查手册（基础篇）"
date: 2026-08-13 14:00:00
categories:
  - Linux
tags:
  - Linux
  - 命令
  - 教程
---

无论是服务器还是 Termux，Linux 命令都是效率的基石。本文整理最常用的命令，附带实例。

## 文件和目录

```bash
pwd                # 显示当前目录
ls -la             # 列出文件（含隐藏文件）
cd /sdcard         # 进入目录
mkdir -p a/b/c     # 递归创建目录
rm -rf temp        # 递归删除目录
cp -r src dst      # 复制目录
mv old new         # 移动 / 重命名
```

## 查看与编辑文件

```bash
cat file.txt       # 查看整个文件
less file.txt      # 分页查看（q 退出）
head -n 5 file     # 查看前 5 行
tail -n 20 file    # 查看后 20 行
grep "error" log.txt   # 搜索关键字
vim file.txt       # 用 vim 编辑
```

## 权限管理

Linux 用 `rwx` 表示读、写、执行权限：

```bash
chmod 755 script.sh   # 所有者可读写执行，组与其他只读执行
chmod +x script.sh    # 添加执行权限
chown user:group file # 修改属主和属组
```

## 进程与系统

```bash
ps aux              # 查看所有进程
top                 # 实时查看资源占用
kill -9 PID         # 强制结束进程
df -h               # 查看磁盘使用情况
free -h             # 查看内存使用
uname -a            # 查看内核信息
```

## 网络命令

```bash
ping -c 4 google.com   # 测试连通性
curl -I https://github.com   # 查看 HTTP 响应头
wget url             # 下载文件
ss -tlnp             # 查看端口监听
```

> 记忆技巧：`ls` 是 list，`rm` 是 remove，`grep` 是文本过滤。多用 `man 命令名` 查看帮助。
