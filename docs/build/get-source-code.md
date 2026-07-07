---
sidebar_position: 1
id: get-source-code
title: "获取源代码"
sidebar_label: "获取源代码"
---

注：该文档中均使用 `$MD_PATH` 来指代 SupraMD 源码目录。

## 1. 获取源码
你可以使用以下任意一种方式获取代码：git clone、下载源码包。
如果你已经拥有源代码，可以忽略此步骤，直接跳到[安装依赖](#2-安装依赖)小节。

### 1.1 git clone
如果你的系统中安装了git工具，可以使用git来clone源代码。
这样的好处是，你可以随时切换使用其他任意版本的代码。
```bash
git clone https://git.hpcer.dev/HPCer/MISA-MD/MISA-MD.git supramd # https
# or clone from github
git clone https://github.com/supramd-dev/supramd.git
```

或者，如果你配置了ssh key, 也可以使用ssh协议进行clone:
```bash
git clone ssh://git@git.hpcer.dev:2222/HPCer/MISA-MD/MISA-MD.git supramd # ssh
# or clone from github
git clone git@github.com:supramd-dev/supramd.git supramd
```

上述 git clone 命令会创建一个名为 supramd 的目录。
克隆完成后，你可以选择通过调用以下命令来构建特定分支（如版本分支）
```bash
$ cd $MD_PATH # SupraMD 源码目录
$ git checkout Branch_Or_Tag
# where ' Branch_Or_Tag' is the desired branch or tag.
```
例如，要使用 v0.4.0 版本而不是主分支，可使用以下命令进行切换 `git checkout v0.4.0`.

### 1.2 直接下载源码包
使用wget命令或者在浏览器中下载源代码压缩包。  
如，下载v2026.01.版本的源码包：
```bash
$ wget -O supramd-v2026.01.tat.gz \
  https://github.com/supramd-dev/SupraMD/archive/refs/tags/v2026.01.tar.gz
$ tar -zxvf supramd-v2026.01.tar.gz
```

## 2. 安装依赖

获取的源码中不包含该程序的依赖包，所以还需要额外的工作来安装依赖。

SupraMD 依赖于一些开源库, 如[kiwi](https://git.hpcer.dev/genshen/kiwi),
googletest, fmt, [args](https://github.com/Taywee/args/)等。
可以使用[pkg](https://github.com/genshen/pkg/)依赖管理工具下载依赖包或者直接将对应依赖包导入到 SupraMD源码`vendor`目录。

其中，`pkg`工具的安装见 https://github.com/genshen/pkg/。

以下三种依赖安装方式选择其一即可：

### 2.1 使用pkg安装依赖
使用该方式安装依赖，需要你的系统能够连接到互联网，且有所有依赖仓库的 git 克隆权限。
可以通过设置`PKG_AUTH`环境变量的方式指定获取相关私有仓库的口令，
如`PKG_AUTH=username?token@git.hpcer.dev`指定了获取位于git.hpcer.dev上的私有依赖库的用户名和认证token。

依赖安装：
```bash
cd $MD_PATH
PKG_AUTH=username?token@git.hpcer.dev pkg fetch
pkg install
```

### 2.2 使用pkg导入离线依赖包
如下依赖包的直接安装会因为网络等原因中断，可以考虑下载离线依赖包，然后进行导入。  
假设依赖压缩包文件名为: vendor-20190725-003851.426644.tar, 可以通过以下pkg命令导入依赖包:
```bash
cd $MD_PATH
pkg import --input vendor-20190725-003851.426644.tar
pkg fetch
pkg install
```

用户可以从 OSDN 上的 https://osdn.net/pkg/misa-md/dependencies 页面获取各个 SupraMD 版本的依赖包，然后通过 `pkg import` 导入。  
例如，如果需要下载 MISA—MD 主分支（master 分支）对应的依赖包，可以通过链接 https://osdn.net/dl/misa-md/misamd-latest-20210413-161112.942981.tar 从[OSDN](https://osdn.net/pkg/misa-md/dependencies) 上下载。

### 2.3 直接解压依赖包

直接导入依赖是将已有的依赖压缩包解压解压 SupraMD 的源码的`vendor`目录。

假设依赖压缩包文件名为：vendor-20190725-003851.426644.tar, 可以通过以下命令加入依赖包:
```bash
mkdir -p $MD_PATH/vendor
cd $MD_PATH/vendor
tar xvf path/of/vendor-20200725-003851.426644.tar # tar to direcooty.
```
