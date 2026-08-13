---
title: "安卓刷机保姆级教程：解锁 BL、刷入 Recovery 与系统"
date: 2026-08-13 14:00:00
categories:
  - 安卓
tags:
  - 刷机
  - Android
  - ADB
  - 教程
---

刷机是折腾 Android 的终极乐趣，但也最容易翻车。本文按完整流程讲解：解锁 Bootloader → 刷入 Recovery → 刷入第三方 ROM。

> 强烈建议先备份重要数据，本文操作会清空手机数据，且不同机型步骤略有差异。

## 第一步：准备工作

1. 备份全部重要数据
2. 电脑安装最新 ADB 工具（见上一篇文章）
3. 下载对应机型的官方固件、TWRP 镜像、Magisk 安装包
4. 确认手机电池电量充足

## 第二步：解锁 Bootloader

大多数品牌需要先在官方申请解锁资格（如小米），然后在 fastboot 模式下解锁：

```bash
adb reboot bootloader

# 等待设备进入 fastboot 后
fastboot devices
fastboot oem unlock          # 部分机型
fastboot flashing unlock     # 新机型常用
```

按手机屏幕提示选择解锁，数据会被清空。解锁后手机会重启。

## 第三步：刷入 TWRP Recovery

```bash
adb reboot bootloader
fastboot flash recovery twrp.img
fastboot reboot recovery
```

进入 TWRP 后通常需要刷入一个 `vbmeta.img`（部分机型）避免开机验证失败：

```bash
fastboot flash vbmeta vbmeta.img
fastboot --disable-verity --disable-verification flash vbmeta vbmeta.img
```

## 第四步：刷入第三方系统

进入 TWRP 后，执行以下操作：

```text
1. Wipe → Advanced Wipe → 勾选 Dalvik/ART、System、Data、Cache
2. 返回主界面 → Install → 选择下载好的 ROM zip
3. 滑动确认刷入
4. （可选）同样刷入 GApps 和 Magisk
5. Reboot System
```

## 第五步：安装 Magisk 实现 Root

如果 ROM 包未内置 Root，可以刷入 Magisk：

```bash
# 1. 提取原厂 boot.img
adb pull /dev/block/by-name/boot boot.img

# 2. 在电脑上使用 Magisk 修补 boot.img（安装 Magisk App → 安装 → 选择并修补文件）

# 3. 将修补后的 boot.img 刷回
adb push magisk_patched-*.img /sdcard/
adb reboot bootloader
fastboot flash boot magisk_patched-*.img
fastboot reboot
```

## 常见失败与救砖

| 现象 | 原因 | 解决办法 |
| --- | --- | --- |
| 卡在开机 Logo | 系统未刷完整 | 重进 Recovery 三清后重刷 |
| 无限重启 | 内核与系统不匹配 | 刷回官方 boot.img |
| 无法进入系统 | 分区损坏 | 用官方线刷工具刷回 |
| fastboot 无设备 | 驱动未装 | 安装小米/高通/联发科 USB 驱动 |

> 救砖的最后手段是使用厂商官方线刷工具（如小米的 miflash）刷入完整官方固件。只要不是硬件损坏，通常都能救回来。
