---
title: "安卓 appops 命令完全指南：细粒度权限管理从入门到精通"
date: 2026-08-13 15:40:00
categories:
  - [技术笔记]
  - [安卓]
  - [安卓开发]
  - [Android]
tags:
  - Android
  - ADB
  - Shell
  - Java
  - Android开发
---

`appops`（App Ops）是 Android 4.4+ 引入的「细粒度权限管理」体系。比起传统权限只有「授予 / 拒绝」两种状态，appops 可以针对具体的操作（如定位、相机、剪贴板、后台活动）单独设置**允许 / 忽略 / 询问**，是免 Root 限制应用行为、防追踪的关键工具。

## 基本语法

```shell
appops set [--uid UID|--user 用户] 包名 操作 模式
appops get 包名
appops reset 包名
```

```shell
adb shell appops <command>
```

## 核心概念：AppOps 操作（Ops）

每个 AppOps 都有固定的操作码，常见的包括：

| 操作 | 作用 | 模式 |
|------|------|------|
| `COARSE_LOCATION` | 粗略定位 | allow / ignore / deny |
| `FINE_LOCATION` | 精确定位 | allow / ignore / deny |
| `CAMERA` | 相机 | allow / ignore / deny |
| `RECORD_AUDIO` | 麦克风 | allow / ignore / deny |
| `READ_CLIPBOARD` | 读取剪贴板 | allow / ignore |
| `WRITE_CLIPBOARD` | 写入剪贴板 | allow / ignore |
| `GET_USAGE_STATS` | 使用统计 | allow / ignore |
| `SYSTEM_ALERT_WINDOW` | 悬浮窗 | allow / ignore |
| `RUN_IN_BACKGROUND` | 后台运行 | allow / ignore |
| `SEND_SMS` | 发送短信 | allow / ignore |

> 注意：不同 Android 版本的 appops 名称略有差异，可用 `appops help` 查看完整列表。

## 查看应用的 appops 状态

```shell
# 查看单个应用的完整权限状态
adb shell appops get 包名

# 只查看某类操作
adb shell appops get 包名 CAMERA

# 查看所有应用在某个操作上的状态
adb shell appops get --uid <UID> 操作
```

## 设置权限模式

模式有三种，含义如下：

- `allow`：允许
- `ignore`：忽略（系统执行操作但返回空结果，应用以为成功了，实际拿不到数据）
- `deny`：拒绝（应用会收到失败回调，能感知被拒）
- `default`：恢复系统默认

```shell
# 禁止某应用使用精确定位（返回空数据，防追踪）
adb shell appops set 包名 FINE_LOCATION ignore

# 禁止使用相机
adb shell appops set 包名 CAMERA deny

# 禁止读取剪贴板
adb shell appops set 包名 READ_CLIPBOARD ignore

# 恢复默认
adb shell appops set 包名 CAMERA default
```

## 针对特定用户（应用分身核心）

```shell
# 只对用户 10（分身用户）设置
adb shell appops set --user 10 包名 FINE_LOCATION ignore

# 指定 UID 设置
adb shell appops set --uid 10xxxx 包名 CAMERA deny
```

> 应用分身的每一个分身都是独立的用户，各自拥有独立的 appops 状态。改主用户不影响分身，改分身不影响主用户。

## 批量管理

```shell
# 重置应用的所有 appops
adb shell appops reset 包名

# 查看当前设备所有被改动的 appops
adb shell appops get --uid all
```

## 实战：免 Root 屏蔽应用读取剪贴板

```shell
# 列出所有有剪贴板权限的应用
adb shell appops get --uid all READ_CLIPBOARD

# 逐个屏蔽
adb shell appops set 包名 READ_CLIPBOARD ignore

# 验证
adb shell appops get 包名 READ_CLIPBOARD
```

## 与 pm 权限的区别

| 维度 | pm grant/revoke | appops set |
|------|-----------------|------------|
| 粒度 | 只到「权限」级别 | 到「操作」级别（更细） |
| 状态 | 授予 / 撤销 | allow / ignore / deny / default |
| 可感知 | 应用能感知被拒 | ignore 时应用感知不到 |
| 作用域 | 整个应用 | 可按用户、UID 区分 |

## 注意事项

- `appops` 命令在部分国产 ROM 上被阉割，可尝试 `cmd appops`。
- Android 12+ 一些敏感 appops 需要系统签名才能修改。
- `ignore` 是最「温柔」的拒绝方式，很多防追踪方案都依赖它。

掌握 `appops`，你就能在不 Root 的情况下，精确控制每个应用的每一项小权限，真正做到「我的手机我做主」。