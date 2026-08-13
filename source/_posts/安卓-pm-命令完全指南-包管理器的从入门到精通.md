---
title: "安卓 pm 命令完全指南：包管理器从入门到精通"
date: 2026-08-13 15:00:00
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

`pm`（Package Manager）是 Android 系统里的「包管理器」，负责应用安装、卸载、查询、权限授予、组件禁用、应用挂起（suspend）、多用户等一切与「包」相关的事。无论你是刷机党、开发调试，还是搞自动化，pm 都是绕不开的核心命令。

## 基本语法

```shell
pm <command> [options]
```

```shell
adb shell pm <command>
# 或
su -c "pm <command>"
```

## 查询类命令

### 列出已安装的应用

```shell
# 全部
pm list packages

# 只看用户应用（排除系统应用）
pm list packages -3

# 只看系统应用
pm list packages -s

# 只看已禁用 / 已启用
pm list packages -d
pm list packages -e

# 包含已卸载但仍留有数据的应用
pm list packages -u

# 显示应用安装路径
pm list packages -f

# 显示应用 UID
pm list packages -U

# 显示应用安装的版本号
pm list packages -v

# 按关键字过滤
pm list packages | grep 关键字
```

### 列出权限与组件

```shell
pm list permissions
pm list features
pm list instrumentation
pm list libraries
pm list abi
```

## 安装命令：pm install

`install` 是核心命令，参数非常丰富。完整格式：

```shell
pm install [-rtfdg] [-i PACKAGE] [--user USER_ID|all|current]
    [-p INHERIT_PACKAGE] [--install-location 0/1/2]
    [--install-reason 0/1/2/3/4] [--originating-uri URI]
    [--referrer URI] [--abi ABI_NAME] [--force-sdk]
    [--preload] [--instant] [--full] [--dont-kill]
    [--force-uuid internal|UUID] [--pkg PACKAGE] [-S BYTES]
    [--apex] [--wait TIMEOUT] [PATH [SPLIT...]|-]
```

### 常用短参数详解

| 参数 | 含义 | 说明 |
|------|------|------|
| `-r` | replace | 覆盖安装（保留数据），重新安装已存在的应用 |
| `-t` | test | 允许安装 test 包（`android:testOnly` 标记的应用） |
| `-d` | downgrade | 允许降级安装（仅对 debuggable 包有效） |
| `-g` | grant | 一次性授予清单里所有运行时权限 |
| `-f` | flash | 强制安装到内部存储 |
| `-i` | installer | 指定安装者包名（记录应用来源） |
| `-p` | partial | 部分安装（在已有包上叠加新 split） |
| `-S` | size | 从 stdin 流式安装时声明包大小（字节） |
| `-R` | no-replace | 禁止替换已有应用（反 -r） |
| `--abi` | ABI | 覆盖平台默认 ABI |
| `--instant` | 瞬时 | 作为 instant app 安装 |
| `--full` | 全量 | 作为非 instant 的完整应用安装 |
| `--dont-kill` | 不杀进程 | 安装新 split 时不终止运行中的应用 |
| `--install-location` | 位置 | `0` 自动 / `1` 仅内部 / `2` 优先外部 |
| `--force-uuid` | 卷 | 强制安装到指定磁盘卷 |
| `--apex` | apex | 安装的是 `.apex`（系统模块包），不是 APK |
| `--user` | 用户 | 安装到指定用户（多用户核心参数） |

### 常用示例

```shell
# 普通安装
pm install /sdcard/app.apk

# 覆盖安装（保留数据）
pm install -r /sdcard/app.apk

# 覆盖安装并自动授予所有运行时权限
pm install -rg /sdcard/app.apk

# 允许测试包安装
pm install -t /sdcard/app.apk

# 允许降级安装（老版本覆盖新版本）
pm install -d /sdcard/app.apk

# 安装到内部存储（-f）
pm install -f /sdcard/app.apk

# 指定安装来源（模拟从市场安装）
pm install -i com.android.vending /sdcard/app.apk

# 从 stdin 流式安装（配合大小声明）
cat app.apk | pm install -S 123456 -

# 安装 APEX 系统模块（需 Root）
pm install --apex /sdcard/xxx.apex
```

