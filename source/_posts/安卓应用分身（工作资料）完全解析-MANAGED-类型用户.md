---
title: "安卓应用分身（工作资料）完全解析：MANAGED 类型用户"
date: 2026-08-13 16:00:00
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

「应用分身」在 Android 系统层本质是一个 **工作资料（Work Profile）**，对应的用户类型是 `android.os.usertype.profile.MANAGED`，由系统级应用通过 `pm` 命令或 `UserManager` 接口创建。本文从身份类型、创建、安装、卸载、启用/停止到 Root 解除限制，完整讲透。

## 用户类型的完整定义

Android 11 起，多用户被细分为多种「用户类型」，其中与分身相关的核心类型定义在 `frameworks/base/core/java/android/os/UserManager.java`：

```java
// 工作资料 / 应用分身（由 DPC 企业或系统 App 管理）
public static final String USER_TYPE_PROFILE_MANAGED = "android.os.usertype.profile.MANAGED";

// 克隆分身（运行同一 App 的第二个实例）
public static final String USER_TYPE_PROFILE_CLONE = "android.os.usertype.profile.CLONE";

// 私有资料（隔离空间，可单独上锁）
public static final String USER_TYPE_PROFILE_PRIVATE = "android.os.usertype.profile.PRIVATE";

// 全量用户类型
android.os.usertype.full.SYSTEM      // 系统用户（主人）
android.os.usertype.full.SECONDARY   // 普通次级用户
android.os.usertype.full.GUEST       // 访客
android.os.usertype.full.RESTRICTED  // 受限用户
```

### 分身（MANAGED）与其它类型的区别

| 类型 | 用户类型字符串 | 创建者 | 用途 |
|------|--------------|--------|------|
| 应用分身 | `profile.MANAGED` | DPC / 系统 App | 双开、工作资料、隔离应用 |
| 克隆分身 | `profile.CLONE` | 系统 App（Root） | 跑同 App 第二个实例 |
| 次级用户 | `full.SECONDARY` | 设置/用户管理 | 独立桌面、独立账户 |
| 访客 | `full.GUEST` | 系统 | 临时共享设备 |

## 用 pm 命令创建应用分身

标准的多用户命令都能创建用户，但**指定 `--user-type` 才能创建 MANAGED 类型的分身**：

```shell
# 创建名为「分身」的 MANAGED 类型用户（应用分身 / 工作资料）
adb shell pm create-user --user-type android.os.usertype.profile.MANAGED 分身

# 老版本写法（Android 9 及以下，默认就是 managed profile）
adb shell pm create-user --profileOf 0 --managed 分身

# 查看创建结果
adb shell pm list users
```

创建成功后输出用户 ID（通常是 10），后续安装、启停都靠它。

## 安装与卸载应用

分身用户里安装应用，指定 `--user <ID>`：

```shell
# 只给分身用户安装（主用户不受影响）
adb shell pm install-existing --user 10 包名

# 从本地 APK 安装到分身
adb shell pm install --user 10 /sdcard/app.apk

# 给分身用户卸载
adb shell pm uninstall --user 10 包名

# 查看分身用户已安装的应用
adb shell pm list packages --user 10

# 查看分身用户里某个应用的详细状态
adb shell pm dump 包名 --user 10
```

## 启用、停止与切换

```shell
# 启用分身用户（start，让后台服务可用）
adb shell am start-user 10

# 停止分身用户（stop，冻结后台与通知）
adb shell am stop-user 10

# 强制停止某个应用（只影响指定用户）
adb shell am force-stop --user 10 包名

# 用分身身份启动应用（多开的本质）
adb shell am start --user 10 -n 包名/.MainActivity

# 查看当前前台用户
adb shell am get-current-user

# 删除分身用户（连带删除其全部数据）
adb shell pm remove-user 10
```

## Root：解除分身数量上限

MANAGED 类型每个主用户默认**最多 1 个**（`max-allowed-per-parent`）。设备所有者或 Root 后可通过系统属性放宽：

```shell
# 解除「全量用户」上限（经典多用户）
su -c "setprop fw.max_users 8"

# 解除工作资料/分身 profile 数量上限
su -c "setprop persist.sys.max_profiles 8"

# 显示多用户入口
su -c "setprop fw.show_multiuserui 1"

# 验证
adb shell pm get-max-users
```

> 说明：`persist.sys.max_profiles` 是不少 ROM 用于放宽 profile 数量的属性；AOSP 里真正限制在 `UserTypeDetails.maxAllowedPerParent`，对应资源 `config_user_types.xml`。Root 后也可直接修改该配置并重启，或 `settings put secure` 相关项。

## 用 AIDL 接口创建分身

应用分身由系统 `IUserManager` 服务创建，核心 AIDL 方法是 `createProfileForUserWithThrow`：

```java
// frameworks/base/core/java/android/os/IUserManager.aidl
UserInfo createProfileForUserWithThrow(
    in String name,
    in String userType,
    int flags,
    int userId,
    in String[] disallowedPackages);
```

调用示例（系统签名 App / Root）：

```java
UserInfo info = userManager.createProfileForUser(
    "分身",
    UserManager.USER_TYPE_PROFILE_MANAGED,
    0,
    UserHandle.USER_SYSTEM);
int uid = info.id;
```

创建后标记「已完成设置」，分身应用才会出现在**最近任务**里：

```java
String cmdstr = String.format(
    "settings --user %d put secure user_setup_complete 1;"
  + "settings --user %d put global device_provisioned 1",
    uid, uid);
Runtime.getRuntime().exec(new String[]{"sh", "-c", cmdstr});
```

## 分身的文件与数据隔离

分身用户拥有独立的存储空间：

```shell
# 主用户（系统用户）的数据
/data/user/0/包名/

# 分身用户（MANAGED，用户 10）的数据
/data/user/10/包名/
```

工作资料与主资料**严格隔离**，主用户里的照片、视频、文件，分身应用**无法直接读取**，只能通过「分享 / 跨资料 Intent」传递：

```java
// 主用户分享文件到分身
Intent share = new Intent(Intent.ACTION_SEND);
share.putExtra(Intent.EXTRA_STREAM, FileProvider.getUriForFile(context, "authority", file));
share.setType("image/*");
share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
startActivity(share);
```

## 注意事项

- MANAGED 分身默认受 DPC 管理，部分限制（如禁用相机）由策略控制。
- 删除分身会清空其全部数据，操作前务必备份。
- 系统应用通常不允许在分身中运行。

理解了 MANAGED 类型与 pm/am 命令，你就掌握了「应用分身」的全部底层原理。下一篇我们讲 CLONE 类型的「克隆分身」，两者的文件访问权限有本质区别。