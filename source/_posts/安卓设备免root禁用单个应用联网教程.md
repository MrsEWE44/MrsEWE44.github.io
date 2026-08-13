---
title: 安卓设备免ROOT禁用单个应用联网教程
date: 2026-08-13 13:24:50
updated: 2026-08-13 13:29:03
tags:
  - Android
  - ADB
  - Shell
  - Java
  - Android开发
categories:
  - 技术笔记
  - 安卓
  - 安卓开发
  - Android
---


# 安卓设备免ROOT禁用单个应用联网教程
1、需要adb权限，无论你是在手机上用shizuku还是连接电脑使用adb shell都可以。适用于安卓11及以上系统。
2、命令如下
2-1、先执行以下命令，启用防火墙
```
cmd connectivity set-chain3-enabled true
```
2-2、禁用联网命令
```
cmd connectivity set-package-networking-enabled false 软件包名
```
2-3、启用联网命令
```
cmd connectivity set-package-networking-enabled true 软件包名
```

这样可以通过adb命令管理应用的联网权限。

enjoy😀
