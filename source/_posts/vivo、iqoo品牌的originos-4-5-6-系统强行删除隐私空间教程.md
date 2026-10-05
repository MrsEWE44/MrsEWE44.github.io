---
title: "VIVO、IQOO品牌的OriginOS 4/5/6 系统强行删除隐私空间教程"
date: 2026-10-05 15:03:56
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

VIVO、IQOO品牌的OriginOS 4/5/6 系统强行删除隐私空间教程

当你的VIVO、IQOO品牌的OriginOS 4/5/6 系统无法删除隐私空间的时候，也就是没有那个《重置隐私空间》选项的时候，只需要执行下面的脚本代码就行了，需要ADB Shell权限执行。

**移除XSPACE空间脚本代码**

```
#!/system/bin/sh
# Remove XSpace user 666. Compatible with OriginOS 4 / 5 / 6.
# Usage: adb shell sh /data/local/tmp/remove_xspace.sh

XSPACE_UID=666
SECURE_KEY="xspace_user_removable"
ALLOW_SCAN=1
SCAN_MAX=60

ok()  { echo "  [OK] $*"; }
bad() { echo "  [!!] $*"; }

echo "============================================================"
echo "           XSpace User Remover (OriginOS 4/5/6)"
echo "============================================================"

read_key() {
    settings get secure "$1" 2>/dev/null
}

set_key_via_settings() {
    settings put secure "$1" "$2" >/dev/null 2>&1
}

set_key_via_content() {
    content insert --uri content://settings/secure \
        --bind "name:s:$1" --bind "value:i:$2" >/dev/null 2>&1
}

user_exists() {
    pm list users 2>/dev/null | grep -q "UserInfo{$1:"
}

echo ""
echo "== Step 1/3 : enable removable flag =="

if [ "$(read_key "$SECURE_KEY")" = "1" ]; then
    ok "$SECURE_KEY already 1"
else
    set_key_via_settings "$SECURE_KEY" 1
    if [ "$(read_key "$SECURE_KEY")" = "1" ]; then
        ok "set via settings put"
    else
        set_key_via_content "$SECURE_KEY" 1
        if [ "$(read_key "$SECURE_KEY")" = "1" ]; then
            ok "set via content insert"
        else
            bad "could not set $SECURE_KEY"
            exit 1
        fi
    fi
fi

echo ""
echo "== Step 2/3 : remove user $XSPACE_UID =="

if ! user_exists "$XSPACE_UID"; then
    ok "user $XSPACE_UID not present"
    RESTORE_FLAG=0
else
    pm remove-user "$XSPACE_UID" >/dev/null 2>&1

    if user_exists "$XSPACE_UID"; then
        for TXN in 12 13 14; do
            service call user "$TXN" i32 "$XSPACE_UID" >/dev/null 2>&1
            sleep 2
            user_exists "$XSPACE_UID" || break
        done
    fi

    if user_exists "$XSPACE_UID" && [ "$ALLOW_SCAN" = "1" ]; then
        TXN=1
        while [ "$TXN" -le "$SCAN_MAX" ]; do
            service call user "$TXN" i32 "$XSPACE_UID" >/dev/null 2>&1
            sleep 1
            user_exists "$XSPACE_UID" || break
            TXN=$((TXN + 1))
        done
    fi

    if user_exists "$XSPACE_UID"; then
        bad "failed to remove user $XSPACE_UID"
        exit 1
    fi
    ok "user $XSPACE_UID removed"
    RESTORE_FLAG=1
fi

echo ""
echo "== Step 3/3 : restore flag =="

if [ "$RESTORE_FLAG" = "1" ]; then
    set_key_via_settings "$SECURE_KEY" 0
    if [ "$(read_key "$SECURE_KEY")" = "0" ]; then
        ok "$SECURE_KEY restored to 0"
    else
        set_key_via_content "$SECURE_KEY" 0
        [ "$(read_key "$SECURE_KEY")" = "0" ] \
            && ok "$SECURE_KEY restored to 0" \
            || bad "$SECURE_KEY left at $(read_key "$SECURE_KEY")"
    fi
fi

echo ""
echo "============================================================"
echo "                     Final Result"
echo "============================================================"
pm list users 2>/dev/null
echo ""

if user_exists "$XSPACE_UID"; then
    echo "  [FAIL] user $XSPACE_UID still present"
else
    echo "  [SUCCESS] XSpace user $XSPACE_UID is gone"
fi
echo ""
```

执行完上面的脚本后，再输入pm list users命令，就可以看到是否成功删除了，正常情况下是没有了。


enjoy😀