> 提示：Android 8.0+ 推荐用分段安装 `install-create` / `install-write` / `install-commit` 处理大型拆分 APK。

### 多用户安装

```shell
# 安装到指定用户（应用分身 / 多用户核心）
pm install --user 10 /sdcard/app.apk

# 安装到所有用户
pm install --user all /sdcard/app.apk

# 给新用户安装已存在的应用（无需 APK 文件）
pm install-existing --user 10 包名
```

## 卸载命令：pm uninstall

```shell
# 卸载（保留用户数据）
pm uninstall --keep-data 包名

# 完整卸载
pm uninstall 包名

# 只卸载某个用户下的应用
pm uninstall --user 10 包名

# 卸载系统应用并保留数据（需 Root）
pm uninstall -k 包名
```

## 禁用 / 启用与挂起

### disable / enable（禁用组件）

```shell
# 禁用整个应用
pm disable-user 包名

# 重新启用
pm enable 包名

# 禁用某个组件（Activity / Service / Receiver / Provider）
pm disable 包名/类名

# 查看应用是否被禁用
pm list packages -d | grep 包名
```

### hide / unhide（隐藏应用）

`hide` 会把应用从**桌面图标与启动器里隐藏**（不卸载、不禁用），常用语隐藏系统应用或不想让别人看到的应用：

```shell
# 隐藏应用（从桌面消失，但仍已安装可用）
pm hide 包名

# 解除隐藏
pm unhide 包名

# 查看已隐藏的应用（注意与 disable 的 -d 不同）
pm list packages -h
```

> `hide` 只影响「可见性」，应用仍能正常运行、收通知；它与 `disable`（冻结）、`suspend`（挂起）是三种不同维度的控制，可以叠加使用。

### suspend / unsuspend（挂起应用）

`suspend` 是比 disable 更「温柔」的冻结方式（Android 9 / API 28 起 `pm` 直接支持，底层来自 `PackageManager.setPackagesSuspended`，API 24 引入）。挂起后应用：

- 无法启动 Activity
- 通知被隐藏
- 不出现在最近任务
- 不能弹 Toast / 对话框 / 响铃
- 图标在桌面变灰，点击提示「已被挂起」

```shell
# 挂起应用（冻结但不卸载）
pm suspend 包名

# 解除挂起
pm unsuspend 包名

# 同时挂起多个应用
pm suspend 包名1 包名2 包名3
```

> 部分 ROM 上 `pm` 没有直接暴露 `suspend`，可用 `cmd package suspend 包名` / `cmd package unsuspend 包名`（同义命令，Android 9 起可用）。

### suspend 与 disable 的区别

| 特性 | suspend | disable |
|------|---------|---------|
| 图标 | 置灰可见 | 从桌面消失 |
| 数据 | 保留 | 保留 |
| 可感知 | 应用有挂起回调 | 应用无感知 |
| 撤销 | `unsuspend` | `enable` |
| 适合场景 | 冻结应用、数字健康 | 精简系统、停用组件 |

## 权限管理

```shell
# 给应用授予权限
pm grant 包名 android.permission.READ_CONTACTS

# 撤销权限
pm revoke 包名 android.permission.READ_CONTACTS

# 重置所有权限
pm reset-permissions

# 设置权限标志（0 允许 / 1 拒绝 / 2 询问）
pm set-permission-flags 包名 android.permission.CAMERA 0
```

## 多用户操作（重点）

Android 4.2（API 17）起支持多用户。pm 是操作多用户 / 应用分身的第一入口：

