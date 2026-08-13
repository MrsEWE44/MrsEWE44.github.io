---
title: "Termux 入门教程：在手机上运行 Linux 终端"
date: 2026-08-13 14:00:00
categories:
  - Termux
tags:
  - Termux
  - Android
  - Linux
  - 教程
---

Termux 是一款强大的 Android 终端模拟器，无需 Root 即可体验完整的 Linux 命令行环境。

## 安装与初始化

在 [F-Droid](https://f-droid.org) 或 GitHub Releases 下载最新版 Termux 安装。注意不要用 Play 商店的过时版本。

安装完成后，先更新软件源和系统：

```bash
pkg update -y
pkg upgrade -y
```

> 如果国内网络慢，可以切换清华源：`termux-change-repo`，选择 TUNA 镜像。

## 基础软件安装

```bash
pkg install -y git python nodejs vim openssh
```

常用软件包一览：

| 包名 | 用途 |
| --- | --- |
| git | 版本控制 |
| python | Python 解释器 |
| nodejs | Node.js 运行时 |
| openssh | SSH 客户端/服务端 |
| vim / nano | 文本编辑器 |
| clang / gcc | C/C++ 编译器 |

## 存储权限与文件访问

访问手机存储需要先授权：

```bash
termux-setup-storage
ls ~/storage/shared   # 即内部存储根目录
```

执行后手机会弹出权限请求，允许即可。之后可以自由读写手机文件。

## 远程登录 Termux

在 Termux 里启动 SSH 服务：

```bash
pkg install -y openssh
sshd
whoami              # 查看用户名
passwd              # 设置密码
```

然后在电脑上用 SSH 连接：

```bash
ssh 用户名@手机IP -p 8022
```

查看手机 IP：`ifconfig` 或 `ip addr`。

## 运行脚本示例

写一个简单的 Python 脚本并运行：

```python
#!/usr/bin/env python3
import platform

print("Hello from Termux!")
print("Platform:", platform.platform())
```

```bash
python script.py
```

> Termux 可以安装 Ubuntu 等发行版（`pkg install proot-distro`），实现完整的 Linux 体验。
