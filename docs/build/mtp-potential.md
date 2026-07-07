---
sidebar_position: 6
id: mtp-potential
title: MTP 机器学习势函数集成
sidebar_label: MTP 势函数
---

[mlip-3](https://gitlab.com/ashapeev/mlip-3) 是一种基于机器学习方法的势函数，其基于 moment tensor potentials (MTPs) 方法，详细信息可以在[此处](https://mlip.skoltech.ru)或者 [mlip-2 的代码仓库](https://gitlab.com/ashapeev/mlip-3) 获取。

现在，SupraMD 已经支持了 MLIP-3 势函数（注：mlip-3 是 MTP 势的一种实现）。

## mlip-3 与 SupraMD 的集成

### 安装 mlip-3
在开始之前，请先按照 mlip-3 的支持文档，相关的编译器等环境在检查您的系统里面是否都已经被安装了。
除了 SupraMD 所需要的 MPI、CMake、C++/C 编译器外，mlip-2 还需要 Fortran 编译器。

编辑 SupraMD 的 pkg.yaml, 添加 mlip-2 为依赖：
```diff
@@ -16,6 +16,7 @@ dependencies:
     git.hpcer.dev/HPCer/MISA-MD/potential: {version: v0.3.0, target: pot}
     git.hpcer.dev/HPCer/MISA-MD/libcomm: {version: v0.3.4, target: comm}
     github.com/misa-kmc/xoshiro: {version: v0.1.1, target: xoshiro}
+    gitlab.com/ashapeev/mlip-2: {version: 3bddf54769ea53a92226d007630f8b58018716d1, target: mltp2}
     github.com/jbeder/yaml-cpp@yaml-cpp-0.6.2@yaml-cpp:
       features: ["YAML_CPP_BUILD_TESTS=OFF"]
       build:
```
这里，我们选用的 mlip-2 为其在 gitlab 开源的 master 分支（2024/06 查看的情况，git commit id: [3bddf54769ea53a92226d007630f8b58018716d1](https://gitlab.com/ashapeev/mlip-2/-/tree/3bddf54769ea53a92226d007630f8b58018716d1))，

保存 pkg.yaml 文件后，分别执行 `pkg fetch` 和 `pkg install` 命令进行 mlip-2 源代码的下载和编译安装。
:::note
在编译安装阶段，如果遇到编译错误，可以通过添加 verbose 选项：`pkg install --verbose` 来查看具体错误信息。
:::

:::note
我们可能会遇到[这个编译错误](https://gitlab.com/ashapeev/mlip-2/-/issues/44):
```log
ld: CMakeFiles/mlp.dir/dev_src/mlp/dev_self_test.cpp.o:dev_self_test.cpp:(.text+0x4ccf): more undefined references to `vtable for CombinedAnyLocalMLIP' follow
collect2: error: ld returned 1 exit status
```
这是因为 mlip-2的CMake 脚本里面少添加了一个源代码文件。解决方案是，编辑文件：`vendor/src/gitlab.com/ashapeev/mlip-2@3bddf54769ea53a92226d007630f8b58018716d1/dev_src/CMakeLists.txt`，添加如下内容：
```diff
set(SOURCES
  ${CMAKE_CURRENT_SOURCE_DIR}/eam.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/matvec_oper.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/mtpr.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/mtpr_trainer.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/non_linear_regression.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/sw_basis.cpp
+ ${CMAKE_CURRENT_SOURCE_DIR}/combined_any_local_mlip.cpp
      )
```
:::

### 编译支持 mlip-2 势函数的 SupraMD
```bash
cmake -B./build -S ./ -DCMAKE_BUILD_TYPE=Release \
-DMD_FEATURE_POT_MLIP2_ENABLE_FLAG=ON
cmake --build ./build -j 4
```

## 运行基于 mlip-3 的 SupraMD
1. 修改 SupraMD 配置文件 config.yaml：
```diff
potential: # potential file config
    format: "setfl"
-   type: "eam/alloy"
-   file_path: "FeCuNi.eam.alloy"
+   type: "mlip2"
+   file_path: "mlip.ini"
```
其中，file_path 指定 mlip-2 的配置文件，可依据 mlip-2 的配置文件进行设置，参考如下：
```ini
mtp-filename   pot.mtp
select         FALSE  # <bool>        Activates/deactivates selection (active learning)
```
2. 运行
正常运行 SupraMD 即可，无特殊设置
```bash
mpirun -n 4 ../build/bin/supramd -c config.yaml
```