```shell
# 列出所有用户（ID、名称、状态）
pm list users

# 创建普通用户
pm create-user 访客

# 创建指定类型的用户（Android 11 / API 30 起）
# 应用分身（工作资料）：
pm create-user --user-type android.os.usertype.profile.MANAGED 分身
# 克隆分身：
pm create-user --user-type android.os.usertype.profile.CLONE 小号

# 删除用户（连带其全部数据）
pm remove-user 10

# 查看设备最大支持用户数
pm get-max-users

# 查看某用户在哪些用户下可用
pm list packages --user 10

# 给某个用户设置 / 查看默认主页
pm set-home-activity --user 10 包名/Activity
```

> 多用户命令配合 `am`（如 `am start --user 10 ...`、`am start-user 10`）才能真正跑起来，详见 am 一文。

## 其他常用命令

```shell
# 清空应用数据与缓存
pm clear 包名

# 获取应用安装路径
pm path 包名

# 获取应用详情（uid、版本、权限、组件状态）
pm dump 包名

# 解析 Intent 会打开哪个 Activity
pm resolve-activity -a android.intent.action.VIEW -d https://www.example.com

# 查询能处理 Intent 的组件
pm query-activities -a android.intent.action.MAIN -c android.intent.category.HOME

# 查询能处理 Intent 的 Service / Receiver
pm query-services -a 自定义.Action
pm query-receivers -a 自定义.Action

# 获取应用 UID
pm get-uid 包名

# 查看应用当前状态
pm dump 包名 | grep -E "User 0|stopped|enabled"
```

## 安装位置与存储管理

```shell
# 设置全局安装位置（0 自动 / 1 仅内部 / 2 优先 SD 卡）
pm set-install-location 0

# 查看当前安装位置
pm get-install-location

# 清理包缓存
pm trim-caches 500M

# 强制应用安装到指定磁盘卷
pm install --force-uuid internal /sdcard/app.apk
```

## 系统配置命令

```shell
# 设置默认浏览器
pm set-default-browser 包名/Activity

# 设置 / 查看应用链接默认行为
pm set-app-link 包名 always
pm get-app-link 包名

# 设置待机模式桶（active / working_set / frequent / rare / restricted）
pm set-app-standby-bucket 包名 active
pm get-app-standby-bucket 包名

# 标记应用为调试应用（等待调试器）
pm set-debug-app 包名
pm clear-debug-app

# 设置用户限制（禁止该用户安装应用等）
pm set-user-restriction 10 no_install_apps true
pm get-user-restrictions 10
```

> `set-user-restriction` 与「应用分身」强相关：`no_install_apps`、`no_sms`、`no_outgoing_calls` 等限制可直接作用于分身用户。

## 结合 dumpsys 定位问题

```shell
# 查看包在系统里的所有信息
pm dump 包名

# 查看某应用是否被标记为 stop / disabled
pm list packages -d | grep 包名
```

## 实战：一键冻结全家桶

```shell
# 批量挂起系统自带应用（不删除，随时可恢复）
for pkg in com.miui.video com.miui.player com.xiaomi.gamecenter; do
  pm suspend "$pkg" && echo "$pkg 已挂起"
done
```

## pm 全部命令速查表

