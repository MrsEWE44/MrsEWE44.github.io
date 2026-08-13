---
title: "安卓入门指南：从认识 Android 系统开始"
date: 2026-08-13 14:00:00
categories:
  - 安卓
tags:
  - Android
  - 教程
---

Android 是目前市场占有率最高的移动操作系统，基于 Linux 内核开发。这篇文章带你从零认识它的整体架构。

## Android 系统架构分层

从底到顶依次是：**Linux 内核**、**硬件抽象层 HAL**、**系统服务**、**应用框架层**，以及最顶层的**应用层**。

- Linux 内核：负责进程、内存、驱动管理
- HAL：封装硬件能力，避免应用直接操作驱动
- 系统服务：提供包管理、窗口管理、Activity 管理等
- 应用层：你手机上安装的所有 App

## 查看设备信息

在电脑上连接手机并开启 ADB 调试后，可以查看设备基本信息：

```bash
adb devices
adb shell getprop ro.product.model
adb shell getprop ro.build.version.release
adb shell getprop ro.product.cpu.abi
```

第一条命令确认设备连接正常，后面的命令分别输出型号、Android 版本和 CPU 架构。

## 常见文件路径

| 路径 | 用途 |
| --- | --- |
| /system | 系统分区 |
| /data | 用户数据分区 |
| /sdcard | 内置存储 |
| /cache | 缓存分区 |

> 注意：Android 10 之后部分系统分区改为只读，普通用户无法直接修改。

## 小结

理解 Android 的分层结构是后续学习刷机、Root、Termux 等一切折腾的基础。下一篇文章我们会深入 Linux 终端。
