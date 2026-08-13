---
title: "ADB 工具完全指南：从安装到常用命令"
date: 2026-08-13 14:00:00
categories:
  - 安卓
tags:
  - ADB
  - Android
  - 教程
---

ADB（Android Debug Bridge）是与 Android 设备交互的核心工具，无论是刷机、调试还是解 BL 锁都离不开它。

## 安装 ADB

### Windows

下载 [platform-tools](https://developer.android.com/tools/releases/platform-tools) 并解压，把目录加入环境变量 PATH，或直接在该目录打开终端。

### Linux / Termux

```bash
# Debian / Ubuntu
sudo apt install -y android-tools-adb

# Termux
pkg install -y android-tools
```

## 开启 USB 调试

进入「设置 → 关于手机」连续点击版本号 7 次开启开发者选项，然后在「开发者选项」里打开 USB 调试。

用数据线连接电脑后：

```bash
adb devices
```

首次连接手机会提示授权，勾选「始终允许」并确认。

## 常用命令速查

```bash
adb devices                    # 查看连接设备
adb shell                      # 进入设备 shell
adb install app.apk            # 安装应用
adb uninstall com.example.app  # 卸载应用
adb pull /sdcard/1.txt .       # 拉取文件到电脑
adb push 1.txt /sdcard/        # 推送文件到手机
adb reboot                     # 重启设备
adb reboot recovery            # 重启到 recovery
adb reboot bootloader          # 重启到 bootloader
adb logcat                     # 查看系统日志
adb screencap /sdcard/s.png    # 截图
adb shell wm size              # 查看屏幕分辨率
```

## 常用进阶命令

```bash
# 屏幕录制（无 root）
adb shell screenrecord /sdcard/demo.mp4

# 无线调试（Android 11+）
adb pair 192.168.1.100:37000
adb connect 192.168.1.100:39000

# 查看应用列表
adb shell pm list packages
adb shell pm list packages -3   # 仅第三方应用

# 强制停止应用
adb shell am force-stop com.example.app
```

> 无线调试先在「开发者选项 → 无线调试」里配对，然后使用生成的 IP:端口连接。

## 常见问题

如果 `adb devices` 显示 `unauthorized`，说明手机端授权弹窗没有确认。显示 `offline` 则尝试拔插数据线并重启 adb：

```bash
adb kill-server
adb start-server
```