| 命令 | 用途 |
|------|------|
| `pm help` | 打印所有命令帮助 |
| `pm list packages` | 列出包（-3/-s/-d/-e/-u/-f/-U/-i/-a 过滤） |
| `pm list permission-groups` | 列出权限组 |
| `pm list permissions` | 列出权限 |
| `pm list instrumentation` | 列出测试包 |
| `pm list features` | 列出系统特性 |
| `pm list libraries` | 列出系统库 |
| `pm list users` | 列出所有用户 |
| `pm path 包名` | 显示 APK 路径 |
| `pm dump 包名` | 显示包详情 |
| `pm install` | 安装（-r/-t/-d/-g/-f/-i/-p/-S/--user/--abi...） |
| `pm install-existing` | 给新用户安装已有应用 |
| `pm install-create/-write/-commit` | 分段安装会话 |
| `pm uninstall` | 卸载（--keep-data/-k/--user） |
| `pm clear 包名` | 清空应用数据 |
| `pm enable 包名` | 启用应用/组件 |
| `pm disable 包名` | 禁用应用/组件 |
| `pm disable-user 包名` | 仅对当前用户禁用 |
| `pm disable-until-used 包名` | 禁用直到被使用 |
| `pm hide 包名` | 隐藏应用（桌面不显示） |
| `pm unhide 包名` | 解除隐藏 |
| `pm suspend 包名` | 挂起应用（冻结） |
| `pm unsuspend 包名` | 解除挂起 |
| `pm grant 包名 权限` | 授予权限 |
| `pm revoke 包名 权限` | 撤销权限 |
| `pm reset-permissions` | 重置所有权限 |
| `pm set-permission-flags` | 设置权限标志 |
| `pm create-user` | 创建用户/分身（--user-type） |
| `pm remove-user` | 删除用户/分身 |
| `pm get-max-users` | 查看最大用户数 |
| `pm set-user-restriction` | 设置用户限制 |
| `pm get-user-restrictions` | 查看用户限制 |
| `pm set-home-activity` | 设置默认桌面 |
| `pm set-default-browser` | 设置默认浏览器 |
| `pm set-app-link` / `get-app-link` | 应用链接行为 |
| `pm set-app-standby-bucket` | 设置待机模式桶 |
| `pm set-debug-app` / `clear-debug-app` | 调试应用 |
| `pm set-install-location` / `get-install-location` | 安装位置 |
| `pm trim-caches` | 清理缓存 |
| `pm resolve-activity` | 解析 Intent → Activity |
| `pm query-activities` / `query-services` / `query-receivers` | 查询 Intent 可处理组件 |
| `pm get-uid` | 查询包 UID |

## 版本变更历史

| Android 版本 | API | pm 新增能力 |
|-------------|-----|-------------|
| 1.0 | 1 | `pm` 诞生：install / uninstall / list packages |
| 1.5 | 3 | `pm path`、`pm list libraries` |
| 2.0 | 5 | `pm list permissions` |
| 4.0 | 14 | `pm enable/disable`、`pm clear` |
| 4.2 | 17 | **多用户**：`pm list users`、`pm create-user`、`pm remove-user`、`--user` |
| 4.4 | 19 | `pm install --user`、`pm get-max-users` |
| 5.0 | 21 | `list packages -3/-s/-e/-d/-u/-f` 系列过滤 |
| 6.0 | 23 | 运行时权限：`pm grant/revoke`、`pm reset-permissions` |
| 7.0 | 24 | `pm install-existing`；底层挂起 API（setPackagesSuspended） |
| 8.0 | 26 | 分段安装：`install-create/write/commit`；`--dont-kill` |
| 9.0 | 28 | **`pm suspend / unsuspend` 子命令**（同步 `cmd package`）；`--instant` |
| 10 | 29 | 安装会话增强、`--streaming` 流式安装 |
| 11 | 30 | **用户类型**：`--user-type`（MANAGED / CLONE）；`--apex`；`--force-queryable` |
| 12 | 31 | 挂起对话框提示；`pm list packages --users` |
| 13 | 33 | appops 细分权限；`install-existing` 增强 |
| 14 | 34 | `pm install -S` stdin 增强；前台服务规则收紧 |
| 15 | 35 | CLONE / PRIVATE 资料完善；多用户管理增强 |

## 注意事项

- `pm install` 需要 APK 路径有读权限，一般放在 `/sdcard/` 下。
- 部分命令（`-s`、`-k`、`--user` 指定非当前用户、`--apex`）需要 Root 权限。
- 组件名格式为 `包名/完整类名`，可用 `pm dump` 查看所有组件。
- `pm` 底层是 `cmd package` 的透传（`/system/bin/pm` 即 `cmd package "$@"`），两者可互换。

掌握了 `pm`，你就掌握了对 Android 应用的「生杀大权」，配合 `am` 命令可以玩出更多花样。