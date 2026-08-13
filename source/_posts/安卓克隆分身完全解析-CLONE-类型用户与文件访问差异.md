---
title: "安卓克隆分身完全解析：CLONE 类型用户与文件访问差异"
date: 2026-08-13 16:20:00
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

上一篇文章讲了基于 MANAGED 的「应用分身」（工作资料）。而「克隆分身」对应的是 Android 12 引入的 `android.os.usertype.profile.CLONE` 用户类型，它同样通过 `pm` 命令创建，但与工作资料在**文件访问权限**上有本质区别：克隆用户可以**直接读取主用户的照片、视频、文件**，而工作资料只能通过分享功能跨资料传递。

## CLONE 与 MANAGED 的本质区别

两个类型都定义在 `UserManager.java`：

```java
// 克隆分身：运行同一 App 的第二个实例（如双开微信、QQ）
public static final String USER_TYPE_PROFILE_CLONE = "android.os.usertype.profile.CLONE";

// 工作资料 / 应用分身：由企业 DPC 或系统管理，严格隔离
public static final String USER_TYPE_PROFILE_MANAGED = "android.os.usertype.profile.MANAGED";
```

| 特性 | 克隆分身 (CLONE) | 工作资料 (MANAGED) |
|------|-----------------|-------------------|
| 用户类型字符串 | `android.os.usertype.profile.CLONE` | `android.os.usertype.profile.MANAGED` |
| 创建命令 | `pm create-user --user-type ...CLONE` | `pm create-user --user-type ...MANAGED` |
| 设计目的 | 跑同一 App 第二个实例 | 企业隔离工作空间 |
| 读取主用户文件 | **可以（直接读照片/视频/文件）** | 不行（需分享功能） |
| 数据隔离 | 宽松（共享媒体库） | 严格（独立存储） |
| 系统可见性 | 仅主用户可拥有 | 每个主用户可有多个 |

## 用 pm 命令创建克隆分身

```shell
# 创建 CLONE 类型的克隆分身
adb shell pm create-user --user-type android.os.usertype.profile.CLONE 小号

# 查看创建结果（通常是用户 10，或下一个可用 ID）
adb shell pm list users
```

> 注意：CLONE 类型**只能依附于主用户（User 0）**，无法作为次级用户的克隆。

## 安装、卸载、启用、停止

```shell
# 给克隆分身安装应用
adb shell pm install-existing --user 10 包名

# 从本地 APK 安装
adb shell pm install --user 10 /sdcard/app.apk

# 卸载克隆分身里的应用
adb shell pm uninstall --user 10 包名

# 列出克隆分身的应用
adb shell pm list packages --user 10

# 启用克隆分身（加载后台服务与通知）
adb shell am start-user 10

# 停止克隆分身
adb shell am stop-user 10

# 强制停止克隆里的某个应用
adb shell am force-stop --user 10 包名

# 用克隆身份启动应用
adb shell am start --user 10 -n 包名/.MainActivity

# 删除克隆分身
adb shell pm remove-user 10
```

## 让克隆应用出现在最近任务里

克隆用户创建后，系统认为它「未完成初始化」，应用不会进最近任务。用 `settings` 命令标记完成后即可：

```shell
# 手动执行（uid 替换为克隆用户 ID）
adb shell settings --user 10 put secure user_setup_complete 1
adb shell settings --user 10 put global device_provisioned 1
```

Java 中通过 `sh -c` 拼接执行：

```java
int uid = cloneUserInfo.id;
String cmdstr = String.format(
    "settings --user %d put secure user_setup_complete 1;"
  + "settings --user %d put global device_provisioned 1",
    uid, uid);
Runtime.getRuntime().exec(new String[]{"sh", "-c", cmdstr});
```

执行后再用 `am start --user <uid> ...` 启动，克隆应用就会正常显示在最近任务与启动器里。

## Root：解除克隆分身数量上限

CLONE 类型同样受 `max-allowed-per-parent` 限制。Root 后放宽：

```shell
su -c "setprop persist.sys.max_profiles 8"
su -c "setprop fw.max_users 8"
su -c "setprop fw.show_multiuserui 1"

# 验证
adb shell pm get-max-users
```

AOSP 真正的上限在 `UserTypeFactory` / `UserTypeDetails.maxAllowedPerParent`（`config_user_types.xml` 中可配置，MANAGED 默认 1、CLONE 默认 1）。需要更多分身时也可修改该配置后重启生效。

## 文件访问权限差异（关键）

这是克隆分身与工作资料最核心的差别：

### 克隆分身：可直接读取主用户文件

CLONE 类型的用户与主用户**共享媒体存储**，克隆应用可以直接读取主用户相册里的照片、视频以及 `/sdcard/` 下的文件：

```java
// 克隆分身里直接读取主用户相册（无需跨资料分享）
Cursor c = contentResolver.query(
    MediaStore.Images.Media.EXTERNAL_CONTENT_URI, null, null, null, null);
```

这就是为什么「克隆微信」能直接发主用户相册里的图片——数据是共享的。

### 工作资料：只能通过分享功能

MANAGED 类型使用**独立存储空间**，主用户的照片、视频、文件对工作资料内的应用不可见。跨资料只能通过「分享 / Intent」显式传递：

```java
// 工作资料中无法直接读主用户相册，需通过跨资料分享 Intent
Intent send = new Intent(Intent.ACTION_SEND);
send.putExtra(Intent.EXTRA_STREAM, contentUri);
send.setType("image/*");
startActivity(Intent.createChooser(send, "分享到工作空间"));
```

```shell
# 文件层面也可以看到存储是分开的
# 主用户（user 0）的数据
/data/user/0/包名/
# 工作资料（user 10）的数据
/data/user/10/包名/
```

## 实战：一套完整的克隆分身流程

```shell
# 1. 创建克隆分身
adb shell pm create-user --user-type android.os.usertype.profile.CLONE 小号

# 2. 记下返回的 uid（假设 10），标记初始化完成
adb shell settings --user 10 put secure user_setup_complete 1
adb shell settings --user 10 put global device_provisioned 1

# 3. 克隆并安装应用
adb shell pm install-existing --user 10 com.example.app

# 4. 启用并启动
adb shell am start-user 10
adb shell am start --user 10 -n com.example.app/.MainActivity

# 5. 停止或删除
adb shell am stop-user 10
adb shell pm remove-user 10
```

## 总结

- **克隆分身（CLONE）**：与主用户共享媒体文件，能直接读取主用户的照片、视频、文件；适合双开聊天工具。
- **应用分身 / 工作资料（MANAGED）**：严格隔离，无法直接访问主用户文件，只能通过分享功能；适合企业隔离或私密空间。

两者都通过 `pm create-user --user-type` 创建，都可用 `pm`/`am` 管理安装、卸载、启用、停止，Root 后都能用 `setprop fw.max_users`、`persist.sys.max_profiles` 解除数量上限，也都能用 AIDL 的 `createProfileForUserWithThrow` 编程创建。