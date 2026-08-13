---
title: "安卓 am 命令完全指南：Activity 管理器从入门到精通"
date: 2026-08-13 15:20:00
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

`am`（Activity Manager）是 Android 系统里负责「四大组件」运行调度的管理器：Activity、Service、BroadcastReceiver、ContentProvider。通过 `am` 命令，你可以直接在 Shell 里启动应用、跳转页面、发广播、调服务、管理多用户，是自动化测试与日常折腾的神器。

## 基本语法

```shell
am <command> [options]
```

```shell
adb shell am <command>
# 或
su -c "am <command>"
```

## 启动 Activity（打开应用 / 页面）

```shell
# 打开指定包名的默认入口
am start -n 包名/.MainActivity

# 打开指定完整组件
am start -n 包名/全类名

# 打开应用详情设置页
am start -a android.settings.APPLICATION_DETAILS_SETTINGS -d package:包名

# 打开网址
am start -a android.intent.action.VIEW -d https://www.example.com

# 强制停止后再启动（冷启动）
am force-stop 包名
am start -n 包名/.MainActivity
```

> `-n` 指定组件（包名/类名），`-a` 指定 Action，`-d` 指定数据 URI，`-t` 指定 MIME 类型。若参数含 `/` 则视为组件名，否则视为包名。

## 常用 Intent 参数

```shell
# 指定类型
am start -a android.intent.action.VIEW -t image/* -d file:///sdcard/a.jpg

# 附加字符串 extra
am start -n 包名/.MainActivity --es key value

# 附加整数 / 布尔 / 长整型 extra
am start -n 包名/.MainActivity --ei count 10
am start -n 包名/.MainActivity --ez flag true
am start -n 包名/.MainActivity --el time 1700000000000

# 指定 MIME 类型
am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "hello"

# 以 root 权限 / 指定用户启动
am start -n 包名/.MainActivity --user 0
```

## 启动 Service

```shell
# 启动服务（Android 8.0+ 有后台限制）
am start-service 包名/服务类名

# Android 8.0+ 前台服务推荐用法
am start-foreground-service 包名/服务类名

# 停止服务
am stop-service 包名/服务类名
```

## 发送广播

```shell
# 发送普通广播
am broadcast -a 自定义广播.Action

# 带 extra
am broadcast -a 包名.ACTION -e key value

# 指定目标包
am broadcast -a 包名.ACTION -p 目标包名

# 显式指定接收组件
am broadcast -n 包名/接收类
```

## 内容提供者

```shell
# 查询 ContentProvider
am content query --uri content://authority/table

# 插入 / 更新 / 删除
am content insert --uri content://authority/table --bind 列名:s:值
am content update --uri content://authority/table --bind 列名:s:值
am content delete --uri content://authority/table
```

## 进程管理

```shell
# 强制停止应用（最彻底，清后台）
am force-stop 包名

# 杀死进程（保留后台服务）
am kill 包名

# 杀死所有后台进程
am kill-all

# 发送内存压力（0 低 / 15 高，配合杀后台）
am send-trim-memory 包名 5
```

## 多用户操作（重点）

`am` 负责多用户的「运行」，与 `pm`（负责多用户的「创建与安装」）配合使用：

```shell
# 启用用户（加载其后台服务与通知）
am start-user 10

# 停止用户（冻结其全部后台）
am stop-user 10

# 切换到某个用户（类似手机切换账户）
am switch-user 10

# 查看当前前台用户
am get-current-user

# 查看指定用户状态（RUNNING / STOPPED 等）
am get-user-state 10

# 查询包对应的 UID
am get-uid 包名

# 用指定用户身份启动应用（多开 / 分身的本质）
am start --user 10 -n 包名/.MainActivity

# 强制停止某用户下的应用
am force-stop --user 10 包名
```

> 搭配流程：先用 `pm create-user --user-type ...` 创建分身用户 → 用 `pm install --user 10` 装应用 → 再用 `am start-user 10` 启用并 `am start --user 10` 启动。

## 调试与任务栈

```shell
# 查看当前焦点 Activity
am task list

# 查看 Activity 栈
am stack list

# 移动任务到指定栈（分屏 / 多窗口）
am stack move-task 任务ID 栈ID

# 记录 Activity 启动 TRACE
am profile start 包名
am profile stop 包名

# 监控启动时间
am start --start-profiler /sdcard/trace.perf -n 包名/.MainActivity
```

## 系统配置与杂项

```shell
# 查看当前系统配置
am get-config

# 指定应用的待机模式（standby bucket）
am set-standby-bucket 包名 active
am clear-standby-bucket 包名

# 设置应用不活跃（配合 Doze）
am set-inactive 包名 true

# 附加调试 agent（Android 11+）
am attach-agent 包名 agent.jar
```

## 实战：一键冷启动应用并等待

```shell
# 脚本示例：冷启动微信
adb shell am force-stop com.tencent.mm
sleep 1
adb shell am start -n com.tencent.mm/.ui.LauncherUI
```

## 版本变更历史

| Android 版本 | API | am 新增能力 |
|-------------|-----|-------------|
| 1.0 | 1 | `am` 诞生：start / startservice / broadcast / force-stop |
| 4.0 | 14 | `am kill`、`am get-uid`、`am --user` |
| 4.2 | 17 | **多用户**：`am start-user` / `stop-user` / `switch-user` / `get-current-user` |
| 5.0 | 21 | `am task list`、`am stack list`、`am get-config` |
| 6.0 | 23 | `am monitor`、`am profile` 增强 |
| 7.0 | 24 | `am send-trim-memory`、`am set-inactive` |
| 8.0 | 26 | **后台服务限制**：推荐 `am start-foreground-service`（`start-service` 开始受限） |
| 9.0 | 28 | `am get-user-state`；start-service 显式报错警告 |
| 10 | 29 | `am start-foreground-service` 取代 start-service；`--user` 全面支持 |
| 11 | 30 | `am attach-agent`；`am kill-all` |
| 12 | 31 | `am stack` 多窗口完善；前台服务超时管理 |
| 13 | 33 | `start-service` 从后台调用被彻底限制；`am set-standby-bucket` |
| 14 | 34 | 前台服务类型强制声明；`am` 对 FGS 规则增强 |
| 15 | 35 | 前台服务超时/限制细化；多用户运行管理完善 |

## 注意事项

- `am start` 的组件类名必须以 `包名.` 开头，完整路径可用 `dumpsys package` 查看。
- 部分命令（`--user` 指定非当前用户、`am profile`）需要 Root 权限。
- Android 8.0 起后台 Service 受限，能用 `start-foreground-service` 就别用 `start-service`。
- `am start-service` 在 Android 13+ 基本废弃，系统会直接拒绝后台场景调用。

`am` 是四大组件的「遥控器」，配合 `pm` 和 `appops`，你能在 Shell 里完成大部分系统级操作。